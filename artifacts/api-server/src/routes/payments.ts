import { Router } from "express";
import {
  db,
  paymentsTable,
  transactionsTable,
  usersTable,
  bookingsTable,
  restaurantReservationsTable,
  spaAppointmentsTable,
} from "@workspace/db";
import { eq, and, or, ilike, desc, sql, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { logActivity } from "../lib/auth";
import { createOwnerEarning } from "./earnings";

const router = Router();

function genPaymentRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `EAP-${ts}-${rand}`;
}

function genOrderId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  return `ORD-${ts}`;
}

function genTransactionRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `EAT-${ts}-${rand}`;
}

function parseNum(v: unknown): number {
  if (v == null) return 0;
  return parseFloat(String(v));
}

function serializePayment(p: typeof paymentsTable.$inferSelect) {
  return {
    ...p,
    amount: parseNum(p.amount),
    paidAmount: parseNum(p.paidAmount),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    paidAt: p.paidAt?.toISOString() ?? null,
  };
}

async function getPaymentWithDetails(paymentId: number) {
  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.id, paymentId));
  if (!payment) return null;

  const [customer] = await db
    .select({ fullName: usersTable.fullName, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, payment.customerId));

  const [owner] = await db
    .select({ fullName: usersTable.fullName })
    .from(usersTable)
    .where(eq(usersTable.id, payment.ownerId));

  const txns = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.paymentId, payment.id))
    .orderBy(desc(transactionsTable.createdAt));

  const serialized = serializePayment(payment);
  return {
    ...serialized,
    customerName: customer?.fullName ?? null,
    customerEmail: customer?.email ?? null,
    ownerName: owner?.fullName ?? null,
    transactions: txns.map((t) => ({
      ...t,
      amount: parseNum(t.amount),
      createdAt: t.createdAt.toISOString(),
    })),
    refunds: [],
  };
}

// ─────────────────────────────────────────────────
// Static routes MUST be before /payments/:ref
// ─────────────────────────────────────────────────

// GET /payments/my
router.get(
  "/payments/my",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const page = parseInt((req.query.page as string) ?? "1") || 1;
    const limit = parseInt((req.query.limit as string) ?? "20") || 20;
    const status = req.query.status as string | undefined;
    const offset = (page - 1) * limit;

    const conditions: any[] = [eq(paymentsTable.customerId, user.id)];
    if (status) conditions.push(eq(paymentsTable.paymentStatus, status as any));

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(paymentsTable)
      .where(and(...conditions));

    const rows = await db
      .select()
      .from(paymentsTable)
      .where(and(...conditions))
      .orderBy(desc(paymentsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const payments = await Promise.all(
      rows.map((p) => getPaymentWithDetails(p.id)),
    );

    const total = countRow?.count ?? 0;
    res.json({
      payments: payments.filter(Boolean),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  },
);

// GET /payments/owner
router.get(
  "/payments/owner",
  requireRole("hotel_owner", "restaurant_owner", "spa_owner"),
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const page = parseInt((req.query.page as string) ?? "1") || 1;
    const limit = parseInt((req.query.limit as string) ?? "20") || 20;
    const status = req.query.status as string | undefined;
    const bookingType = req.query.bookingType as string | undefined;
    const offset = (page - 1) * limit;

    const conditions: any[] = [eq(paymentsTable.ownerId, user.id)];
    if (status) conditions.push(eq(paymentsTable.paymentStatus, status as any));
    if (bookingType)
      conditions.push(eq(paymentsTable.bookingType, bookingType as any));

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(paymentsTable)
      .where(and(...conditions));

    const rows = await db
      .select()
      .from(paymentsTable)
      .where(and(...conditions))
      .orderBy(desc(paymentsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const payments = await Promise.all(
      rows.map((p) => getPaymentWithDetails(p.id)),
    );

    const total = countRow?.count ?? 0;
    res.json({
      payments: payments.filter(Boolean),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  },
);

// GET /payments/admin
router.get(
  "/payments/admin",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const page = parseInt((req.query.page as string) ?? "1") || 1;
    const limit = parseInt((req.query.limit as string) ?? "20") || 20;
    const status = req.query.status as string | undefined;
    const bookingType = req.query.bookingType as string | undefined;
    const search = req.query.search as string | undefined;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (status) conditions.push(eq(paymentsTable.paymentStatus, status as any));
    if (bookingType)
      conditions.push(eq(paymentsTable.bookingType, bookingType as any));
    if (search)
      conditions.push(
        or(
          ilike(paymentsTable.paymentRef, `%${search}%`),
          ilike(paymentsTable.bookingRef, `%${search}%`),
        ),
      );

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(paymentsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const rows = await db
      .select()
      .from(paymentsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(paymentsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const payments = await Promise.all(
      rows.map((p) => getPaymentWithDetails(p.id)),
    );

    const total = countRow?.count ?? 0;
    res.json({
      payments: payments.filter(Boolean),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  },
);

// GET /payments/analytics
router.get(
  "/payments/analytics",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const [summary] = await db
      .select({
        totalRevenue: sql<number>`coalesce(sum(case when ${paymentsTable.paymentStatus}='successful' then ${paymentsTable.paidAmount}::numeric else 0 end),0)`,
        successfulPayments: sql<number>`sum(case when ${paymentsTable.paymentStatus}='successful' then 1 else 0 end)::int`,
        failedPayments: sql<number>`sum(case when ${paymentsTable.paymentStatus}='failed' then 1 else 0 end)::int`,
        pendingPayments: sql<number>`sum(case when ${paymentsTable.paymentStatus}='pending' then 1 else 0 end)::int`,
        refundedAmount: sql<number>`coalesce(sum(case when ${paymentsTable.paymentStatus} in ('refunded','partially_refunded') then ${paymentsTable.paidAmount}::numeric else 0 end),0)`,
        totalTransactions: sql<number>`count(*)::int`,
      })
      .from(paymentsTable);

    const revenueByType = await db
      .select({
        bookingType: paymentsTable.bookingType,
        revenue: sql<number>`coalesce(sum(case when ${paymentsTable.paymentStatus}='successful' then ${paymentsTable.paidAmount}::numeric else 0 end),0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(paymentsTable)
      .groupBy(paymentsTable.bookingType)
      .orderBy(paymentsTable.bookingType);

    const revenueByMethod = await db
      .select({
        paymentMethod: paymentsTable.paymentMethod,
        revenue: sql<number>`coalesce(sum(case when ${paymentsTable.paymentStatus}='successful' then ${paymentsTable.paidAmount}::numeric else 0 end),0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(paymentsTable)
      .where(sql`${paymentsTable.paymentMethod} is not null`)
      .groupBy(paymentsTable.paymentMethod)
      .orderBy(desc(sql`count(*)`));

    const revenueByDay = await db
      .select({
        date: sql<string>`date(${paymentsTable.createdAt})::text`,
        revenue: sql<number>`coalesce(sum(case when ${paymentsTable.paymentStatus}='successful' then ${paymentsTable.paidAmount}::numeric else 0 end),0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(paymentsTable)
      .where(
        sql`${paymentsTable.createdAt} >= now() - interval '30 days'`,
      )
      .groupBy(sql`date(${paymentsTable.createdAt})`)
      .orderBy(sql`date(${paymentsTable.createdAt})`);

    res.json({
      totalRevenue: parseNum(summary?.totalRevenue),
      successfulPayments: summary?.successfulPayments ?? 0,
      failedPayments: summary?.failedPayments ?? 0,
      pendingPayments: summary?.pendingPayments ?? 0,
      refundedAmount: parseNum(summary?.refundedAmount),
      totalTransactions: summary?.totalTransactions ?? 0,
      revenueByType: revenueByType.map((r) => ({
        bookingType: r.bookingType,
        revenue: parseNum(r.revenue),
        count: r.count,
      })),
      revenueByMethod: revenueByMethod.map((r) => ({
        paymentMethod: r.paymentMethod ?? "unknown",
        revenue: parseNum(r.revenue),
        count: r.count,
      })),
      revenueByDay: revenueByDay.map((r) => ({
        date: r.date,
        revenue: parseNum(r.revenue),
        count: r.count,
      })),
    });
  },
);

// ─────────────────────────────────────────────────
// POST /payments — create payment record
// ─────────────────────────────────────────────────
router.post(
  "/payments",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const { bookingType, bookingId, bookingRef, ownerId, amount, paymentMode, notes } =
      req.body;

    if (!bookingType || !bookingId || !bookingRef || !ownerId || !amount || !paymentMode) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Check if a payment already exists for this booking
    const existing = await db
      .select({ id: paymentsTable.id, paymentStatus: paymentsTable.paymentStatus })
      .from(paymentsTable)
      .where(
        and(
          eq(paymentsTable.bookingType, bookingType),
          eq(paymentsTable.bookingId, bookingId),
        ),
      );

    const nonFailed = existing.filter((e) => e.paymentStatus !== "failed");
    if (nonFailed.length > 0) {
      res.status(400).json({
        error: "A payment record already exists for this booking",
      });
      return;
    }

    const [payment] = await db
      .insert(paymentsTable)
      .values({
        paymentRef: genPaymentRef(),
        bookingType,
        bookingId,
        bookingRef,
        customerId: user.id,
        ownerId,
        amount: String(amount),
        paidAmount: "0",
        currency: "INR",
        paymentMode,
        paymentStatus: "pending",
        paymentGateway: "manual",
        notes: notes ?? null,
      })
      .returning();

    await logActivity(
      req,
      "payment_created",
      `Payment ${payment.paymentRef} created for ${bookingType} booking ${bookingRef}`,
      user.id,
      user.role,
    );

    res.status(201).json(serializePayment(payment));
  },
);

// ─────────────────────────────────────────────────
// GET /payments/:ref — single payment detail
// ─────────────────────────────────────────────────
router.get(
  "/payments/:ref",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const ref = req.params.ref as string;

    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.paymentRef, ref));

    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const isOwner = payment.customerId === user.id || payment.ownerId === user.id;
    const isAdmin = ["admin", "super_admin"].includes(user.role);
    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const detail = await getPaymentWithDetails(payment.id);
    res.json(detail);
  },
);

// ─────────────────────────────────────────────────
// POST /payments/:ref/initiate — initiate payment
// ─────────────────────────────────────────────────
router.post(
  "/payments/:ref/initiate",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const ref = req.params.ref as string;

    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.paymentRef, ref));

    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    if (payment.customerId !== user.id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    if (!["pending", "failed"].includes(payment.paymentStatus)) {
      res.status(400).json({ error: "Payment cannot be initiated in its current state" });
      return;
    }

    const { paymentMethod, paymentGateway } = req.body;
    if (!paymentMethod) {
      res.status(400).json({ error: "paymentMethod is required" });
      return;
    }

    const gateway = paymentGateway ?? "manual";
    const gatewayOrderId = genOrderId();

    const [updated] = await db
      .update(paymentsTable)
      .set({
        paymentMethod,
        paymentGateway: gateway,
        gatewayOrderId,
        paymentStatus: "pending",
      })
      .where(eq(paymentsTable.id, payment.id))
      .returning();

    await logActivity(
      req,
      "payment_initiated",
      `Payment ${ref} initiated via ${paymentMethod}`,
      user.id,
      user.role,
    );

    res.json(serializePayment(updated));
  },
);

// ─────────────────────────────────────────────────
// POST /payments/:ref/confirm — confirm/complete payment
// ─────────────────────────────────────────────────
router.post(
  "/payments/:ref/confirm",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const ref = req.params.ref as string;

    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.paymentRef, ref));

    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    if (payment.customerId !== user.id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    if (payment.paymentStatus !== "pending") {
      res.status(400).json({ error: "Payment is not in pending state" });
      return;
    }

    const { gatewayPaymentId, gatewaySignature, paidAmount } = req.body;
    const confirmedAmount = paidAmount ?? parseNum(payment.amount);
    const now = new Date();

    const [updated] = await db
      .update(paymentsTable)
      .set({
        paymentStatus: "successful",
        paidAmount: String(confirmedAmount),
        paidAt: now,
        gatewayPaymentId: gatewayPaymentId ?? null,
        gatewaySignature: gatewaySignature ?? null,
      })
      .where(eq(paymentsTable.id, payment.id))
      .returning();

    // Create transaction record
    await db.insert(transactionsTable).values({
      transactionRef: genTransactionRef(),
      paymentId: payment.id,
      type: "payment",
      amount: String(confirmedAmount),
      description: `Payment of ₹${confirmedAmount} for ${payment.bookingType} booking ${payment.bookingRef}`,
      status: "success",
      metadata: {
        method: payment.paymentMethod,
        gateway: payment.paymentGateway,
        gatewayOrderId: payment.gatewayOrderId,
        gatewayPaymentId: gatewayPaymentId ?? null,
      },
    });

    // Auto-create owner earning record on successful payment
    try {
      await createOwnerEarning(
        payment.id,
        payment.ownerId,
        confirmedAmount,
        payment.bookingType,
      );
    } catch (err) {
      req.log.error({ err }, "Failed to create owner earning");
    }

    await logActivity(
      req,
      "payment_successful",
      `Payment ${ref} confirmed successfully — ₹${confirmedAmount}`,
      user.id,
      user.role,
    );

    res.json(serializePayment(updated));
  },
);

// ─────────────────────────────────────────────────
// POST /payments/:ref/fail — mark payment as failed
// ─────────────────────────────────────────────────
router.post(
  "/payments/:ref/fail",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const ref = req.params.ref as string;

    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.paymentRef, ref));

    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const isOwner = payment.customerId === user.id;
    const isAdmin = ["admin", "super_admin"].includes(user.role);
    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    if (payment.paymentStatus !== "pending") {
      res.status(400).json({ error: "Only pending payments can be marked as failed" });
      return;
    }

    const { reason } = req.body;

    const [updated] = await db
      .update(paymentsTable)
      .set({
        paymentStatus: "failed",
        failureReason: reason ?? "Payment failed",
      })
      .where(eq(paymentsTable.id, payment.id))
      .returning();

    await logActivity(
      req,
      "payment_failed",
      `Payment ${ref} failed: ${reason ?? "unknown reason"}`,
      user.id,
      user.role,
    );

    res.json(serializePayment(updated));
  },
);

export default router;
