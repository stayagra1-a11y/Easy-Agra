import { Router } from "express";
import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { createNotification } from "../lib/auth";

const router = Router();

// List notifications for current user
router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const currentUser = (req as any).currentUser;
  const { unreadOnly, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(notificationsTable.userId, currentUser.id)];
  if (unreadOnly === "true") conditions.push(eq(notificationsTable.isRead, false));

  const where = and(...conditions);
  const [notifications, countResult] = await Promise.all([
    db.select().from(notificationsTable).where(where)
      .orderBy(notificationsTable.createdAt)
      .limit(limitNum).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(notificationsTable).where(where),
  ]);

  res.json({
    notifications: notifications.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
    total: countResult[0]?.count ?? 0,
    page: pageNum,
    limit: limitNum,
  });
});

// Mark all as read
router.post("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  const currentUser = (req as any).currentUser;
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, currentUser.id));

  res.json({ message: "All notifications marked as read" });
});

// Get unread count
router.get("/notifications/unread-count", requireAuth, async (req, res): Promise<void> => {
  const currentUser = (req as any).currentUser;
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, currentUser.id), eq(notificationsTable.isRead, false)));

  res.json({ count: result?.count ?? 0 });
});

// Mark single notification as read
router.post("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const currentUser = (req as any).currentUser;

  const [updated] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, currentUser.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

// Send announcement — super_admin only
router.post("/announcements", requireRole("super_admin"), async (req, res): Promise<void> => {
  const { title, message } = req.body;
  if (!title || !message) {
    res.status(400).json({ error: "Title and message are required" });
    return;
  }

  // Get all active users
  const users = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.status, "active"));

  // Create notification for each user
  await Promise.all(
    users.map((u) => createNotification(u.id, title, message, "announcement")),
  );

  res.json({ message: `Announcement sent to ${users.length} users` });
});

export default router;
