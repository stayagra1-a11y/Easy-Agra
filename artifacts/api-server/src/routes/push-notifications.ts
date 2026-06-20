import { Router } from "express";
import webpush from "web-push";
import { db, pushSubscriptionsTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@easyagra.in";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// GET /api/vapid-public-key — public, returns VAPID public key for frontend subscription
router.get("/vapid-public-key", (_req, res): void => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// POST /api/push-subscriptions — save push subscription for current user
router.post("/push-subscriptions", requireAuth, async (req, res): Promise<void> => {
  const currentUser = (req as any).currentUser;
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: "Invalid push subscription object" });
    return;
  }

  await db
    .insert(pushSubscriptionsTable)
    .values({
      userId: currentUser.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: req.headers["user-agent"] ?? null,
    })
    .onConflictDoUpdate({
      target: pushSubscriptionsTable.endpoint,
      set: { p256dh: keys.p256dh, auth: keys.auth, userId: currentUser.id },
    });

  res.json({ message: "Subscription saved" });
});

// DELETE /api/push-subscriptions — remove push subscription
router.delete("/push-subscriptions", requireAuth, async (req, res): Promise<void> => {
  const currentUser = (req as any).currentUser;
  const { endpoint } = req.body;

  if (!endpoint) {
    res.status(400).json({ error: "Endpoint is required" });
    return;
  }

  await db
    .delete(pushSubscriptionsTable)
    .where(and(eq(pushSubscriptionsTable.endpoint, endpoint), eq(pushSubscriptionsTable.userId, currentUser.id)));

  res.json({ message: "Subscription removed" });
});

// Internal helper — send push to specific user IDs
export async function sendPushToUsers(
  userIds: number[],
  payload: { title: string; body: string; url?: string; tag?: string },
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const subscriptions = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(inArray(pushSubscriptionsTable.userId, userIds));

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      ),
    ),
  );

  // Remove expired subscriptions (410 Gone)
  const expiredEndpoints: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const err = result.reason as any;
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        expiredEndpoints.push(subscriptions[i].endpoint);
      }
    }
  });
  if (expiredEndpoints.length) {
    await Promise.all(
      expiredEndpoints.map((ep) =>
        db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, ep)),
      ),
    );
  }
}

// POST /admin/push-notifications/send — admin sends targeted push notifications
router.post("/admin/push-notifications/send", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const { title, body, targetRole, url } = req.body;

  if (!title || !body) {
    res.status(400).json({ error: "Title and body are required" });
    return;
  }

  let userIds: number[];
  if (targetRole && targetRole !== "all") {
    const users = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.role, targetRole as any), eq(usersTable.status, "active")));
    userIds = users.map((u) => u.id);
  } else {
    const users = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.status, "active"));
    userIds = users.map((u) => u.id);
  }

  await sendPushToUsers(userIds, { title, body, url: url ?? "/" });

  res.json({ message: `Push notification sent to ${userIds.length} users` });
});

// POST /admin/push-notifications/emergency — super_admin sends emergency alert
router.post("/admin/push-notifications/emergency", requireRole("super_admin"), async (req, res): Promise<void> => {
  const { title, body } = req.body;
  if (!title || !body) {
    res.status(400).json({ error: "Title and body required" }); return;
  }

  const users = await db.select({ id: usersTable.id }).from(usersTable);
  await sendPushToUsers(users.map(u => u.id), { title, body, url: "/", tag: "emergency" });

  res.json({ message: `Emergency alert sent to ${users.length} users` });
});

export default router;
