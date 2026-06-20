import { Router } from "express";
import { db, hotelsTable, restaurantsTable, spasTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireRole } from "../middlewares/requireAuth";
import { logActivity, createNotification, safeUser } from "../lib/auth";

const router = Router();

router.get(
  "/admin/security/businesses",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const [hotels, restaurants, spas] = await Promise.all([
      db.select({ id: hotelsTable.id, name: hotelsTable.name, status: hotelsTable.status, ownerId: hotelsTable.ownerId }).from(hotelsTable).orderBy(desc(hotelsTable.createdAt)).limit(100),
      db.select({ id: restaurantsTable.id, name: restaurantsTable.name, status: restaurantsTable.status, ownerId: restaurantsTable.ownerId }).from(restaurantsTable).orderBy(desc(restaurantsTable.createdAt)).limit(100),
      db.select({ id: spasTable.id, name: spasTable.name, status: spasTable.status, ownerId: spasTable.ownerId }).from(spasTable).orderBy(desc(spasTable.createdAt)).limit(100),
    ]);
    res.json({ hotels, restaurants, spas });
  },
);

router.patch(
  "/admin/security/hotels/:id/suspend",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const currentUser = (req as any).currentUser;
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    const { reason } = req.body;

    const [hotel] = await db.select().from(hotelsTable).where(eq(hotelsTable.id, id));
    if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }

    const [updated] = await db.update(hotelsTable).set({ status: "suspended" }).where(eq(hotelsTable.id, id)).returning();
    await logActivity(req, "hotel_suspended", `Hotel ${hotel.name} suspended${reason ? `: ${reason}` : ""}`, currentUser.id, currentUser.role);
    if (hotel.ownerId) {
      await createNotification(hotel.ownerId, "Hotel Suspended", reason || `Your hotel "${hotel.name}" has been suspended.`, "general");
    }
    res.json(updated);
  },
);

router.patch(
  "/admin/security/hotels/:id/restore",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const currentUser = (req as any).currentUser;
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);

    const [hotel] = await db.select().from(hotelsTable).where(eq(hotelsTable.id, id));
    if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }

    const [updated] = await db.update(hotelsTable).set({ status: "approved" }).where(eq(hotelsTable.id, id)).returning();
    await logActivity(req, "hotel_restored", `Hotel ${hotel.name} restored`, currentUser.id, currentUser.role);
    if (hotel.ownerId) {
      await createNotification(hotel.ownerId, "Hotel Restored", `Your hotel "${hotel.name}" has been restored.`, "general");
    }
    res.json(updated);
  },
);

router.patch(
  "/admin/security/restaurants/:id/suspend",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const currentUser = (req as any).currentUser;
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    const { reason } = req.body;

    const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, id));
    if (!restaurant) { res.status(404).json({ error: "Restaurant not found" }); return; }

    const [updated] = await db.update(restaurantsTable).set({ status: "suspended" as any }).where(eq(restaurantsTable.id, id)).returning();
    await logActivity(req, "restaurant_suspended", `Restaurant ${restaurant.name} suspended`, currentUser.id, currentUser.role);
    if (restaurant.ownerId) {
      await createNotification(restaurant.ownerId, "Restaurant Suspended", reason || `Your restaurant "${restaurant.name}" has been suspended.`, "general");
    }
    res.json(updated);
  },
);

router.patch(
  "/admin/security/restaurants/:id/restore",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const currentUser = (req as any).currentUser;
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);

    const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, id));
    if (!restaurant) { res.status(404).json({ error: "Restaurant not found" }); return; }

    const [updated] = await db.update(restaurantsTable).set({ status: "active" }).where(eq(restaurantsTable.id, id)).returning();
    await logActivity(req, "restaurant_restored", `Restaurant ${restaurant.name} restored`, currentUser.id, currentUser.role);
    if (restaurant.ownerId) {
      await createNotification(restaurant.ownerId, "Restaurant Restored", `Your restaurant "${restaurant.name}" has been restored.`, "general");
    }
    res.json(updated);
  },
);

router.patch(
  "/admin/security/spas/:id/suspend",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const currentUser = (req as any).currentUser;
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    const { reason } = req.body;

    const [spa] = await db.select().from(spasTable).where(eq(spasTable.id, id));
    if (!spa) { res.status(404).json({ error: "Spa not found" }); return; }

    const [updated] = await db.update(spasTable).set({ status: "suspended" }).where(eq(spasTable.id, id)).returning();
    await logActivity(req, "spa_suspended", `Spa ${spa.name} suspended`, currentUser.id, currentUser.role);
    if (spa.ownerId) {
      await createNotification(spa.ownerId, "Spa Suspended", reason || `Your spa "${spa.name}" has been suspended.`, "general");
    }
    res.json(updated);
  },
);

router.patch(
  "/admin/security/spas/:id/restore",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const currentUser = (req as any).currentUser;
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);

    const [spa] = await db.select().from(spasTable).where(eq(spasTable.id, id));
    if (!spa) { res.status(404).json({ error: "Spa not found" }); return; }

    const [updated] = await db.update(spasTable).set({ status: "approved" }).where(eq(spasTable.id, id)).returning();
    await logActivity(req, "spa_restored", `Spa ${spa.name} restored`, currentUser.id, currentUser.role);
    if (spa.ownerId) {
      await createNotification(spa.ownerId, "Spa Restored", `Your spa "${spa.name}" has been restored.`, "general");
    }
    res.json(updated);
  },
);

export default router;
