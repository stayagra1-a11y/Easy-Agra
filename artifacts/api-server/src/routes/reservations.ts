import { Router } from "express";
import {
  db,
  restaurantReservationsTable,
  restaurantsTable,
  restaurantTablesTable,
  usersTable,
} from "@workspace/db";
import {
  eq,
  and,
  ilike,
  sql,
  desc,
  inArray,
  or,
} from "drizzle-orm";
import { logActivity, createNotification } from "../lib/auth";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

type ReservationRow = typeof restaurantReservationsTable.$inferSelect;

function genRef(id: number): string {
  return `EAR-${String(id).padStart(6, "0")}`;
}

function serializeReservation(r: ReservationRow & Record<string, any>) {
  return {
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
    confirmedAt: r.confirmedAt instanceof Date ? r.confirmedAt.toISOString() : (r.confirmedAt ?? null),
    completedAt: r.completedAt instanceof Date ? r.completedAt.toISOString() : (r.completedAt ?? null),
    cancelledAt: r.cancelledAt instanceof Date ? r.cancelledAt.toISOString() : (r.cancelledAt ?? null),
  };
}

async function findReservation(id: number) {
  const [r] = await db
    .select()
    .from(restaurantReservationsTable)
    .where(eq(restaurantReservationsTable.id, id));
  return r;
}

async function notifyAdmins(title: string, message: string): Promise<void> {
  const admins = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(inArray(usersTable.role, ["admin", "super_admin"]), eq(usersTable.status, "active")));
  await Promise.all(admins.map((a) => createNotification(a.id, title, message, "general")));
}

// ── GET /reservations/my  (BEFORE /reservations/:id) ─────────────────
router.get(
  "/reservations/my",
  requireRole("customer"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;

    const rows = await db
      .select({
        reservation: restaurantReservationsTable,
        restaurantName: restaurantsTable.name,
        restaurantCity: restaurantsTable.city,
        restaurantCoverPhoto: restaurantsTable.coverPhoto,
        tableNumber: restaurantTablesTable.tableNumber,
      })
      .from(restaurantReservationsTable)
      .innerJoin(restaurantsTable, eq(restaurantReservationsTable.restaurantId, restaurantsTable.id))
      .leftJoin(restaurantTablesTable, eq(restaurantReservationsTable.tableId, restaurantTablesTable.id))
      .where(eq(restaurantReservationsTable.customerId, cu.id))
      .orderBy(desc(restaurantReservationsTable.createdAt));

    res.json(
      rows.map((row) => ({
        ...serializeReservation(row.reservation),
        restaurantName: row.restaurantName,
        restaurantCity: row.restaurantCity,
        restaurantCoverPhoto: row.restaurantCoverPhoto,
        tableNumber: row.tableNumber ?? null,
      })),
    );
  },
);

// ── GET /reservations  (owner/admin paginated list) ─────────────────
router.get(
  "/reservations",
  requireRole("restaurant_owner", "admin", "super_admin"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const { restaurantId, status, date, page = "1", limit = "20" } = req.query as any;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, parseInt(limit, 10));
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [];
    if (status) conditions.push(eq(restaurantReservationsTable.status, status));
    if (date) conditions.push(eq(restaurantReservationsTable.reservationDate, date));
    if (restaurantId) conditions.push(eq(restaurantReservationsTable.restaurantId, parseInt(restaurantId, 10)));

    // Owner can only see their own restaurants' reservations
    if (cu.role === "restaurant_owner") {
      const myRestaurants = await db
        .select({ id: restaurantsTable.id })
        .from(restaurantsTable)
        .where(eq(restaurantsTable.ownerId, cu.id));
      const ids = myRestaurants.map((r) => r.id);
      if (ids.length === 0) { res.json({ reservations: [], total: 0, page: pageNum, limit: limitNum }); return; }
      conditions.push(inArray(restaurantReservationsTable.restaurantId, ids));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(restaurantReservationsTable)
      .where(whereClause);

    const rows = await db
      .select({
        reservation: restaurantReservationsTable,
        restaurantName: restaurantsTable.name,
        restaurantCity: restaurantsTable.city,
        tableNumber: restaurantTablesTable.tableNumber,
      })
      .from(restaurantReservationsTable)
      .innerJoin(restaurantsTable, eq(restaurantReservationsTable.restaurantId, restaurantsTable.id))
      .leftJoin(restaurantTablesTable, eq(restaurantReservationsTable.tableId, restaurantTablesTable.id))
      .where(whereClause)
      .orderBy(desc(restaurantReservationsTable.createdAt))
      .limit(limitNum)
      .offset(offset);

    res.json({
      reservations: rows.map((row) => ({
        ...serializeReservation(row.reservation),
        restaurantName: row.restaurantName,
        restaurantCity: row.restaurantCity,
        tableNumber: row.tableNumber ?? null,
      })),
      total: countRow?.total ?? 0,
      page: pageNum,
      limit: limitNum,
    });
  },
);

// ── POST /reservations  (customer creates reservation) ───────────────
router.post(
  "/reservations",
  requireRole("customer"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const {
      restaurantId, tableId,
      customerName, customerMobile, customerEmail,
      reservationDate, reservationTime, guestCount, specialRequest,
    } = req.body;

    if (!restaurantId || !customerName?.trim() || !customerMobile?.trim() || !reservationDate || !reservationTime) {
      res.status(400).json({ error: "Required fields: restaurantId, customerName, customerMobile, reservationDate, reservationTime" });
      return;
    }

    const [restaurant] = await db
      .select()
      .from(restaurantsTable)
      .where(and(eq(restaurantsTable.id, parseInt(restaurantId, 10)), eq(restaurantsTable.status, "active")));
    if (!restaurant) { res.status(404).json({ error: "Restaurant not found or not active" }); return; }

    // Insert with placeholder ref, then update
    const [r] = await db
      .insert(restaurantReservationsTable)
      .values({
        reservationRef: `EAR-TEMP`,
        restaurantId: restaurant.id,
        tableId: tableId ? parseInt(String(tableId), 10) : null,
        customerId: cu.id,
        ownerId: restaurant.ownerId,
        customerName: customerName.trim(),
        customerMobile: customerMobile.trim(),
        customerEmail: customerEmail?.trim() ?? null,
        reservationDate,
        reservationTime,
        guestCount: parseInt(String(guestCount ?? 1), 10),
        specialRequest: specialRequest?.trim() ?? null,
        status: "pending",
      })
      .returning();

    const [updated] = await db
      .update(restaurantReservationsTable)
      .set({ reservationRef: genRef(r.id) })
      .where(eq(restaurantReservationsTable.id, r.id))
      .returning();

    // Notify owner
    await createNotification(
      restaurant.ownerId,
      "New Reservation Received",
      `${customerName} made a reservation at ${restaurant.name} for ${reservationDate} at ${reservationTime}`,
      "general",
    );
    // Notify customer
    await createNotification(
      cu.id,
      "Reservation Submitted",
      `Your reservation at ${restaurant.name} for ${reservationDate} at ${reservationTime} is pending confirmation.`,
      "general",
    );
    await notifyAdmins("New Reservation", `${cu.fullName} reserved at ${restaurant.name} on ${reservationDate}`);
    await logActivity(req, "reservation_created", `Reservation ${updated.reservationRef} created`, cu.id, cu.role);

    res.status(201).json(serializeReservation(updated));
  },
);

// ── GET /reservations/:id ─────────────────────────────────────────────
router.get(
  "/reservations/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const r = await findReservation(id);
    if (!r) { res.status(404).json({ error: "Reservation not found" }); return; }

    // Customers can only see their own
    if (cu.role === "customer" && r.customerId !== cu.id) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    // Owners can only see their restaurants'
    if (cu.role === "restaurant_owner" && r.ownerId !== cu.id) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    res.json(serializeReservation(r));
  },
);

// ── DELETE /reservations/:id  (customer cancel) ──────────────────────
router.delete(
  "/reservations/:id",
  requireRole("customer"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const r = await findReservation(id);
    if (!r) { res.status(404).json({ error: "Reservation not found" }); return; }
    if (r.customerId !== cu.id) { res.status(403).json({ error: "Forbidden" }); return; }
    if (!["pending", "confirmed"].includes(r.status)) {
      res.status(400).json({ error: "Cannot cancel this reservation" }); return;
    }

    const { reason } = req.body;
    const [updated] = await db
      .update(restaurantReservationsTable)
      .set({ status: "cancelled", cancelReason: reason?.trim() ?? null, cancelledAt: new Date() })
      .where(eq(restaurantReservationsTable.id, id))
      .returning();

    // Notify owner
    await createNotification(
      r.ownerId,
      "Reservation Cancelled",
      `${r.customerName} cancelled their reservation (${r.reservationRef})`,
      "general",
    );
    await logActivity(req, "reservation_cancelled", `Reservation ${r.reservationRef} cancelled by customer`, cu.id, cu.role);

    res.json(serializeReservation(updated));
  },
);

// ── PATCH /reservations/:id/confirm  (owner) ─────────────────────────
router.patch(
  "/reservations/:id/confirm",
  requireRole("restaurant_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const r = await findReservation(id);
    if (!r) { res.status(404).json({ error: "Reservation not found" }); return; }
    if (r.ownerId !== cu.id) { res.status(403).json({ error: "Forbidden" }); return; }
    if (r.status !== "pending") { res.status(400).json({ error: "Only pending reservations can be confirmed" }); return; }

    const [updated] = await db
      .update(restaurantReservationsTable)
      .set({ status: "confirmed", confirmedAt: new Date() })
      .where(eq(restaurantReservationsTable.id, id))
      .returning();

    const [restaurant] = await db.select({ name: restaurantsTable.name }).from(restaurantsTable).where(eq(restaurantsTable.id, r.restaurantId));
    await createNotification(
      r.customerId,
      "Reservation Confirmed! 🎉",
      `Your reservation at ${restaurant?.name} on ${r.reservationDate} at ${r.reservationTime} is confirmed.`,
      "general",
    );
    await logActivity(req, "reservation_confirmed", `Reservation ${r.reservationRef} confirmed`, cu.id, cu.role);

    res.json(serializeReservation(updated));
  },
);

// ── PATCH /reservations/:id/reject  (owner) ──────────────────────────
router.patch(
  "/reservations/:id/reject",
  requireRole("restaurant_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const r = await findReservation(id);
    if (!r) { res.status(404).json({ error: "Reservation not found" }); return; }
    if (r.ownerId !== cu.id) { res.status(403).json({ error: "Forbidden" }); return; }
    if (r.status !== "pending") { res.status(400).json({ error: "Only pending reservations can be rejected" }); return; }

    const { reason } = req.body;
    const [updated] = await db
      .update(restaurantReservationsTable)
      .set({ status: "rejected", rejectionReason: reason?.trim() ?? null })
      .where(eq(restaurantReservationsTable.id, id))
      .returning();

    const [restaurant] = await db.select({ name: restaurantsTable.name }).from(restaurantsTable).where(eq(restaurantsTable.id, r.restaurantId));
    await createNotification(
      r.customerId,
      "Reservation Rejected",
      `Your reservation at ${restaurant?.name} on ${r.reservationDate} was not accepted.${reason ? ` Reason: ${reason}` : ""}`,
      "general",
    );
    await logActivity(req, "reservation_rejected", `Reservation ${r.reservationRef} rejected`, cu.id, cu.role);

    res.json(serializeReservation(updated));
  },
);

// ── PATCH /reservations/:id/complete  (owner) ────────────────────────
router.patch(
  "/reservations/:id/complete",
  requireRole("restaurant_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const r = await findReservation(id);
    if (!r) { res.status(404).json({ error: "Reservation not found" }); return; }
    if (r.ownerId !== cu.id) { res.status(403).json({ error: "Forbidden" }); return; }
    if (r.status !== "confirmed") { res.status(400).json({ error: "Only confirmed reservations can be completed" }); return; }

    const [updated] = await db
      .update(restaurantReservationsTable)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(restaurantReservationsTable.id, id))
      .returning();

    await logActivity(req, "reservation_completed", `Reservation ${r.reservationRef} completed`, cu.id, cu.role);

    res.json(serializeReservation(updated));
  },
);

export default router;
