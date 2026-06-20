import { Router } from "express";
import {
  db,
  payoutsTable,
  ownerEarningsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { logActivity } from "../lib/auth";

const router = Router();

function genPayoutRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `EAW-${ts}-${rand}`;
}

function parseNum(v: unknown): number {
  if (v == null) return 0;
  return parseFloat(String(v));
}

function serializePayout(p: typeof payoutsTable.$inferSelect) {
  return {
    ...p,
    amount: parseNum(p.amount),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    processedAt: p.processedAt?.toISOString() ?? null,
    paidAt: p.paidAt?.toISOString() ?? null,
  };
}

router.post(
  "/payouts",
  requireAuth,
  requireRole("hotel_owner", "restaurant_owner", "spa_owner"),
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const { amount, bankDetails, notes } = req.body as {
      amount: number;
      bankDetails: {
        accountName: string;
        accountNumber: string;
        ifscCode: string;
        bankName: string;
        upiId?: string | null;
      };
      notes?: string | null;
    };

    if (!amount || amount <= 0) {
      res.status(400).json({ error: "Amount must be positive" });
      return;
    }
    if (!bankDetails?.accountName || !bankDetails?.accountNumber || !bankDetails?.ifscCode || !bankDetails?.bankName) {
      res.status(400).json({ error: "Complete bank details required" });
      return;
    }

    const credited = await db
      .select()
      .from(ownerEarningsTable)
      .where(
        and(
          eq(ownerEarningsTable.ownerId, user.id),
          eq(ownerEarningsTable.status, "credited"),
        ),
      );
    const available = credited.reduce((s, e) => s + parseNum(e.netAmount), 0);
    if (amount > available) {
      res.status(400).json({ error: `Insufficient balance. Available: ₹${available.toFixed(2)}` });
      return;
    }

    const [payout] = await db
      .insert(payoutsTable)
      .values({
        payoutRef: genPayoutRef(),
        ownerId: user.id,
        amount: String(amount),
        bankDetails,
        notes: notes ?? null,
        status: "pending",
      })
      .returning();

    await logActivity(req, "payout_requested", `Payout of ₹${amount} requested`, user.id, user.role);
    res.status(201).json(serializePayout(payout));
  },
);

router.get(
  "/payouts/my",
  requireAuth,
  requireRole("hotel_owner", "restaurant_owner", "spa_owner"),
  async (req, res) => {
    const user = (req as any).currentUser;
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit ?? "20"))));
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const where = [eq(payoutsTable.ownerId, user.id)];
    if (status) where.push(eq(payoutsTable.status, status as "pending" | "approved" | "rejected" | "paid"));

    const [payouts, total] = await Promise.all([
      db
        .select()
        .from(payoutsTable)
        .where(and(...where))
        .orderBy(desc(payoutsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(payoutsTable).where(and(...where)),
    ]);

    res.json({ payouts: payouts.map(serializePayout), total: total[0]?.count ?? 0, page, limit });
  },
);

router.get(
  "/payouts/admin",
  requireAuth,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit ?? "20"))));
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const ownerId = req.query.ownerId ? parseInt(String(req.query.ownerId)) : undefined;

    const where = [];
    if (status) where.push(eq(payoutsTable.status, status as "pending" | "approved" | "rejected" | "paid"));
    if (ownerId) where.push(eq(payoutsTable.ownerId, ownerId));

    const whereClause = where.length ? and(...where) : undefined;

    const [rows, total] = await Promise.all([
      db
        .select({
          payout: payoutsTable,
          ownerName: usersTable.fullName,
          ownerEmail: usersTable.email,
        })
        .from(payoutsTable)
        .leftJoin(usersTable, eq(payoutsTable.ownerId, usersTable.id))
        .where(whereClause)
        .orderBy(desc(payoutsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(payoutsTable).where(whereClause),
    ]);

    const payouts = rows.map(({ payout, ownerName, ownerEmail }) => ({
      ...serializePayout(payout),
      ownerName: ownerName ?? null,
      ownerEmail: ownerEmail ?? null,
      processedByName: null,
    }));

    res.json({ payouts, total: total[0]?.count ?? 0, page, limit });
  },
);

router.patch(
  "/payouts/:ref",
  requireAuth,
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const ref = req.params.ref as string;
    const { action, rejectionReason, notes } = req.body as {
      action: "approve" | "reject" | "mark_paid";
      rejectionReason?: string | null;
      notes?: string | null;
    };

    if (!action || !["approve", "reject", "mark_paid"].includes(action)) {
      res.status(400).json({ error: "Invalid action" });
      return;
    }

    const [payout] = await db
      .select()
      .from(payoutsTable)
      .where(eq(payoutsTable.payoutRef, ref))
      .limit(1);
    if (!payout) {
      res.status(404).json({ error: "Payout not found" });
      return;
    }

    let newStatus: "pending" | "approved" | "rejected" | "paid" = payout.status;
    const update: Record<string, unknown> = {
      processedBy: user.id,
      processedAt: new Date(),
      notes: notes ?? payout.notes,
    };

    if (action === "approve") {
      newStatus = "approved";
    } else if (action === "reject") {
      newStatus = "rejected";
      update.rejectionReason = rejectionReason ?? null;
    } else if (action === "mark_paid") {
      newStatus = "paid";
      update.paidAt = new Date();
      await db
        .update(ownerEarningsTable)
        .set({ status: "withdrawn" })
        .where(
          and(
            eq(ownerEarningsTable.ownerId, payout.ownerId),
            eq(ownerEarningsTable.status, "credited"),
          ),
        );
    }

    const [updated] = await db
      .update(payoutsTable)
      .set({ ...update, status: newStatus } as any)
      .where(eq(payoutsTable.id, payout.id))
      .returning();

    await logActivity(req, `payout_${action}`, `Payout ${ref} ${action}`, user.id, user.role);

    const [owner] = await db
      .select({ fullName: usersTable.fullName, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, payout.ownerId))
      .limit(1);

    res.json({
      ...serializePayout(updated),
      ownerName: owner?.fullName ?? null,
      ownerEmail: owner?.email ?? null,
      processedByName: user.fullName ?? null,
    });
  },
);

export default router;
