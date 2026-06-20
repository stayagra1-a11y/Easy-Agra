import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, ilike, and, or, sql } from "drizzle-orm";
import { logActivity, safeUser, createNotification } from "../lib/auth";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

// List users — admin/super_admin only
router.get("/users", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const { role, status, search, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (role) conditions.push(eq(usersTable.role, role as any));
  if (status) conditions.push(eq(usersTable.status, status as any));
  if (search) {
    conditions.push(
      or(
        ilike(usersTable.fullName, `%${search}%`),
        ilike(usersTable.email, `%${search}%`),
        ilike(usersTable.mobile, `%${search}%`),
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [users, countResult] = await Promise.all([
    db.select().from(usersTable).where(where).limit(limitNum).offset(offset).orderBy(usersTable.createdAt),
    db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(where),
  ]);

  res.json({
    users: users.map(safeUser),
    total: countResult[0]?.count ?? 0,
    page: pageNum,
    limit: limitNum,
  });
});

// Get single user
router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const currentUser = (req as any).currentUser;
  // Non-admins can only view themselves
  if (!["admin", "super_admin"].includes(currentUser.role) && currentUser.id !== id) {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(safeUser(user));
});

// Update user profile (self or admin)
router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const currentUser = (req as any).currentUser;
  if (!["admin", "super_admin"].includes(currentUser.role) && currentUser.id !== id) {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }

  const { fullName, mobile, city, state } = req.body;
  const updates: Record<string, any> = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (mobile !== undefined) updates.mobile = mobile;
  if (city !== undefined) updates.city = city;
  if (state !== undefined) updates.state = state;

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await logActivity(req, "profile_update", `Profile updated for user: ${updated.email}`, updated.id, updated.role);

  if (currentUser.id === id) {
    await createNotification(id, "Profile Updated", "Your profile has been updated successfully.", "account_update");
  }

  res.json(safeUser(updated));
});

// Delete user — super_admin only
router.delete("/users/:id", requireRole("super_admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const currentUser = (req as any).currentUser;

  if (id === currentUser.id) {
    res.status(400).json({ error: "Cannot delete your own account" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (user.role === "super_admin") {
    res.status(403).json({ error: "Cannot delete a super admin" });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, id));
  await logActivity(req, "user_deleted", `User deleted: ${user.email}`, currentUser.id, currentUser.role);

  res.json({ message: "User deleted successfully" });
});

// Update user status — admin/super_admin
router.patch("/users/:id/status", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { status, reason } = req.body;
  const currentUser = (req as any).currentUser;

  if (!["pending", "active", "suspended", "rejected", "banned"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Admin cannot modify super_admin
  if (currentUser.role === "admin" && target.role === "super_admin") {
    res.status(403).json({ error: "Cannot modify super admin" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ status })
    .where(eq(usersTable.id, id))
    .returning();

  await logActivity(req, "user_status_change", `User ${target.email} status changed to ${status}${reason ? `: ${reason}` : ""}`, currentUser.id, currentUser.role);

  if (status === "suspended") {
    await createNotification(id, "Account Suspended", reason || "Your account has been suspended. Contact support for help.", "account_update");
  } else if (status === "active") {
    await createNotification(id, "Account Restored", "Your account has been restored. Welcome back!", "account_update");
  }

  res.json(safeUser(updated));
});

// Update user role — super_admin only
router.patch("/users/:id/role", requireRole("super_admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { role } = req.body;
  const currentUser = (req as any).currentUser;

  const validRoles = ["super_admin", "admin", "hotel_owner", "restaurant_owner", "spa_owner", "customer"];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ role })
    .where(eq(usersTable.id, id))
    .returning();

  await logActivity(req, "role_change", `User ${target.email} role changed from ${target.role} to ${role}`, currentUser.id, currentUser.role);
  await createNotification(id, "Role Updated", `Your role has been updated to ${role.replace(/_/g, " ")}.`, "account_update");

  res.json(safeUser(updated));
});

// Change password
router.post("/users/:id/change-password", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const currentUser = (req as any).currentUser;

  if (currentUser.id !== id) {
    res.status(403).json({ error: "Can only change your own password" });
    return;
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current and new passwords are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (!user.passwordHash) {
    res.status(400).json({ error: "This account uses Google login. Password cannot be changed here." });
    return;
  }
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, id));
  await logActivity(req, "password_change", `Password changed for user: ${user.email}`, user.id, user.role);

  res.json({ message: "Password changed successfully" });
});

// Upload profile photo
router.post("/users/:id/photo", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const currentUser = (req as any).currentUser;

  if (currentUser.id !== id && !["admin", "super_admin"].includes(currentUser.role)) {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }

  const { photoUrl } = req.body;
  if (!photoUrl) {
    res.status(400).json({ error: "Photo URL is required" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ profilePhoto: photoUrl })
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(safeUser(updated));
});

// Delete own account
router.delete("/users/:id/delete-account", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const currentUser = (req as any).currentUser;

  if (currentUser.id !== id) {
    res.status(403).json({ error: "Can only delete your own account" });
    return;
  }

  await logActivity(req, "account_deleted", `User deleted their account: ${currentUser.email}`, currentUser.id, currentUser.role);
  await db.delete(usersTable).where(eq(usersTable.id, id));

  req.session.destroy(() => {});
  res.json({ message: "Account deleted successfully" });
});

export default router;
