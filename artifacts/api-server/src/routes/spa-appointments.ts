import { Router } from "express";
import {
  db,
  spasTable,
  spaServicesTable,
  spaAppointmentsTable,
  usersTable,
} from "@workspace/db";
import {
  eq,
  and,
  desc,
  inArray,
  isNull,
  sql,
} from "drizzle-orm";
import { logActivity, createNotification } from "../lib/auth";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

type ApptRow = typeof spaAppointmentsTable.$inferSelect;

function parseNum(v: any): number {
  if (v == null) return 0;
  return parseFloat(String(v));
}

function serializeAppt(
  r: ApptRow,
  spaName?: string | null,
  spaCity?: string | null,
) {
  return {
    ...r,
    amount: r.amount != null ? parseNum(r.amount) : null,
    spaName: spaName ?? null,
    spaCity: spaCity ?? null,
    createdAt:
      r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt:
      r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
    confirmedAt:
      r.confirmedAt instanceof Date
        ? r.confirmedAt.toISOString()
        : (r.confirmedAt ?? null),
    completedAt:
      r.completedAt instanceof Date
        ? r.completedAt.toISOString()
        : (r.completedAt ?? null),
    cancelledAt:
      r.cancelledAt instanceof Date
        ? r.cancelledAt.toISOString()
        : (r.cancelledAt ?? null),
  };
}

function generateRef(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let ref = "EAA-";
  for (let i = 0; i < 6; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}

async function findAppt(id: number) {
  const [a] = await db
    .select()
    .from(spaAppointmentsTable)
    .where(eq(spaAppointmentsTable.id, id));
  return a;
}

// ────────────────────────────────────────────────────────────────────────
// GET /spa-appointments/my — customer: MUST be before /:id
// ────────────────────────────────────────────────────────────────────────
router.get(
  "/spa-appointments/my",
  requireRole("customer"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const { status, page = "1", limit = "20" } = req.query as any;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, parseInt(limit, 10));
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [eq(spaAppointmentsTable.customerId, cu.id)];
    if (status) conditions.push(eq(spaAppointmentsTable.status, status as any));

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(spaAppointmentsTable)
      .where(and(...conditions));

    const rows = await db
      .select({
        appt: spaAppointmentsTable,
        spaName: spasTable.name,
        spaCity: spasTable.city,
      })
      .from(spaAppointmentsTable)
      .leftJoin(spasTable, eq(spaAppointmentsTable.spaId, spasTable.id))
      .where(and(...conditions))
      .orderBy(desc(spaAppointmentsTable.createdAt))
      .limit(limitNum)
      .offset(offset);

    res.json({
      appointments: rows.map((r) => serializeAppt(r.appt, r.spaName, r.spaCity)),
      total: countRow?.total ?? 0,
      page: pageNum,
      limit: limitNum,
    });
  },
);

// ────────────────────────────────────────────────────────────────────────
// GET /spa-appointments/admin — admin/super_admin: all appointments
// ────────────────────────────────────────────────────────────────────────
router.get(
  "/spa-appointments/admin",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const { spaId, status, search, dateFrom, dateTo, page = "1", limit = "20" } = req.query as any;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, parseInt(limit, 10));
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [];
    if (spaId) conditions.push(eq(spaAppointmentsTable.spaId, parseInt(spaId, 10)));
    if (status && status !== "all") conditions.push(eq(spaAppointmentsTable.status, status as any));
    if (dateFrom) conditions.push(sql`${spaAppointmentsTable.appointmentDate} >= ${dateFrom}`);
    if (dateTo) conditions.push(sql`${spaAppointmentsTable.appointmentDate} <= ${dateTo}`);
    if (search) {
      conditions.push(
        sql`(${spaAppointmentsTable.appointmentRef} ilike ${"%" + search + "%"} or ${spaAppointmentsTable.customerName} ilike ${"%" + search + "%"})`,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(spaAppointmentsTable)
      .where(where);

    const rows = await db
      .select({
        appt: spaAppointmentsTable,
        spaName: spasTable.name,
        spaCity: spasTable.city,
      })
      .from(spaAppointmentsTable)
      .leftJoin(spasTable, eq(spaAppointmentsTable.spaId, spasTable.id))
      .where(where)
      .orderBy(desc(spaAppointmentsTable.createdAt))
      .limit(limitNum)
      .offset(offset);

    res.json({
      appointments: rows.map((r) => serializeAppt(r.appt, r.spaName, r.spaCity)),
      total: countRow?.total ?? 0,
      page: pageNum,
      limit: limitNum,
    });
  },
);

// ────────────────────────────────────────────────────────────────────────
// GET /spa-appointments/owner — spa_owner: MUST be before /:id
// ────────────────────────────────────────────────────────────────────────
router.get(
  "/spa-appointments/owner",
  requireRole("spa_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const { spaId, status, page = "1", limit = "20" } = req.query as any;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, parseInt(limit, 10));
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [eq(spaAppointmentsTable.ownerId, cu.id)];
    if (spaId) conditions.push(eq(spaAppointmentsTable.spaId, parseInt(spaId, 10)));
    if (status) conditions.push(eq(spaAppointmentsTable.status, status as any));

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(spaAppointmentsTable)
      .where(and(...conditions));

    const rows = await db
      .select({
        appt: spaAppointmentsTable,
        spaName: spasTable.name,
        spaCity: spasTable.city,
      })
      .from(spaAppointmentsTable)
      .leftJoin(spasTable, eq(spaAppointmentsTable.spaId, spasTable.id))
      .where(and(...conditions))
      .orderBy(desc(spaAppointmentsTable.createdAt))
      .limit(limitNum)
      .offset(offset);

    res.json({
      appointments: rows.map((r) => serializeAppt(r.appt, r.spaName, r.spaCity)),
      total: countRow?.total ?? 0,
      page: pageNum,
      limit: limitNum,
    });
  },
);

// ────────────────────────────────────────────────────────────────────────
// POST /spa-appointments — customer books
// ────────────────────────────────────────────────────────────────────────
router.post(
  "/spa-appointments",
  requireRole("customer"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const {
      spaId,
      serviceId,
      customerName,
      customerMobile,
      customerEmail,
      serviceName,
      appointmentDate,
      appointmentTime,
      numberOfPersons = 1,
      specialRequest,
    } = req.body;

    if (!spaId || isNaN(parseInt(spaId, 10))) {
      res.status(400).json({ error: "Valid spa required" }); return;
    }
    if (!customerName?.trim()) {
      res.status(400).json({ error: "Customer name required" }); return;
    }
    if (!customerMobile?.trim()) {
      res.status(400).json({ error: "Mobile number required" }); return;
    }
    if (!serviceName?.trim()) {
      res.status(400).json({ error: "Service name required" }); return;
    }
    if (!appointmentDate?.trim()) {
      res.status(400).json({ error: "Date required" }); return;
    }
    if (!appointmentTime?.trim()) {
      res.status(400).json({ error: "Time required" }); return;
    }

    const [spa] = await db
      .select()
      .from(spasTable)
      .where(and(eq(spasTable.id, parseInt(spaId, 10)), isNull(spasTable.deletedAt)));

    if (!spa) { res.status(404).json({ error: "Spa not found" }); return; }
    if (spa.status !== "approved") {
      res.status(400).json({ error: "Spa is not accepting appointments" }); return;
    }

    // Get service price if serviceId provided
    let amount: string | null = null;
    if (serviceId) {
      const [svc] = await db
        .select()
        .from(spaServicesTable)
        .where(eq(spaServicesTable.id, parseInt(serviceId, 10)));
      if (svc) amount = String(parseFloat(String(svc.price)) * parseInt(String(numberOfPersons), 10));
    }

    // Generate unique ref
    let appointmentRef = generateRef();
    let tries = 0;
    while (tries < 10) {
      const [existing] = await db
        .select({ id: spaAppointmentsTable.id })
        .from(spaAppointmentsTable)
        .where(eq(spaAppointmentsTable.appointmentRef, appointmentRef));
      if (!existing) break;
      appointmentRef = generateRef();
      tries++;
    }

    const [appt] = await db
      .insert(spaAppointmentsTable)
      .values({
        appointmentRef,
        spaId: parseInt(spaId, 10),
        serviceId: serviceId ? parseInt(serviceId, 10) : null,
        customerId: cu.id,
        ownerId: spa.ownerId,
        customerName: customerName.trim(),
        customerMobile: customerMobile.trim(),
        customerEmail: customerEmail?.trim() ?? null,
        serviceName: serviceName.trim(),
        appointmentDate: appointmentDate.trim(),
        appointmentTime: appointmentTime.trim(),
        numberOfPersons: parseInt(String(numberOfPersons), 10) || 1,
        specialRequest: specialRequest?.trim() ?? null,
        amount,
        status: "pending",
      })
      .returning();

    await logActivity(req, "spa_appointment_created", `Spa appointment ${appointmentRef} created`, cu.id, cu.role);

    // Notify spa owner
    await createNotification(
      spa.ownerId,
      "New Spa Appointment",
      `${customerName} booked "${serviceName}" at ${spa.name} on ${appointmentDate}.`,
      "general",
    );
    // Notify customer
    await createNotification(
      cu.id,
      "Appointment Submitted",
      `Your appointment for "${serviceName}" at ${spa.name} (Ref: ${appointmentRef}) has been submitted.`,
      "general",
    );

    res.status(201).json(serializeAppt(appt, spa.name, spa.city));
  },
);

// ────────────────────────────────────────────────────────────────────────
// GET /spa-appointments/:id
// ────────────────────────────────────────────────────────────────────────
router.get(
  "/spa-appointments/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const a = await findAppt(id);
    if (!a) { res.status(404).json({ error: "Appointment not found" }); return; }

    // Only owner, customer, or admin can see
    if (
      cu.role !== "admin" &&
      cu.role !== "super_admin" &&
      a.customerId !== cu.id &&
      a.ownerId !== cu.id
    ) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const [spa] = await db.select({ name: spasTable.name, city: spasTable.city })
      .from(spasTable).where(eq(spasTable.id, a.spaId));

    res.json(serializeAppt(a, spa?.name, spa?.city));
  },
);

// ────────────────────────────────────────────────────────────────────────
// PUT /spa-appointments/:id/confirm — spa_owner
// ────────────────────────────────────────────────────────────────────────
router.put(
  "/spa-appointments/:id/confirm",
  requireRole("spa_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const a = await findAppt(id);
    if (!a) { res.status(404).json({ error: "Appointment not found" }); return; }
    if (a.ownerId !== cu.id) { res.status(403).json({ error: "Forbidden" }); return; }
    if (a.status !== "pending") { res.status(400).json({ error: "Only pending appointments can be confirmed" }); return; }

    const [updated] = await db
      .update(spaAppointmentsTable)
      .set({ status: "confirmed", confirmedAt: new Date() })
      .where(eq(spaAppointmentsTable.id, id))
      .returning();

    await createNotification(
      a.customerId,
      "Appointment Confirmed! 🎉",
      `Your appointment for "${a.serviceName}" (Ref: ${a.appointmentRef}) has been confirmed.`,
      "general",
    );

    const [spa] = await db.select({ name: spasTable.name, city: spasTable.city })
      .from(spasTable).where(eq(spasTable.id, a.spaId));
    res.json(serializeAppt(updated, spa?.name, spa?.city));
  },
);

// ────────────────────────────────────────────────────────────────────────
// PUT /spa-appointments/:id/reject — spa_owner
// ────────────────────────────────────────────────────────────────────────
router.put(
  "/spa-appointments/:id/reject",
  requireRole("spa_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const a = await findAppt(id);
    if (!a) { res.status(404).json({ error: "Appointment not found" }); return; }
    if (a.ownerId !== cu.id) { res.status(403).json({ error: "Forbidden" }); return; }
    if (!["pending", "confirmed"].includes(a.status)) {
      res.status(400).json({ error: "Cannot reject this appointment" }); return;
    }

    const { rejectionReason } = req.body;
    const [updated] = await db
      .update(spaAppointmentsTable)
      .set({ status: "rejected", rejectionReason: rejectionReason?.trim() ?? null })
      .where(eq(spaAppointmentsTable.id, id))
      .returning();

    await createNotification(
      a.customerId,
      "Appointment Rejected",
      `Your appointment for "${a.serviceName}" (Ref: ${a.appointmentRef}) was rejected. Reason: ${rejectionReason ?? "No reason provided"}.`,
      "general",
    );

    const [spa] = await db.select({ name: spasTable.name, city: spasTable.city })
      .from(spasTable).where(eq(spasTable.id, a.spaId));
    res.json(serializeAppt(updated, spa?.name, spa?.city));
  },
);

// ────────────────────────────────────────────────────────────────────────
// PUT /spa-appointments/:id/complete — spa_owner
// ────────────────────────────────────────────────────────────────────────
router.put(
  "/spa-appointments/:id/complete",
  requireRole("spa_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const a = await findAppt(id);
    if (!a) { res.status(404).json({ error: "Appointment not found" }); return; }
    if (a.ownerId !== cu.id) { res.status(403).json({ error: "Forbidden" }); return; }
    if (a.status !== "confirmed") { res.status(400).json({ error: "Only confirmed appointments can be completed" }); return; }

    const [updated] = await db
      .update(spaAppointmentsTable)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(spaAppointmentsTable.id, id))
      .returning();

    await createNotification(
      a.customerId,
      "Appointment Completed",
      `Your appointment for "${a.serviceName}" (Ref: ${a.appointmentRef}) is marked as completed. Thank you!`,
      "general",
    );

    const [spa] = await db.select({ name: spasTable.name, city: spasTable.city })
      .from(spasTable).where(eq(spasTable.id, a.spaId));
    res.json(serializeAppt(updated, spa?.name, spa?.city));
  },
);

// ────────────────────────────────────────────────────────────────────────
// PUT /spa-appointments/:id/cancel — customer
// ────────────────────────────────────────────────────────────────────────
router.put(
  "/spa-appointments/:id/cancel",
  requireRole("customer"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const a = await findAppt(id);
    if (!a) { res.status(404).json({ error: "Appointment not found" }); return; }
    if (a.customerId !== cu.id) { res.status(403).json({ error: "Forbidden" }); return; }
    if (["completed", "cancelled", "rejected"].includes(a.status)) {
      res.status(400).json({ error: "Cannot cancel this appointment" }); return;
    }

    const { cancelReason } = req.body;
    const [updated] = await db
      .update(spaAppointmentsTable)
      .set({
        status: "cancelled",
        cancelReason: cancelReason?.trim() ?? null,
        cancelledAt: new Date(),
      })
      .where(eq(spaAppointmentsTable.id, id))
      .returning();

    await createNotification(
      a.ownerId,
      "Appointment Cancelled",
      `${a.customerName} cancelled their appointment for "${a.serviceName}" (Ref: ${a.appointmentRef}).`,
      "general",
    );

    const [spa] = await db.select({ name: spasTable.name, city: spasTable.city })
      .from(spasTable).where(eq(spasTable.id, a.spaId));
    res.json(serializeAppt(updated, spa?.name, spa?.city));
  },
);

export default router;
