import { Router } from "express";
import {
  db,
  bookingsTable,
  hotelsTable,
  roomsTable,
  usersTable,
} from "@workspace/db";
import {
  eq,
  and,
  ilike,
  sql,
  or,
  gte,
  lte,
  desc,
  inArray,
} from "drizzle-orm";
import { logActivity, createNotification } from "../lib/auth";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

type BookingRow = typeof bookingsTable.$inferSelect;

function genRef(id: number): string {
  return `EAB-${String(id).padStart(6, "0")}`;
}

function parseNum(v: string | null | undefined): number {
  if (v == null) return 0;
  return parseFloat(v as string);
}

function serializeBooking(b: BookingRow) {
  return {
    ...b,
    baseAmount: parseNum(b.baseAmount as any),
    discountAmount: parseNum(b.discountAmount as any),
    taxAmount: parseNum(b.taxAmount as any),
    taxRate: parseNum(b.taxRate as any),
    finalAmount: parseNum(b.finalAmount as any),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    confirmedAt: b.confirmedAt?.toISOString() ?? null,
    checkedInAt: b.checkedInAt?.toISOString() ?? null,
    checkedOutAt: b.checkedOutAt?.toISOString() ?? null,
  };
}

async function findBooking(id: number) {
  const [b] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, id));
  return b;
}

/** Notify all admins and super_admins */
async function notifyAdmins(
  title: string,
  message: string,
): Promise<void> {
  const admins = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(
      and(
        inArray(usersTable.role, ["admin", "super_admin"]),
        eq(usersTable.status, "active"),
      ),
    );
  await Promise.all(
    admins.map((a) => createNotification(a.id, title, message, "general")),
  );
}

// ─────────────────────────────────────────────────
// GET /bookings/stats  MUST be before /bookings/:id
// ─────────────────────────────────────────────────
router.get(
  "/bookings/stats",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 6);
    const weekAgoStr = weekAgo.toISOString().slice(0, 10);
    const monthAgo = new Date(today);
    monthAgo.setDate(today.getDate() - 29);
    const monthAgoStr = monthAgo.toISOString().slice(0, 10);

    const [row] = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`sum(case when ${bookingsTable.status}='pending' then 1 else 0 end)::int`,
        confirmed: sql<number>`sum(case when ${bookingsTable.status}='confirmed' then 1 else 0 end)::int`,
        rejected: sql<number>`sum(case when ${bookingsTable.status}='rejected' then 1 else 0 end)::int`,
        cancelled: sql<number>`sum(case when ${bookingsTable.status}='cancelled' then 1 else 0 end)::int`,
        checkedIn: sql<number>`sum(case when ${bookingsTable.status}='checked_in' then 1 else 0 end)::int`,
        checkedOut: sql<number>`sum(case when ${bookingsTable.status}='checked_out' then 1 else 0 end)::int`,
        totalRevenue: sql<number>`coalesce(sum(${bookingsTable.finalAmount}),0)::numeric`,
        todayBookings: sql<number>`sum(case when date(${bookingsTable.createdAt}) = ${todayStr}::date then 1 else 0 end)::int`,
        weekBookings: sql<number>`sum(case when date(${bookingsTable.createdAt}) >= ${weekAgoStr}::date then 1 else 0 end)::int`,
        monthBookings: sql<number>`sum(case when date(${bookingsTable.createdAt}) >= ${monthAgoStr}::date then 1 else 0 end)::int`,
        confirmedRevenue: sql<number>`coalesce(sum(case when ${bookingsTable.status} in ('confirmed','checked_in','checked_out') then ${bookingsTable.finalAmount}::numeric else 0 end),0)::numeric`,
      })
      .from(bookingsTable);

    res.json({
      total: row?.total ?? 0,
      pending: row?.pending ?? 0,
      confirmed: row?.confirmed ?? 0,
      rejected: row?.rejected ?? 0,
      cancelled: row?.cancelled ?? 0,
      checkedIn: row?.checkedIn ?? 0,
      checkedOut: row?.checkedOut ?? 0,
      totalRevenue: parseFloat(String(row?.totalRevenue ?? 0)),
      confirmedRevenue: parseFloat(String(row?.confirmedRevenue ?? 0)),
      todayBookings: row?.todayBookings ?? 0,
      weekBookings: row?.weekBookings ?? 0,
      monthBookings: row?.monthBookings ?? 0,
    });
  },
);

// ─────────────────────────────────────────────────
// GET /bookings/analytics MUST be before /bookings/:id
// ─────────────────────────────────────────────────
router.get(
  "/bookings/analytics",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    // Top hotels by booking count
    const topHotelsByBookings = await db
      .select({
        hotelId: bookingsTable.hotelId,
        hotelName: hotelsTable.name,
        bookingCount: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${bookingsTable.finalAmount}),0)::numeric`,
      })
      .from(bookingsTable)
      .innerJoin(hotelsTable, eq(bookingsTable.hotelId, hotelsTable.id))
      .groupBy(bookingsTable.hotelId, hotelsTable.name)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    // Top room types
    const topRoomTypes = await db
      .select({
        roomType: roomsTable.roomType,
        bookingCount: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${bookingsTable.finalAmount}),0)::numeric`,
      })
      .from(bookingsTable)
      .innerJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
      .groupBy(roomsTable.roomType)
      .orderBy(desc(sql`count(*)`))
      .limit(6);

    // Top owners by revenue
    const topOwners = await db
      .select({
        ownerId: bookingsTable.ownerId,
        ownerName: usersTable.fullName,
        bookingCount: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${bookingsTable.finalAmount}),0)::numeric`,
      })
      .from(bookingsTable)
      .innerJoin(usersTable, eq(bookingsTable.ownerId, usersTable.id))
      .groupBy(bookingsTable.ownerId, usersTable.fullName)
      .orderBy(desc(sql`sum(${bookingsTable.finalAmount})`))
      .limit(5);

    // Bookings by day for last 30 days
    const byDay = await db
      .select({
        date: sql<string>`date(${bookingsTable.createdAt})::text`,
        bookingCount: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${bookingsTable.finalAmount}),0)::numeric`,
      })
      .from(bookingsTable)
      .where(
        gte(
          bookingsTable.createdAt,
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        ),
      )
      .groupBy(sql`date(${bookingsTable.createdAt})`)
      .orderBy(sql`date(${bookingsTable.createdAt})`);

    res.json({
      topHotelsByBookings: topHotelsByBookings.map((r) => ({
        ...r,
        revenue: parseFloat(String(r.revenue)),
      })),
      topRoomTypes: topRoomTypes.map((r) => ({
        ...r,
        revenue: parseFloat(String(r.revenue)),
      })),
      topOwners: topOwners.map((r) => ({
        ...r,
        revenue: parseFloat(String(r.revenue)),
      })),
      byDay: byDay.map((r) => ({
        date: r.date,
        bookingCount: r.bookingCount,
        revenue: parseFloat(String(r.revenue)),
      })),
    });
  },
);

// ─────────────────────────────────────────────────
// GET /bookings — list
// ─────────────────────────────────────────────────
router.get("/bookings", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const {
    status,
    search,
    hotelId,
    customerId,
    dateFrom,
    dateTo,
    page = "1",
    limit = "20",
  } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  if (cu.role === "customer") {
    conditions.push(eq(bookingsTable.customerId, cu.id));
  } else if (cu.role === "hotel_owner") {
    conditions.push(eq(bookingsTable.ownerId, cu.id));
  }
  if (status) conditions.push(eq(bookingsTable.status, status as any));
  if (hotelId) conditions.push(eq(bookingsTable.hotelId, parseInt(hotelId, 10)));
  if (customerId)
    conditions.push(eq(bookingsTable.customerId, parseInt(customerId, 10)));
  if (dateFrom) conditions.push(gte(bookingsTable.checkInDate, dateFrom));
  if (dateTo) conditions.push(lte(bookingsTable.checkInDate, dateTo));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // For search by booking ref / customer name / hotel name — join tables
  const [bookings, countResult] = await Promise.all([
    db
      .select({
        booking: bookingsTable,
        customerName: usersTable.fullName,
        hotelName: hotelsTable.name,
        roomName: roomsTable.name,
        ownerName: sql<string>`(select full_name from users u2 where u2.id = ${bookingsTable.ownerId})`,
      })
      .from(bookingsTable)
      .innerJoin(usersTable, eq(bookingsTable.customerId, usersTable.id))
      .innerJoin(hotelsTable, eq(bookingsTable.hotelId, hotelsTable.id))
      .innerJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
      .where(
        search
          ? and(
              where,
              or(
                ilike(bookingsTable.bookingRef, `%${search}%`),
                ilike(usersTable.fullName, `%${search}%`),
                ilike(hotelsTable.name, `%${search}%`),
              ),
            )
          : where,
      )
      .orderBy(desc(bookingsTable.createdAt))
      .limit(limitNum)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookingsTable)
      .innerJoin(usersTable, eq(bookingsTable.customerId, usersTable.id))
      .innerJoin(hotelsTable, eq(bookingsTable.hotelId, hotelsTable.id))
      .where(
        search
          ? and(
              where,
              or(
                ilike(bookingsTable.bookingRef, `%${search}%`),
                ilike(usersTable.fullName, `%${search}%`),
                ilike(hotelsTable.name, `%${search}%`),
              ),
            )
          : where,
      ),
  ]);

  res.json({
    bookings: bookings.map(({ booking, customerName, hotelName, roomName, ownerName }) => ({
      ...serializeBooking(booking),
      customerName,
      hotelName,
      roomName,
      ownerName,
    })),
    total: countResult[0]?.count ?? 0,
    page: pageNum,
    limit: limitNum,
  });
});

// ─────────────────────────────────────────────────
// POST /bookings — create
// ─────────────────────────────────────────────────
router.post(
  "/bookings",
  requireRole("customer", "hotel_owner", "admin", "super_admin"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const {
      hotelId,
      roomId,
      checkInDate,
      checkOutDate,
      adultsCount,
      childrenCount,
      customerNotes,
    } = req.body;

    if (!hotelId || !roomId || !checkInDate || !checkOutDate) {
      res.status(400).json({ error: "hotelId, roomId, checkInDate, checkOutDate are required" });
      return;
    }

    // Calculate nights
    const cin = new Date(checkInDate);
    const cout = new Date(checkOutDate);
    if (isNaN(cin.getTime()) || isNaN(cout.getTime()) || cout <= cin) {
      res.status(400).json({ error: "Invalid check-in/check-out dates" });
      return;
    }
    const nights = Math.ceil((cout.getTime() - cin.getTime()) / (1000 * 60 * 60 * 24));

    // Get hotel & room info
    const [hotel] = await db
      .select()
      .from(hotelsTable)
      .where(eq(hotelsTable.id, parseInt(String(hotelId), 10)));
    if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }

    const [room] = await db
      .select()
      .from(roomsTable)
      .where(eq(roomsTable.id, parseInt(String(roomId), 10)));
    if (!room) { res.status(404).json({ error: "Room not found" }); return; }
    if (room.hotelId !== hotel.id) { res.status(400).json({ error: "Room does not belong to this hotel" }); return; }

    // Calculate amounts
    const pricePerNight = parseFloat((room.finalPrice ?? room.basePrice) as string);
    const baseAmount = pricePerNight * nights;
    const discountAmount = 0;
    const taxRate = 18;
    const taxAmount = (baseAmount - discountAmount) * (taxRate / 100);
    const finalAmount = baseAmount - discountAmount + taxAmount;

    // Generate temp booking ref, will update after insert
    const tempRef = `EAB-TEMP-${Date.now()}`;

    const [booking] = await db
      .insert(bookingsTable)
      .values({
        bookingRef: tempRef,
        customerId: cu.id,
        hotelId: hotel.id,
        roomId: room.id,
        ownerId: hotel.ownerId,
        checkInDate,
        checkOutDate,
        nights,
        adultsCount: adultsCount ? parseInt(String(adultsCount), 10) : 1,
        childrenCount: childrenCount ? parseInt(String(childrenCount), 10) : 0,
        baseAmount: String(baseAmount.toFixed(2)),
        discountAmount: "0",
        taxAmount: String(taxAmount.toFixed(2)),
        taxRate: "18",
        finalAmount: String(finalAmount.toFixed(2)),
        customerNotes: customerNotes || null,
        status: "pending",
      })
      .returning();

    // Update booking ref with actual ID
    const bookingRef = genRef(booking.id);
    const [finalBooking] = await db
      .update(bookingsTable)
      .set({ bookingRef })
      .where(eq(bookingsTable.id, booking.id))
      .returning();

    // Activity log
    await logActivity(
      req,
      "booking_created",
      `Booking ${bookingRef} created for hotel "${hotel.name}", room "${room.name}"`,
      cu.id,
      cu.role,
    );

    // Notify admin & super_admin
    const notifMsg =
      `Booking ID: ${bookingRef} | Customer: ${cu.fullName ?? cu.email} | ` +
      `Hotel: ${hotel.name} | Room: ${room.name} | ` +
      `Check-in: ${checkInDate} → ${checkOutDate} (${nights} nights) | ` +
      `Guests: ${adultsCount ?? 1} adults | Amount: ₹${finalAmount.toFixed(2)} | Status: Pending`;
    await notifyAdmins(`New Booking: ${bookingRef}`, notifMsg);

    // Notify hotel owner
    await createNotification(
      hotel.ownerId,
      `New Booking Received`,
      `${bookingRef}: Guest booking for "${room.name}" — Check-in ${checkInDate}. Amount ₹${finalAmount.toFixed(2)}.`,
      "general",
    );

    res.status(201).json(serializeBooking(finalBooking));
  },
);

// ─────────────────────────────────────────────────
// GET /bookings/:id
// ─────────────────────────────────────────────────
router.get("/bookings/:id", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id as string, 10);
  const booking = await findBooking(id);
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  // Access control
  if (cu.role === "customer" && booking.customerId !== cu.id) {
    res.status(403).json({ error: "Access denied" }); return;
  }
  if (cu.role === "hotel_owner" && booking.ownerId !== cu.id) {
    res.status(403).json({ error: "Access denied" }); return;
  }

  res.json(serializeBooking(booking));
});

// ─────────────────────────────────────────────────
// POST /bookings/:id/confirm
// ─────────────────────────────────────────────────
router.post(
  "/bookings/:id/confirm",
  requireRole("hotel_owner", "admin", "super_admin"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    const booking = await findBooking(id);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (cu.role === "hotel_owner" && booking.ownerId !== cu.id) {
      res.status(403).json({ error: "Access denied" }); return;
    }
    if (booking.status !== "pending") {
      res.status(400).json({ error: "Only pending bookings can be confirmed" }); return;
    }

    const [updated] = await db
      .update(bookingsTable)
      .set({ status: "confirmed", confirmedBy: cu.id, confirmedAt: new Date() })
      .where(eq(bookingsTable.id, id))
      .returning();

    await logActivity(req, "booking_confirmed", `Booking ${booking.bookingRef} confirmed`, cu.id, cu.role);
    await createNotification(
      booking.customerId,
      "Booking Confirmed ✓",
      `Your booking ${booking.bookingRef} has been confirmed! Check-in: ${booking.checkInDate}.`,
      "general",
    );
    await notifyAdmins(
      `Booking Confirmed: ${booking.bookingRef}`,
      `Booking ${booking.bookingRef} confirmed by ${cu.role}. Amount: ₹${parseNum(booking.finalAmount as any).toFixed(2)}.`,
    );

    res.json(serializeBooking(updated));
  },
);

// ─────────────────────────────────────────────────
// POST /bookings/:id/reject
// ─────────────────────────────────────────────────
router.post(
  "/bookings/:id/reject",
  requireRole("hotel_owner", "admin", "super_admin"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    const { reason } = req.body;
    if (!reason?.trim()) { res.status(400).json({ error: "Rejection reason is required" }); return; }

    const booking = await findBooking(id);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (cu.role === "hotel_owner" && booking.ownerId !== cu.id) {
      res.status(403).json({ error: "Access denied" }); return;
    }
    if (!["pending"].includes(booking.status)) {
      res.status(400).json({ error: "Only pending bookings can be rejected" }); return;
    }

    const [updated] = await db
      .update(bookingsTable)
      .set({ status: "rejected", rejectionReason: String(reason).trim() })
      .where(eq(bookingsTable.id, id))
      .returning();

    await logActivity(req, "booking_rejected", `Booking ${booking.bookingRef} rejected`, cu.id, cu.role);
    await createNotification(
      booking.customerId,
      "Booking Rejected",
      `Your booking ${booking.bookingRef} was rejected. Reason: ${reason}.`,
      "general",
    );
    await notifyAdmins(`Booking Rejected: ${booking.bookingRef}`, `Booking ${booking.bookingRef} was rejected.`);

    res.json(serializeBooking(updated));
  },
);

// ─────────────────────────────────────────────────
// POST /bookings/:id/cancel
// ─────────────────────────────────────────────────
router.post("/bookings/:id/cancel", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id as string, 10);
  const { reason } = req.body;

  const booking = await findBooking(id);
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  const canCancel =
    cu.role === "admin" ||
    cu.role === "super_admin" ||
    (cu.role === "customer" && booking.customerId === cu.id) ||
    (cu.role === "hotel_owner" && booking.ownerId === cu.id);
  if (!canCancel) { res.status(403).json({ error: "Access denied" }); return; }

  if (!["pending", "confirmed"].includes(booking.status)) {
    res.status(400).json({ error: "This booking cannot be cancelled" }); return;
  }

  const [updated] = await db
    .update(bookingsTable)
    .set({ status: "cancelled", cancelReason: reason ? String(reason).trim() : null })
    .where(eq(bookingsTable.id, id))
    .returning();

  await logActivity(req, "booking_cancelled", `Booking ${booking.bookingRef} cancelled`, cu.id, cu.role);
  await createNotification(
    booking.customerId,
    "Booking Cancelled",
    `Your booking ${booking.bookingRef} has been cancelled.`,
    "general",
  );
  await notifyAdmins(`Booking Cancelled: ${booking.bookingRef}`, `Booking ${booking.bookingRef} was cancelled.`);

  res.json(serializeBooking(updated));
});

// ─────────────────────────────────────────────────
// POST /bookings/:id/checkin
// ─────────────────────────────────────────────────
router.post(
  "/bookings/:id/checkin",
  requireRole("hotel_owner", "admin", "super_admin"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    const booking = await findBooking(id);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (cu.role === "hotel_owner" && booking.ownerId !== cu.id) {
      res.status(403).json({ error: "Access denied" }); return;
    }
    if (booking.status !== "confirmed") {
      res.status(400).json({ error: "Only confirmed bookings can be checked in" }); return;
    }

    const [updated] = await db
      .update(bookingsTable)
      .set({ status: "checked_in", checkedInAt: new Date() })
      .where(eq(bookingsTable.id, id))
      .returning();

    await logActivity(req, "booking_checkin", `Booking ${booking.bookingRef} checked in`, cu.id, cu.role);
    await createNotification(
      booking.customerId,
      "Checked In",
      `Welcome! You have successfully checked in for booking ${booking.bookingRef}.`,
      "general",
    );
    await notifyAdmins(`Check-in: ${booking.bookingRef}`, `Guest checked in for booking ${booking.bookingRef}.`);

    res.json(serializeBooking(updated));
  },
);

// ─────────────────────────────────────────────────
// POST /bookings/:id/checkout
// ─────────────────────────────────────────────────
router.post(
  "/bookings/:id/checkout",
  requireRole("hotel_owner", "admin", "super_admin"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    const booking = await findBooking(id);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (cu.role === "hotel_owner" && booking.ownerId !== cu.id) {
      res.status(403).json({ error: "Access denied" }); return;
    }
    if (booking.status !== "checked_in") {
      res.status(400).json({ error: "Only checked-in bookings can be checked out" }); return;
    }

    const [updated] = await db
      .update(bookingsTable)
      .set({ status: "checked_out", checkedOutAt: new Date() })
      .where(eq(bookingsTable.id, id))
      .returning();

    await logActivity(req, "booking_checkout", `Booking ${booking.bookingRef} checked out`, cu.id, cu.role);
    await createNotification(
      booking.customerId,
      "Checked Out",
      `Thank you for staying! Booking ${booking.bookingRef} is now complete.`,
      "general",
    );
    await notifyAdmins(`Check-out: ${booking.bookingRef}`, `Booking ${booking.bookingRef} completed (check-out). Revenue ₹${parseNum(booking.finalAmount as any).toFixed(2)}.`);

    res.json(serializeBooking(updated));
  },
);

export default router;
