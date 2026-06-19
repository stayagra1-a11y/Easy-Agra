import { Router } from "express";
import { db, activityLogsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireRole } from "../middlewares/requireAuth";

const router = Router();

router.get("/activity-logs", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const { userId, actionType, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (userId) conditions.push(eq(activityLogsTable.userId, parseInt(userId, 10)));
  if (actionType) conditions.push(eq(activityLogsTable.actionType, actionType));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [logs, countResult] = await Promise.all([
    db.select().from(activityLogsTable).where(where)
      .orderBy(activityLogsTable.createdAt)
      .limit(limitNum).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(activityLogsTable).where(where),
  ]);

  // Attach basic user info
  const userIds = [...new Set(logs.map((l) => l.userId).filter((id): id is number => id !== null))];
  const users = userIds.length > 0
    ? await db.select({ id: usersTable.id, fullName: usersTable.fullName, email: usersTable.email })
        .from(usersTable)
        .where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(userIds.map(id => sql`${id}`), sql`, `)}]::int[])`)
    : [];
  const usersMap = new Map(users.map((u) => [u.id, u]));

  const enriched = logs.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
    user: log.userId ? (usersMap.get(log.userId) ?? null) : null,
  }));

  res.json({ logs: enriched, total: countResult[0]?.count ?? 0, page: pageNum, limit: limitNum });
});

export default router;
