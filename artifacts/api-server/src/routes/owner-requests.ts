import { Router } from "express";
import { db, ownerRequestsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { logActivity, safeUser, createNotification } from "../lib/auth";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

// Helper to enrich a request with user data
async function enrichRequest(r: typeof ownerRequestsTable.$inferSelect) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, r.userId));
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
    user: user ? safeUser(user) : null,
  };
}

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

  const userIds = [...new Set(requests.map((r) => r.userId))];
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(userIds.map(id => sql`${id}`), sql`, `)}]::int[])`)
    : [];
  const usersMap = new Map(users.map((u) => [u.id, u]));

  const enriched = requests.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
    user: safeUser(usersMap.get(r.userId)!),
  }));

  res.json({ requests: enriched, total: countResult[0]?.count ?? 0, page: pageNum, limit: limitNum });
});

// Get single owner request — admin/super_admin
router.get("/owner-requests/:id", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [request] = await db.select().from(ownerRequestsTable).where(eq(ownerRequestsTable.id, id));
  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  res.json(await enrichRequest(request));
});

// Submit owner request — customer
router.post("/owner-requests", requireAuth, async (req, res): Promise<void> => {
  const currentUser = (req as any).currentUser;
  const {
    requestedRole, businessName, businessDescription,
    businessAddress, city, state, gstNumber,
    ownerName, ownerMobile, ownerEmail,
    businessPhotos, identityProof,
  } = req.body;

  if (!requestedRole || !["hotel_owner", "restaurant_owner", "spa_owner"].includes(requestedRole)) {
    res.status(400).json({ error: "Valid requestedRole is required" });
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
      businessAddress: businessAddress || null,
      city: city || null,
      state: state || null,
      gstNumber: gstNumber || null,
      ownerName: ownerName || null,
      ownerMobile: ownerMobile || null,
      ownerEmail: ownerEmail || null,
      businessPhotos: Array.isArray(businessPhotos) ? businessPhotos : null,
      identityProof: identityProof || null,
      status: "pending",
    })
    .returning();

  await logActivity(req, "owner_request_submitted", `Owner request submitted by ${currentUser.email} for role ${requestedRole}`, currentUser.id, currentUser.role);
  await createNotification(currentUser.id, "Owner Request Submitted", `Your request to become a ${requestedRole.replace(/_/g, " ")} has been submitted and is under review.`, "general");

  res.status(201).json(await enrichRequest(request));
});

// Update owner request while pending — customer (own request only)
router.put("/owner-requests/:id", requireAuth, async (req, res): Promise<void> => {
  const currentUser = (req as any).currentUser;
  const id = parseInt(req.params.id, 10);

  const [request] = await db.select().from(ownerRequestsTable).where(eq(ownerRequestsTable.id, id));
  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  // Only the owner of the request can edit it, and only when pending
  if (request.userId !== currentUser.id) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  if (request.status !== "pending") {
    res.status(400).json({ error: "Only pending requests can be edited" });
    return;
  }

  const {
    businessName, businessDescription, businessAddress, city, state,
    gstNumber, ownerName, ownerMobile, ownerEmail, businessPhotos, identityProof,
  } = req.body;

  const [updated] = await db
    .update(ownerRequestsTable)
    .set({
      businessName: businessName !== undefined ? businessName || null : request.businessName,
      businessDescription: businessDescription !== undefined ? businessDescription || null : request.businessDescription,
      businessAddress: businessAddress !== undefined ? businessAddress || null : request.businessAddress,
      city: city !== undefined ? city || null : request.city,
      state: state !== undefined ? state || null : request.state,
      gstNumber: gstNumber !== undefined ? gstNumber || null : request.gstNumber,
      ownerName: ownerName !== undefined ? ownerName || null : request.ownerName,
      ownerMobile: ownerMobile !== undefined ? ownerMobile || null : request.ownerMobile,
      ownerEmail: ownerEmail !== undefined ? ownerEmail || null : request.ownerEmail,
      businessPhotos: businessPhotos !== undefined ? (Array.isArray(businessPhotos) ? businessPhotos : null) : request.businessPhotos,
      identityProof: identityProof !== undefined ? identityProof || null : request.identityProof,
    })
    .where(eq(ownerRequestsTable.id, id))
    .returning();

  res.json(await enrichRequest(updated));
});

// Cancel owner request while pending — customer
router.delete("/owner-requests/:id", requireAuth, async (req, res): Promise<void> => {
  const currentUser = (req as any).currentUser;
  const id = parseInt(req.params.id, 10);

  const [request] = await db.select().from(ownerRequestsTable).where(eq(ownerRequestsTable.id, id));
  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  if (request.userId !== currentUser.id) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  if (request.status !== "pending") {
    res.status(400).json({ error: "Only pending requests can be cancelled" });
    return;
  }

  await db.delete(ownerRequestsTable).where(eq(ownerRequestsTable.id, id));
  await logActivity(req, "owner_request_submitted", `Owner request cancelled by ${currentUser.email}`, currentUser.id, currentUser.role);

  res.json({ message: "Owner request cancelled successfully" });
});

// Approve owner request — admin/super_admin
router.post("/owner-requests/:id/approve", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
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

  const now = new Date();
  const [updated] = await db
    .update(ownerRequestsTable)
    .set({ status: "approved", reviewedBy: currentUser.id, approvedAt: now })
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
  await createNotification(request.userId, "Owner Request Approved! 🎉", `Congratulations! Your request to become a ${roleName} has been approved. Your role has been upgraded.`, "owner_approved");

  res.json(await enrichRequest(updated));
});

// Reject owner request — admin/super_admin
router.post("/owner-requests/:id/reject", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
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
  await createNotification(request.userId, "Owner Request Update", `Your owner request has been reviewed. Reason: ${reason}`, "owner_rejected");

  res.json(await enrichRequest(updated));
});

// Restore rejected request back to pending — super_admin only
router.post("/owner-requests/:id/restore", requireRole("super_admin"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const currentUser = (req as any).currentUser;

  const [request] = await db.select().from(ownerRequestsTable).where(eq(ownerRequestsTable.id, id));
  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  if (request.status !== "rejected") {
    res.status(400).json({ error: "Only rejected requests can be restored" });
    return;
  }

  const [updated] = await db
    .update(ownerRequestsTable)
    .set({ status: "pending", rejectionReason: null, reviewedBy: null, approvedAt: null })
    .where(eq(ownerRequestsTable.id, id))
    .returning();

  await logActivity(req, "owner_request_submitted", `Rejected owner request #${id} restored to pending by ${currentUser.email}`, currentUser.id, currentUser.role);
  await createNotification(request.userId, "Owner Request Restored", "Your previously rejected owner request has been restored and is now under review again.", "general");

  res.json(await enrichRequest(updated));
});

// Get current user's own owner request
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

  res.json(await enrichRequest(request));
});

export default router;
