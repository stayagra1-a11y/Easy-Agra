import { Router } from "express";
import {
  db,
  cancellationsTable,
  cancellationStatusEnum,
  bookingsTable,
  restaurantReservationsTable,
  spaAppointmentsTable,
  notificationsTable,
  usersTable,
  paymentsTable,
} from "@workspace/db";
import { eq, and, desc, or } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { logActivity } from "../lib/auth";

const router = Router();

function genCancelRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `EAC-${ts}-${rand}`;
}

async function notify(userId: number, title: string, message: string) {
  try {
    await db.insert(notificationsTable).values({
      userId,
      title,
      message,
      type: "general",
      isRead: false,
    });
  } catch {
    // non-critical
  }
}

function serializeCancel(c: typeof cancellationsTable.$inferSelect) {
  return {
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    processedAt: c.processedAt?.toISOString() ?? null,
  };
}

async function getCancellationWithNames(id: number) {
  const [cancel] = await db
    .select()
    .from(cancellationsTable)
    .where(eq(cancellationsTable.id, id));
  if (!cancel) return null;

  const [customer] = await db
    .select({ fullName: usersTable.fullName })
    .from(usersTable)
    .where(eq(usersTable.id, cancel.customerId));

  let ownerName: string | null = null;
  if (cancel.ownerId) {
    const [owner] = await db
      .select({ fullName: usersTable.fullName })
      .from(usersTable)
      .where(eq(usersTable.id, cancel.ownerId));
    ownerName = owner?.fullName ?? null;
  }

  return {
    ...serializeCancel(cancel),
    customerName: customer?.fullName ?? null,
    ownerName,
  };
}

// ─────────────────────────────────────────────────
// POST /cancellations — customer requests cancellation
// ─────────────────────────────────────────────────
router.post(
  "/cancellations",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const { bookingType, bookingRef, reason } = req.body as {
      bookingType: "hotel" | "restaurant" | "spa";
      bookingRef: string;
      reason: string;
    };

    if (!bookingType || !bookingRef || !reason) {
      res.status(400).json({ error: "bookingType, bookingRef and reason are required" });
      return;
    }

    let bookingId: number | null = null;
    let ownerId: number | null = null;
    let alreadyCancelled = false;

    if (bookingType === "hotel") {
      const [booking] = await db
        .select()
        .from(bookingsTable)
        .where(
          and(
            eq(bookingsTable.bookingRef, bookingRef),
            eq(bookingsTable.customerId, user.id),
          ),
        );
      if (!booking) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }
      if (booking.status === "cancelled") {
        alreadyCancelled = true;
      }
      bookingId = booking.id;
      ownerId = booking.ownerId;
    } else if (bookingType === "restaurant") {
      const [res2] = await db
        .select()
        .from(restaurantReservationsTable)
        .where(
          and(
            eq(restaurantReservationsTable.reservationRef, bookingRef),
            eq(restaurantReservationsTable.customerId, user.id),
          ),
        );
      if (!res2) {
        res.status(404).json({ error: "Reservation not found" });
        return;
      }
      if (res2.status === "cancelled") {
        alreadyCancelled = true;
      }
      bookingId = res2.id;
      ownerId = res2.ownerId;
    } else if (bookingType === "spa") {
      const [appt] = await db
        .select()
        .from(spaAppointmentsTable)
        .where(
          and(
            eq(spaAppointmentsTable.appointmentRef, bookingRef),
            eq(spaAppointmentsTable.customerId, user.id),
          ),
        );
      if (!appt) {
        res.status(404).json({ error: "Appointment not found" });
        return;
      }
      if (appt.status === "cancelled") {
        alreadyCancelled = true;
      }
      bookingId = appt.id;
      ownerId = appt.ownerId;
    } else {
      res.status(400).json({ error: "Invalid bookingType" });
      return;
    }

    if (alreadyCancelled) {
      res.status(400).json({ error: "This booking is already cancelled" });
      return;
    }

    // Check no pending request already exists
    const [existing] = await db
      .select({ id: cancellationsTable.id })
      .from(cancellationsTable)
      .where(
        and(
          eq(cancellationsTable.bookingRef, bookingRef),
          eq(cancellationsTable.status, "requested"),
        ),
      );
    if (existing) {
      res.status(400).json({ error: "A cancellation request is already pending" });
      return;
    }

    const [cancel] = await db
      .insert(cancellationsTable)
      .values({
        cancelRef: genCancelRef(),
        bookingType,
        bookingId: bookingId!,
        bookingRef,
        customerId: user.id,
        ownerId: ownerId ?? undefined,
        reason,
        status: "requested",
      })
      .returning();

    if (ownerId) {
      await notify(
        ownerId,
        "Cancellation Requested",
        `${user.fullName} requested cancellation of booking ${bookingRef}. Reason: ${reason}`,
      );
    }

    await logActivity(
      req,
      "cancellation_requested",
      `Cancellation requested for ${bookingType} booking ${bookingRef}`,
      user.id,
      user.role,
    );

    res.status(201).json(await getCancellationWithNames(cancel.id));
  },
);

// ─────────────────────────────────────────────────
// GET /cancellations/my — customer's own cancellations
// MUST be before /:ref
// ─────────────────────────────────────────────────
router.get(
  "/cancellations/my",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const rows = await db
      .select()
      .from(cancellationsTable)
      .where(eq(cancellationsTable.customerId, user.id))
      .orderBy(desc(cancellationsTable.createdAt));

    const cancellations = await Promise.all(
      rows.map((r) => getCancellationWithNames(r.id)),
    );
    res.json({ cancellations: cancellations.filter(Boolean), total: cancellations.length });
  },
);

// ─────────────────────────────────────────────────
// GET /cancellations/:ref
// ─────────────────────────────────────────────────
router.get(
  "/cancellations/:ref",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const [cancel] = await db
      .select()
      .from(cancellationsTable)
      .where(eq(cancellationsTable.cancelRef, req.params.ref as string));

    if (!cancel) {
      res.status(404).json({ error: "Cancellation not found" });
      return;
    }

    const isOwner = cancel.ownerId === user.id;
    const isAdmin = ["admin", "super_admin"].includes(user.role);
    const isCustomer = cancel.customerId === user.id;
    if (!isOwner && !isAdmin && !isCustomer) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    res.json(await getCancellationWithNames(cancel.id));
  },
);

// ─────────────────────────────────────────────────
// GET /owner/cancellations — owner's incoming requests
// ─────────────────────────────────────────────────
router.get(
  "/owner/cancellations",
  requireRole("hotel_owner", "restaurant_owner", "spa_owner"),
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const status = req.query.status as string | undefined;

    const conditions = [eq(cancellationsTable.ownerId, user.id)];
    if (status) {
      conditions.push(eq(cancellationsTable.status, status as any));
    }

    const rows = await db
      .select()
      .from(cancellationsTable)
      .where(and(...conditions))
      .orderBy(desc(cancellationsTable.createdAt));

    const cancellations = await Promise.all(
      rows.map((r) => getCancellationWithNames(r.id)),
    );
    res.json({ cancellations: cancellations.filter(Boolean), total: cancellations.length });
  },
);

// ─────────────────────────────────────────────────
// PATCH /owner/cancellations/:ref — owner approve/reject
// ─────────────────────────────────────────────────
router.patch(
  "/owner/cancellations/:ref",
  requireRole("hotel_owner", "restaurant_owner", "spa_owner"),
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const [cancel] = await db
      .select()
      .from(cancellationsTable)
      .where(eq(cancellationsTable.cancelRef, req.params.ref as string));

    if (!cancel) {
      res.status(404).json({ error: "Cancellation not found" });
      return;
    }
    if (cancel.ownerId !== user.id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    if (cancel.status !== "requested") {
      res.status(400).json({ error: "Cancellation already processed" });
      return;
    }

    const { action, note } = req.body as { action: "approve" | "reject"; note?: string };
    if (!action || !["approve", "reject"].includes(action)) {
      res.status(400).json({ error: "action must be approve or reject" });
      return;
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    const now = new Date();

    await db
      .update(cancellationsTable)
      .set({
        status: newStatus,
        ownerNote: note ?? null,
        processedBy: user.id,
        processedAt: now,
      })
      .where(eq(cancellationsTable.id, cancel.id));

    if (action === "approve") {
      await cancelBookingInDb(cancel.bookingType, cancel.bookingId);
    }

    await notify(
      cancel.customerId,
      action === "approve" ? "Cancellation Approved" : "Cancellation Rejected",
      action === "approve"
        ? `Your cancellation request for ${cancel.bookingRef} has been approved.`
        : `Your cancellation request for ${cancel.bookingRef} was rejected.${note ? ` Reason: ${note}` : ""}`,
    );

    await logActivity(
      req,
      `cancellation_${newStatus}`,
      `Cancellation ${cancel.cancelRef} ${newStatus} by owner`,
      user.id,
      user.role,
    );

    res.json(await getCancellationWithNames(cancel.id));
  },
);

// ─────────────────────────────────────────────────
// GET /admin/cancellations — admin list all
// ─────────────────────────────────────────────────
router.get(
  "/admin/cancellations",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const status = req.query.status as string | undefined;
    const bookingType = req.query.bookingType as string | undefined;

    const conditions: any[] = [];
    if (status) conditions.push(eq(cancellationsTable.status, status as any));
    if (bookingType) conditions.push(eq(cancellationsTable.bookingType, bookingType as any));

    const rows = await db
      .select()
      .from(cancellationsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(cancellationsTable.createdAt));

    const cancellations = await Promise.all(
      rows.map((r) => getCancellationWithNames(r.id)),
    );
    res.json({ cancellations: cancellations.filter(Boolean), total: cancellations.length });
  },
);

// ─────────────────────────────────────────────────
// PATCH /admin/cancellations/:ref — admin process
// ─────────────────────────────────────────────────
router.patch(
  "/admin/cancellations/:ref",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const [cancel] = await db
      .select()
      .from(cancellationsTable)
      .where(eq(cancellationsTable.cancelRef, req.params.ref as string));

    if (!cancel) {
      res.status(404).json({ error: "Cancellation not found" });
      return;
    }
    if (cancel.status !== "requested") {
      res.status(400).json({ error: "Cancellation already processed" });
      return;
    }

    const { action, adminNote } = req.body as {
      action: "approve" | "reject";
      adminNote?: string;
    };
    if (!action || !["approve", "reject"].includes(action)) {
      res.status(400).json({ error: "action must be approve or reject" });
      return;
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    const now = new Date();

    await db
      .update(cancellationsTable)
      .set({
        status: newStatus,
        adminNote: adminNote ?? null,
        processedBy: user.id,
        processedAt: now,
      })
      .where(eq(cancellationsTable.id, cancel.id));

    if (action === "approve") {
      await cancelBookingInDb(cancel.bookingType, cancel.bookingId);
    }

    await notify(
      cancel.customerId,
      action === "approve" ? "Cancellation Approved" : "Cancellation Rejected",
      action === "approve"
        ? `Your cancellation request for ${cancel.bookingRef} has been approved by admin.`
        : `Your cancellation request for ${cancel.bookingRef} was rejected by admin.`,
    );

    await logActivity(
      req,
      `cancellation_${newStatus}_admin`,
      `Cancellation ${cancel.cancelRef} ${newStatus} by admin`,
      user.id,
      user.role,
    );

    res.json(await getCancellationWithNames(cancel.id));
  },
);

// ─────────────────────────────────────────────────
// Helper: cancel the actual booking in the DB
// ─────────────────────────────────────────────────
async function cancelBookingInDb(
  bookingType: "hotel" | "restaurant" | "spa",
  bookingId: number,
) {
  try {
    if (bookingType === "hotel") {
      await db
        .update(bookingsTable)
        .set({ status: "cancelled" })
        .where(eq(bookingsTable.id, bookingId));
    } else if (bookingType === "restaurant") {
      await db
        .update(restaurantReservationsTable)
        .set({ status: "cancelled" })
        .where(eq(restaurantReservationsTable.id, bookingId));
    } else if (bookingType === "spa") {
      await db
        .update(spaAppointmentsTable)
        .set({ status: "cancelled" })
        .where(eq(spaAppointmentsTable.id, bookingId));
    }
  } catch {
    // log but don't fail the request
  }
}

export default router;
