import { Router } from "express";
import { db, ownerRequestsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { logActivity, safeUser, createNotification } from "../lib/auth";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

// List owner requests — admin/super_admin
router.get("/owner-requests", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const { status, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = status ? [eq(ownerRequestsTable.status, status as any)] : [];
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [requests, countResult] = await Promise.all([
    db.select().from(ownerRequestsTable).where(where).orderBy(ownerRequestsTable.createdAt).limit(limitNum).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(ownerRequestsTable).where(where),
  ]);

  // Attach user data
  const userIds = [...new Set(requests.map((r) => r.userId))];
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(userIds.map(id => sql`${id}`), sql`, `)}]::int[])`)
    : [];
  const usersMap = new Map(users.map((u) => [u.id, u]));

  const enriched = requests.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    user: safeUser(usersMap.get(r.userId)!),
  }));

  res.json({ requests: enriched, total: countResult[0]?.count ?? 0, page: pageNum, limit: limitNum });
});

// Submit owner request — customer
router.post("/owner-requests", requireAuth, async (req, res): Promise<void> => {
  const currentUser = (req as any).currentUser;
  const { requestedRole, businessName, businessDescription } = req.body;

  if (!requestedRole || !["hotel_owner", "restaurant_owner", "spa_owner"].includes(requestedRole)) {
    res.status(400).json({ error: "Valid requestedRole is required (hotel_owner, restaurant_owner, spa_owner)" });
    return;
  }

  // Check for existing pending request
  const [existing] = await db
    .select()
    .from(ownerRequestsTable)
    .where(and(eq(ownerRequestsTable.userId, currentUser.id), eq(ownerRequestsTable.status, "pending")));

  if (existing) {
    res.status(409).json({ error: "You already have a pending owner request" });
    return;
  }

  const [request] = await db
    .insert(ownerRequestsTable)
    .values({
      userId: currentUser.id,
      requestedRole,
      businessName: businessName || null,
      businessDescription: businessDescription || null,
      status: "pending",
    })
    .returning();

  await logActivity(req, "owner_request_submitted", `Owner request submitted by ${currentUser.email} for role ${requestedRole}`, currentUser.id, currentUser.role);

  res.status(201).json({
    ...request,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    user: safeUser(currentUser),
  });
});

// Approve owner request
router.post("/owner-requests/:id/approve", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const currentUser = (req as any).currentUser;

  const [request] = await db.select().from(ownerRequestsTable).where(eq(ownerRequestsTable.id, id));
  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  if (request.status !== "pending") {
    res.status(400).json({ error: "Request is not pending" });
    return;
  }

  const [updated] = await db
    .update(ownerRequestsTable)
    .set({ status: "approved", reviewedBy: currentUser.id })
    .where(eq(ownerRequestsTable.id, id))
    .returning();

  // Update user role
  const [user] = await db
    .update(usersTable)
    .set({ role: request.requestedRole })
    .where(eq(usersTable.id, request.userId))
    .returning();

  await logActivity(req, "owner_request_approved", `Owner request approved for user ${user.email} to become ${request.requestedRole}`, currentUser.id, currentUser.role);

  const roleName = request.requestedRole.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  await createNotification(request.userId, "Owner Request Approved", `Congratulations! Your request to become a ${roleName} has been approved.`, "owner_approved");

  const [finalUser] = await db.select().from(usersTable).where(eq(usersTable.id, request.userId));
  res.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    user: safeUser(finalUser),
  });
});

// Reject owner request
router.post("/owner-requests/:id/reject", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { reason } = req.body;
  const currentUser = (req as any).currentUser;

  if (!reason) {
    res.status(400).json({ error: "Rejection reason is required" });
    return;
  }

  const [request] = await db.select().from(ownerRequestsTable).where(eq(ownerRequestsTable.id, id));
  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  if (request.status !== "pending") {
    res.status(400).json({ error: "Request is not pending" });
    return;
  }

  const [updated] = await db
    .update(ownerRequestsTable)
    .set({ status: "rejected", rejectionReason: reason, reviewedBy: currentUser.id })
    .where(eq(ownerRequestsTable.id, id))
    .returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, request.userId));
  await logActivity(req, "owner_request_rejected", `Owner request rejected for user ${user?.email}: ${reason}`, currentUser.id, currentUser.role);
  await createNotification(request.userId, "Owner Request Rejected", `Your owner request has been rejected. Reason: ${reason}`, "owner_rejected");

  res.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    user: user ? safeUser(user) : null,
  });
});

// Get current user's owner request
router.get("/owner-requests/my", requireAuth, async (req, res): Promise<void> => {
  const currentUser = (req as any).currentUser;

  const [request] = await db
    .select()
    .from(ownerRequestsTable)
    .where(eq(ownerRequestsTable.userId, currentUser.id))
    .orderBy(ownerRequestsTable.createdAt);

  if (!request) {
    res.status(404).json({ error: "No owner request found" });
    return;
  }

  res.json({
    ...request,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    user: safeUser(currentUser),
  });
});

export default router;
