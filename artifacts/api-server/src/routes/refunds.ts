import { Router } from "express";
import {
  db,
  paymentsTable,
  refundsTable,
  transactionsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { logActivity } from "../lib/auth";

const router = Router();

function genRefundRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `EAR-${ts}-${rand}`;
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

function serializeRefund(r: typeof refundsTable.$inferSelect) {
  return {
    ...r,
    amount: parseNum(r.amount),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    processedAt: r.processedAt?.toISOString() ?? null,
  };
}

async function getRefundWithDetails(refundId: number) {
  const [refund] = await db
    .select()
    .from(refundsTable)
    .where(eq(refundsTable.id, refundId));
  if (!refund) return null;

  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.id, refund.paymentId));

  const [requestedByUser] = await db
    .select({ fullName: usersTable.fullName })
    .from(usersTable)
    .where(eq(usersTable.id, refund.requestedBy));

  let processedByName: string | null = null;
  if (refund.processedBy) {
    const [pbUser] = await db
      .select({ fullName: usersTable.fullName })
      .from(usersTable)
      .where(eq(usersTable.id, refund.processedBy));
    processedByName = pbUser?.fullName ?? null;
  }

  const serializedRefund = serializeRefund(refund);

  return {
    ...serializedRefund,
    requestedByName: requestedByUser?.fullName ?? null,
    processedByName,
    payment: payment
      ? {
          ...payment,
          amount: parseNum(payment.amount),
          paidAmount: parseNum(payment.paidAmount),
          createdAt: payment.createdAt.toISOString(),
          updatedAt: payment.updatedAt.toISOString(),
          paidAt: payment.paidAt?.toISOString() ?? null,
        }
      : null,
  };
}

// ─────────────────────────────────────────────────
// GET /refunds/my  MUST be before /refunds/:id
// ─────────────────────────────────────────────────
router.get(
  "/refunds/my",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;

    const rows = await db
      .select()
      .from(refundsTable)
      .where(eq(refundsTable.requestedBy, user.id))
      .orderBy(desc(refundsTable.createdAt));

    const refunds = await Promise.all(rows.map((r) => getRefundWithDetails(r.id)));

    res.json({ refunds: refunds.filter(Boolean), total: refunds.length });
  },
);

// ─────────────────────────────────────────────────
// GET /refunds/admin  MUST be before /refunds/:id
// ─────────────────────────────────────────────────
router.get(
  "/refunds/admin",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const status = req.query.status as string | undefined;

    const conditions = status
      ? [eq(refundsTable.status, status as any)]
      : [];

    const rows = await db
      .select()
      .from(refundsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(refundsTable.createdAt));

    const refunds = await Promise.all(rows.map((r) => getRefundWithDetails(r.id)));

    res.json({ refunds: refunds.filter(Boolean), total: refunds.length });
  },
);

// ─────────────────────────────────────────────────
// POST /refunds — request a refund
// ─────────────────────────────────────────────────
router.post(
  "/refunds",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const { paymentId, amount, reason } = req.body;

    if (!paymentId || !amount || !reason) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Verify payment exists and belongs to this customer
    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, paymentId));

    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    if (payment.customerId !== user.id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    if (payment.paymentStatus !== "successful") {
      res.status(400).json({
        error: "Refunds can only be requested for successful payments",
      });
      return;
    }

    // Check refund amount doesn't exceed paid amount
    const maxRefund = parseNum(payment.paidAmount);
    if (parseNum(amount) > maxRefund) {
      res.status(400).json({
        error: `Refund amount cannot exceed paid amount of ₹${maxRefund}`,
      });
      return;
    }

    // Check no pending refund already exists
    const [existingRefund] = await db
      .select({ id: refundsTable.id })
      .from(refundsTable)
      .where(
        and(
          eq(refundsTable.paymentId, paymentId),
          eq(refundsTable.status, "pending"),
        ),
      );

    if (existingRefund) {
      res.status(400).json({
        error: "A refund request is already pending for this payment",
      });
      return;
    }

    const [refund] = await db
      .insert(refundsTable)
      .values({
        refundRef: genRefundRef(),
        paymentId,
        amount: String(amount),
        reason,
        status: "pending",
        requestedBy: user.id,
      })
      .returning();

    await logActivity(
      req,
      "refund_requested",
      `Refund of ₹${amount} requested for payment ${payment.paymentRef}`,
      user.id,
      user.role,
    );

    res.status(201).json(serializeRefund(refund));
  },
);

// ─────────────────────────────────────────────────
// PUT /refunds/:id — approve or reject refund (admin)
// ─────────────────────────────────────────────────
router.put(
  "/refunds/:id",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const id = parseInt(req.params.id as string);

    const [refund] = await db
      .select()
      .from(refundsTable)
      .where(eq(refundsTable.id, id));

    if (!refund) {
      res.status(404).json({ error: "Refund not found" });
      return;
    }

    if (refund.status !== "pending") {
      res.status(400).json({ error: "Refund already processed" });
      return;
    }

    const { action, rejectionReason, notes } = req.body;
    if (!action || !["approve", "reject"].includes(action)) {
      res.status(400).json({ error: "action must be 'approve' or 'reject'" });
      return;
    }

    const now = new Date();
    const newStatus = action === "approve" ? "approved" : "rejected";

    const [updated] = await db
      .update(refundsTable)
      .set({
        status: newStatus,
        processedBy: user.id,
        processedAt: now,
        rejectionReason: action === "reject" ? (rejectionReason ?? null) : null,
        notes: notes ?? null,
      })
      .where(eq(refundsTable.id, id))
      .returning();

    // If approved, update payment status and create transaction
    if (action === "approve") {
      const [payment] = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.id, refund.paymentId));

      if (payment) {
        const refundAmount = parseNum(refund.amount);
        const paidAmount = parseNum(payment.paidAmount);
        const isFullRefund = refundAmount >= paidAmount;

        await db
          .update(paymentsTable)
          .set({
            paymentStatus: isFullRefund ? "refunded" : "partially_refunded",
          })
          .where(eq(paymentsTable.id, payment.id));

        await db.insert(transactionsTable).values({
          transactionRef: genTransactionRef(),
          paymentId: payment.id,
          type: isFullRefund ? "refund" : "partial_refund",
          amount: String(refund.amount),
          description: `Refund of ₹${refund.amount} approved for payment ${payment.paymentRef}`,
          status: "success",
          metadata: { refundRef: refund.refundRef, approvedBy: user.id },
        });
      }
    }

    await logActivity(
      req,
      `refund_${newStatus}`,
      `Refund ${refund.refundRef} ${newStatus}`,
      user.id,
      user.role,
    );

    res.json(serializeRefund(updated));
  },
);

// ─────────────────────────────────────────────────
// GET /refunds/analytics — super admin analytics
// MUST be before /refunds/:ref
// ─────────────────────────────────────────────────
router.get(
  "/refunds/analytics",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const rows = await db.select().from(refundsTable);

    const totalRequests = rows.length;
    const approvedCount = rows.filter((r) => r.status === "approved").length;
    const rejectedCount = rows.filter((r) => r.status === "rejected").length;
    const processedCount = rows.filter((r) => r.status === "processed").length;
    const pendingCount = rows.filter((r) => r.status === "pending").length;
    const totalRefundedAmount = rows
      .filter((r) => r.status === "approved" || r.status === "processed")
      .reduce((sum, r) => sum + parseNum(r.amount), 0);
    const approvalRate =
      totalRequests > 0
        ? Math.round(((approvedCount + processedCount) / totalRequests) * 100)
        : 0;

    res.json({
      totalRequests,
      approvedCount,
      rejectedCount,
      processedCount,
      pendingCount,
      totalRefundedAmount,
      approvalRate,
    });
  },
);

// ─────────────────────────────────────────────────
// GET /refunds/:ref — get single refund by refundRef string
// ─────────────────────────────────────────────────
router.get(
  "/refunds/:ref",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const [refund] = await db
      .select()
      .from(refundsTable)
      .where(eq(refundsTable.refundRef, req.params.ref as string));

    if (!refund) {
      res.status(404).json({ error: "Refund not found" });
      return;
    }

    const isAdmin = ["admin", "super_admin"].includes(user.role);
    const isOwner = refund.requestedBy === user.id || refund.customerId === user.id;
    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const detail = await getRefundWithDetails(refund.id);
    res.json(detail);
  },
);

// ─────────────────────────────────────────────────
// PATCH /refunds/admin/:ref/override — super admin override
// ─────────────────────────────────────────────────
router.patch(
  "/refunds/admin/:ref/override",
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const [refund] = await db
      .select()
      .from(refundsTable)
      .where(eq(refundsTable.refundRef, req.params.ref as string));

    if (!refund) {
      res.status(404).json({ error: "Refund not found" });
      return;
    }

    const { action, reason } = req.body as {
      action: "approve" | "reject";
      reason?: string;
    };
    if (!action || !["approve", "reject"].includes(action)) {
      res.status(400).json({ error: "action must be approve or reject" });
      return;
    }

    const now = new Date();
    const newStatus = action === "approve" ? "approved" : "rejected";

    const [updated] = await db
      .update(refundsTable)
      .set({
        status: newStatus,
        processedBy: user.id,
        processedAt: now,
        overriddenBy: user.id,
        adminNotes: reason ?? null,
        rejectionReason: action === "reject" ? (reason ?? null) : null,
      })
      .where(eq(refundsTable.id, refund.id))
      .returning();

    if (action === "approve") {
      const [payment] = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.id, refund.paymentId));

      if (payment) {
        const refundAmount = parseNum(refund.amount);
        const paidAmount = parseNum(payment.paidAmount);
        const isFullRefund = refundAmount >= paidAmount;

        await db
          .update(paymentsTable)
          .set({ paymentStatus: isFullRefund ? "refunded" : "partially_refunded" })
          .where(eq(paymentsTable.id, payment.id));

        await db.insert(transactionsTable).values({
          transactionRef: genTransactionRef(),
          paymentId: payment.id,
          type: isFullRefund ? "refund" : "partial_refund",
          amount: String(refund.amount),
          description: `Override refund of ₹${refund.amount} by super admin for ${payment.paymentRef}`,
          status: "success",
          metadata: { refundRef: refund.refundRef, overriddenBy: user.id },
        });
      }
    }

    await logActivity(
      req,
      `refund_override_${newStatus}`,
      `Refund ${refund.refundRef} overridden to ${newStatus} by super admin`,
      user.id,
      user.role,
    );

    res.json(serializeRefund(updated));
  },
);

export default router;
