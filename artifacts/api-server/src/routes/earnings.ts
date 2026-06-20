import { Router } from "express";
import {
  db,
  ownerEarningsTable,
  paymentsTable,
  usersTable,
  commissionConfigsTable,
} from "@workspace/db";
import { eq, and, desc, sql, gte, lte, count } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

function parseNum(v: unknown): number {
  if (v == null) return 0;
  return parseFloat(String(v));
}

function genEarningRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `EAE-${ts}-${rand}`;
}

function serializeEarning(e: typeof ownerEarningsTable.$inferSelect) {
  return {
    ...e,
    grossAmount: parseNum(e.grossAmount),
    commissionRate: parseNum(e.commissionRate),
    commissionAmount: parseNum(e.commissionAmount),
    netAmount: parseNum(e.netAmount),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    creditedAt: e.creditedAt?.toISOString() ?? null,
  };
}

export async function createOwnerEarning(
  paymentId: number,
  ownerId: number,
  grossAmount: number,
  bookingType: "hotel" | "restaurant" | "spa",
): Promise<void> {
  const [config] = await db
    .select()
    .from(commissionConfigsTable)
    .where(eq(commissionConfigsTable.bookingType, bookingType))
    .limit(1);
  const rate = config ? parseNum(config.rate) : 10;
  const commissionAmount = parseFloat(((grossAmount * rate) / 100).toFixed(2));
  const netAmount = parseFloat((grossAmount - commissionAmount).toFixed(2));
  await db.insert(ownerEarningsTable).values({
    earningRef: genEarningRef(),
    paymentId,
    ownerId,
    bookingType,
    grossAmount: String(grossAmount),
    commissionRate: String(rate),
    commissionAmount: String(commissionAmount),
    netAmount: String(netAmount),
    status: "credited",
    creditedAt: new Date(),
  });
}

router.get(
  "/earnings/owner",
  requireAuth,
  requireRole("hotel_owner", "restaurant_owner", "spa_owner"),
  async (req, res) => {
    const user = (req as any).currentUser;
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit ?? "20"))));
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const where = [eq(ownerEarningsTable.ownerId, user.id)];
    if (status) where.push(eq(ownerEarningsTable.status, status as "pending" | "credited" | "withdrawn"));
    if (from) where.push(gte(ownerEarningsTable.createdAt, new Date(from)));
    if (to) where.push(lte(ownerEarningsTable.createdAt, new Date(to)));

    const [earningsRows, totalRows, allEarnings] = await Promise.all([
      db
        .select({
          earning: ownerEarningsTable,
          paymentRef: paymentsTable.paymentRef,
        })
        .from(ownerEarningsTable)
        .leftJoin(paymentsTable, eq(ownerEarningsTable.paymentId, paymentsTable.id))
        .where(and(...where))
        .orderBy(desc(ownerEarningsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(ownerEarningsTable)
        .where(and(...where)),
      db
        .select()
        .from(ownerEarningsTable)
        .where(eq(ownerEarningsTable.ownerId, user.id)),
    ]);

    const totalEarnings = allEarnings.reduce((s, e) => s + parseNum(e.netAmount), 0);
    const pendingEarnings = allEarnings.filter((e) => e.status === "pending").reduce((s, e) => s + parseNum(e.netAmount), 0);
    const creditedEarnings = allEarnings.filter((e) => e.status === "credited").reduce((s, e) => s + parseNum(e.netAmount), 0);
    const withdrawnEarnings = allEarnings.filter((e) => e.status === "withdrawn").reduce((s, e) => s + parseNum(e.netAmount), 0);
    const totalCommission = allEarnings.reduce((s, e) => s + parseNum(e.commissionAmount), 0);
    const totalGross = allEarnings.reduce((s, e) => s + parseNum(e.grossAmount), 0);

    const monthMap = new Map<string, { gross: number; commission: number; net: number }>();
    for (const e of allEarnings) {
      const m = e.createdAt.toISOString().substring(0, 7);
      const cur = monthMap.get(m) ?? { gross: 0, commission: 0, net: 0 };
      cur.gross += parseNum(e.grossAmount);
      cur.commission += parseNum(e.commissionAmount);
      cur.net += parseNum(e.netAmount);
      monthMap.set(m, cur);
    }
    const monthlyRevenue = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v }));

    const typeMap = new Map<string, { gross: number; commission: number; net: number; count: number }>();
    for (const e of allEarnings) {
      const bt = e.bookingType;
      const cur = typeMap.get(bt) ?? { gross: 0, commission: 0, net: 0, count: 0 };
      cur.gross += parseNum(e.grossAmount);
      cur.commission += parseNum(e.commissionAmount);
      cur.net += parseNum(e.netAmount);
      cur.count += 1;
      typeMap.set(bt, cur);
    }
    const byBookingType = Array.from(typeMap.entries()).map(([bookingType, v]) => ({ bookingType, ...v }));

    const earnings = earningsRows.map(({ earning, paymentRef }) => ({
      ...serializeEarning(earning),
      paymentRef: paymentRef ?? null,
      ownerName: null,
    }));

    res.json({
      summary: {
        totalEarnings,
        pendingEarnings,
        creditedEarnings,
        withdrawnEarnings,
        totalCommission,
        totalGross,
        monthlyRevenue,
        byBookingType,
      },
      earnings,
      total: totalRows[0]?.count ?? 0,
      page,
      limit,
    });
  },
);

router.get(
  "/earnings/admin",
  requireAuth,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit ?? "20"))));
    const offset = (page - 1) * limit;
    const ownerId = req.query.ownerId ? parseInt(String(req.query.ownerId)) : undefined;
    const bookingType = req.query.bookingType as string | undefined;
    const status = req.query.status as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const where = [];
    if (ownerId) where.push(eq(ownerEarningsTable.ownerId, ownerId));
    if (bookingType) where.push(eq(ownerEarningsTable.bookingType, bookingType as "hotel" | "restaurant" | "spa"));
    if (status) where.push(eq(ownerEarningsTable.status, status as "pending" | "credited" | "withdrawn"));
    if (from) where.push(gte(ownerEarningsTable.createdAt, new Date(from)));
    if (to) where.push(lte(ownerEarningsTable.createdAt, new Date(to)));

    const whereClause = where.length ? and(...where) : undefined;

    const [earningsRows, totalRows] = await Promise.all([
      db
        .select({
          earning: ownerEarningsTable,
          paymentRef: paymentsTable.paymentRef,
          ownerName: usersTable.fullName,
        })
        .from(ownerEarningsTable)
        .leftJoin(paymentsTable, eq(ownerEarningsTable.paymentId, paymentsTable.id))
        .leftJoin(usersTable, eq(ownerEarningsTable.ownerId, usersTable.id))
        .where(whereClause)
        .orderBy(desc(ownerEarningsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(ownerEarningsTable).where(whereClause),
    ]);

    const earnings = earningsRows.map(({ earning, paymentRef, ownerName }) => ({
      ...serializeEarning(earning),
      paymentRef: paymentRef ?? null,
      ownerName: ownerName ?? null,
    }));

    res.json({ earnings, total: totalRows[0]?.count ?? 0, page, limit });
  },
);

router.get(
  "/earnings/analytics",
  requireAuth,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const where = [];
    if (from) where.push(gte(ownerEarningsTable.createdAt, new Date(from)));
    if (to) where.push(lte(ownerEarningsTable.createdAt, new Date(to)));

    const whereClause = where.length ? and(...where) : undefined;

    const [allEarnings, topOwners] = await Promise.all([
      db.select().from(ownerEarningsTable).where(whereClause),
      db
        .select({
          ownerId: ownerEarningsTable.ownerId,
          ownerName: usersTable.fullName,
          bookingType: ownerEarningsTable.bookingType,
          totalEarnings: sql<number>`cast(sum(${ownerEarningsTable.netAmount}) as float)`,
        })
        .from(ownerEarningsTable)
        .leftJoin(usersTable, eq(ownerEarningsTable.ownerId, usersTable.id))
        .where(whereClause)
        .groupBy(ownerEarningsTable.ownerId, usersTable.fullName, ownerEarningsTable.bookingType)
        .orderBy(desc(sql`sum(${ownerEarningsTable.netAmount})`))
        .limit(10),
    ]);

    const totalPlatformRevenue = allEarnings.reduce((s, e) => s + parseNum(e.grossAmount), 0);
    const totalCommissionEarned = allEarnings.reduce((s, e) => s + parseNum(e.commissionAmount), 0);
    const totalOwnerPayouts = allEarnings.filter((e) => e.status === "withdrawn").reduce((s, e) => s + parseNum(e.netAmount), 0);
    const pendingPayouts = allEarnings.filter((e) => e.status === "credited").reduce((s, e) => s + parseNum(e.netAmount), 0);

    const typeMap = new Map<string, { gross: number; commission: number; net: number; count: number }>();
    for (const e of allEarnings) {
      const bt = e.bookingType;
      const cur = typeMap.get(bt) ?? { gross: 0, commission: 0, net: 0, count: 0 };
      cur.gross += parseNum(e.grossAmount);
      cur.commission += parseNum(e.commissionAmount);
      cur.net += parseNum(e.netAmount);
      cur.count += 1;
      typeMap.set(bt, cur);
    }
    const earningsByType = Array.from(typeMap.entries()).map(([bookingType, v]) => ({ bookingType, ...v }));

    const monthMap = new Map<string, { commission: number; gross: number }>();
    for (const e of allEarnings) {
      const m = e.createdAt.toISOString().substring(0, 7);
      const cur = monthMap.get(m) ?? { commission: 0, gross: 0 };
      cur.commission += parseNum(e.commissionAmount);
      cur.gross += parseNum(e.grossAmount);
      monthMap.set(m, cur);
    }
    const monthlyCommission = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v }));

    res.json({
      totalPlatformRevenue,
      totalCommissionEarned,
      totalOwnerPayouts,
      pendingPayouts,
      earningsByType,
      monthlyCommission,
      topOwners: topOwners.map((o) => ({
        ownerId: o.ownerId,
        ownerName: o.ownerName ?? "Unknown",
        totalEarnings: o.totalEarnings ?? 0,
        bookingType: o.bookingType,
      })),
    });
  },
);

export default router;
