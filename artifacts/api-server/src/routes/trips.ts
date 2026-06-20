import { Router } from "express";
import { db, tripPlansTable } from "@workspace/db";
import { eq, and, desc, count, gte } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { logActivity } from "../lib/auth";

const router = Router();

function genTripRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TRP-${ts}-${rand}`;
}

function serializeTrip(t: typeof tripPlansTable.$inferSelect) {
  return {
    ...t,
    budget: parseFloat(String(t.budget)),
    interests: t.interests ?? [],
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

function resolveStatus(arrivalDate: string, departureDate: string, current: string): "upcoming" | "ongoing" | "completed" | "draft" | "cancelled" {
  if (current === "cancelled" || current === "draft") return current as any;
  const today = new Date().toISOString().substring(0, 10);
  if (departureDate < today) return "completed";
  if (arrivalDate <= today && departureDate >= today) return "ongoing";
  return "upcoming";
}

// GET /trips — customer's own trips
router.get(
  "/trips",
  requireAuth,
  requireRole("customer"),
  async (req, res) => {
    const user = (req as any).currentUser;
    const status = req.query.status as string | undefined;
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const limit = Math.max(1, Math.min(50, parseInt(String(req.query.limit ?? "20"))));
    const offset = (page - 1) * limit;

    const where = [eq(tripPlansTable.customerId, user.id)];
    if (status && status !== "all") {
      where.push(eq(tripPlansTable.status, status as any));
    }

    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(tripPlansTable)
        .where(and(...where))
        .orderBy(desc(tripPlansTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(tripPlansTable).where(and(...where)),
    ]);

    // Auto-update status based on dates
    const trips = rows.map((t) => ({
      ...serializeTrip(t),
      status: resolveStatus(t.arrivalDate, t.departureDate, t.status),
    }));

    res.json({ trips, total: totalRows[0]?.count ?? 0, page, limit });
  },
);

// GET /trips/:ref — single trip detail
router.get(
  "/trips/:ref",
  requireAuth,
  requireRole("customer"),
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const ref = req.params.ref as string;

    const [trip] = await db
      .select()
      .from(tripPlansTable)
      .where(
        and(
          eq(tripPlansTable.tripRef, ref),
          eq(tripPlansTable.customerId, user.id),
        ),
      )
      .limit(1);

    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }

    res.json({
      ...serializeTrip(trip),
      status: resolveStatus(trip.arrivalDate, trip.departureDate, trip.status),
    });
  },
);

// POST /trips — create trip
router.post(
  "/trips",
  requireAuth,
  requireRole("customer"),
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const {
      title,
      arrivalDate,
      departureDate,
      days,
      adults,
      children,
      budget,
      travelType,
      interests,
      budgetCategory,
      notes,
    } = req.body as {
      title?: string | null;
      arrivalDate: string;
      departureDate: string;
      days: number;
      adults: number;
      children?: number;
      budget: number;
      travelType: "solo" | "couple" | "family" | "friends" | "business";
      interests: string[];
      budgetCategory: "budget" | "standard" | "premium" | "luxury";
      notes?: string | null;
    };

    if (!arrivalDate || !departureDate || !days || !adults || !budget || !travelType || !budgetCategory) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    if (new Date(departureDate) < new Date(arrivalDate)) {
      res.status(400).json({ error: "Departure date must be after arrival date" });
      return;
    }

    const [trip] = await db
      .insert(tripPlansTable)
      .values({
        tripRef: genTripRef(),
        customerId: user.id,
        title: title ?? null,
        arrivalDate,
        departureDate,
        days,
        adults,
        children: children ?? 0,
        budget: String(budget),
        travelType,
        interests: interests ?? [],
        budgetCategory,
        status: "upcoming",
        notes: notes ?? null,
      })
      .returning();

    await logActivity(req, "trip_created", `Trip ${trip.tripRef} created`, user.id, user.role);
    res.status(201).json(serializeTrip(trip));
  },
);

// PUT /trips/:ref — update trip
router.put(
  "/trips/:ref",
  requireAuth,
  requireRole("customer"),
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const ref = req.params.ref as string;

    const [existing] = await db
      .select()
      .from(tripPlansTable)
      .where(
        and(
          eq(tripPlansTable.tripRef, ref),
          eq(tripPlansTable.customerId, user.id),
        ),
      )
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    if (existing.status === "cancelled") {
      res.status(400).json({ error: "Cannot edit a cancelled trip" });
      return;
    }

    const {
      title,
      arrivalDate,
      departureDate,
      days,
      adults,
      children,
      budget,
      travelType,
      interests,
      budgetCategory,
      notes,
    } = req.body as Partial<{
      title: string | null;
      arrivalDate: string;
      departureDate: string;
      days: number;
      adults: number;
      children: number;
      budget: number;
      travelType: "solo" | "couple" | "family" | "friends" | "business";
      interests: string[];
      budgetCategory: "budget" | "standard" | "premium" | "luxury";
      notes: string | null;
    }>;

    const newArrival = arrivalDate ?? existing.arrivalDate;
    const newDeparture = departureDate ?? existing.departureDate;
    if (new Date(newDeparture) < new Date(newArrival)) {
      res.status(400).json({ error: "Departure date must be after arrival date" });
      return;
    }

    const [updated] = await db
      .update(tripPlansTable)
      .set({
        title: title !== undefined ? title : existing.title,
        arrivalDate: newArrival,
        departureDate: newDeparture,
        days: days ?? existing.days,
        adults: adults ?? existing.adults,
        children: children ?? existing.children,
        budget: budget !== undefined ? String(budget) : existing.budget,
        travelType: travelType ?? existing.travelType,
        interests: interests ?? existing.interests,
        budgetCategory: budgetCategory ?? existing.budgetCategory,
        notes: notes !== undefined ? notes : existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(tripPlansTable.id, existing.id))
      .returning();

    res.json(serializeTrip(updated));
  },
);

// DELETE /trips/:ref — delete trip
router.delete(
  "/trips/:ref",
  requireAuth,
  requireRole("customer"),
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const ref = req.params.ref as string;

    const [existing] = await db
      .select()
      .from(tripPlansTable)
      .where(
        and(
          eq(tripPlansTable.tripRef, ref),
          eq(tripPlansTable.customerId, user.id),
        ),
      )
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }

    await db.delete(tripPlansTable).where(eq(tripPlansTable.id, existing.id));
    await logActivity(req, "trip_deleted", `Trip ${ref} deleted`, user.id, user.role);
    res.json({ success: true });
  },
);

// PATCH /trips/:ref/cancel — cancel trip
router.patch(
  "/trips/:ref/cancel",
  requireAuth,
  requireRole("customer"),
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const ref = req.params.ref as string;

    const [existing] = await db
      .select()
      .from(tripPlansTable)
      .where(
        and(
          eq(tripPlansTable.tripRef, ref),
          eq(tripPlansTable.customerId, user.id),
        ),
      )
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }

    const [updated] = await db
      .update(tripPlansTable)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(tripPlansTable.id, existing.id))
      .returning();

    res.json(serializeTrip(updated));
  },
);

export default router;
