import { Router } from "express";
import { db, usersTable, ownerRequestsTable, activityLogsTable, hotelsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireRole } from "../middlewares/requireAuth";

const router = Router();

router.get("/dashboard/stats", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const [stats] = await db.select({
    totalUsers: sql<number>`count(*)::int`,
    activeUsers: sql<number>`count(*) filter (where ${usersTable.status} = 'active')::int`,
    pendingUsers: sql<number>`count(*) filter (where ${usersTable.status} = 'pending')::int`,
    suspendedUsers: sql<number>`count(*) filter (where ${usersTable.status} = 'suspended')::int`,
    totalAdmins: sql<number>`count(*) filter (where ${usersTable.role} = 'admin')::int`,
  }).from(usersTable);

  const [requestStats] = await db.select({
    totalOwnerRequests: sql<number>`count(*)::int`,
    pendingOwnerRequests: sql<number>`count(*) filter (where ${ownerRequestsTable.status} = 'pending')::int`,
  }).from(ownerRequestsTable);

  const [hotelStats] = await db.select({
    pendingHotels: sql<number>`count(*) filter (where ${hotelsTable.status} = 'pending')::int`,
  }).from(hotelsTable);

  res.json({
    totalUsers: stats?.totalUsers ?? 0,
    activeUsers: stats?.activeUsers ?? 0,
    pendingUsers: stats?.pendingUsers ?? 0,
    suspendedUsers: stats?.suspendedUsers ?? 0,
    totalAdmins: stats?.totalAdmins ?? 0,
    totalOwnerRequests: requestStats?.totalOwnerRequests ?? 0,
    pendingOwnerRequests: requestStats?.pendingOwnerRequests ?? 0,
    pendingHotels: hotelStats?.pendingHotels ?? 0,
  });
});

router.get("/dashboard/recent-activity", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const logs = await db
    .select()
    .from(activityLogsTable)
    .orderBy(activityLogsTable.createdAt)
    .limit(10);

  const userIds = [...new Set(logs.map((l) => l.userId).filter((id): id is number => id !== null))];
  const users = userIds.length > 0
    ? await db.select({ id: usersTable.id, fullName: usersTable.fullName, email: usersTable.email })
        .from(usersTable)
        .where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(userIds.map(id => sql`${id}`), sql`, `)}]::int[])`)
    : [];
  const usersMap = new Map(users.map((u) => [u.id, u]));

  res.json(logs.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
    user: log.userId ? (usersMap.get(log.userId) ?? null) : null,
  })));
});

router.get("/dashboard/role-breakdown", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const breakdown = await db.select({
    role: usersTable.role,
    count: sql<number>`count(*)::int`,
  }).from(usersTable).groupBy(usersTable.role);

  res.json(breakdown);
});

export default router;
