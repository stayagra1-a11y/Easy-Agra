import { Router } from "express";
import {
  db,
  ownerEarningsTable,
  paymentsTable,
  usersTable,
  refundsTable,
  bookingsTable,
  hotelsTable,
  cancellationsTable,
} from "@workspace/db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { requireRole } from "../middlewares/requireAuth";

const router = Router();

function parseNum(v: unknown): number {
  if (v == null) return 0;
  return parseFloat(String(v));
}

async function buildRevenueReport(
  from: string | undefined,
  to: string | undefined,
  filterOwnerId: number | undefined,
  filterBookingType: string | undefined,
) {
  const where = [];
  if (from) where.push(gte(ownerEarningsTable.createdAt, new Date(from)));
  if (to) where.push(lte(ownerEarningsTable.createdAt, new Date(to)));
  if (filterOwnerId) where.push(eq(ownerEarningsTable.ownerId, filterOwnerId));
  if (filterBookingType) {
    where.push(
      eq(
        ownerEarningsTable.bookingType,
        filterBookingType as "hotel" | "restaurant" | "spa",
      ),
    );
  }

  const whereClause = where.length ? and(...where) : undefined;

  const rows = await db
    .select({
      earning: ownerEarningsTable,
      paymentRef: paymentsTable.paymentRef,
      ownerName: usersTable.fullName,
    })
    .from(ownerEarningsTable)
    .leftJoin(paymentsTable, eq(ownerEarningsTable.paymentId, paymentsTable.id))
    .leftJoin(usersTable, eq(ownerEarningsTable.ownerId, usersTable.id))
    .where(whereClause)
    .orderBy(desc(ownerEarningsTable.createdAt));

  const totalRevenue = rows.reduce((s, r) => s + parseNum(r.earning.grossAmount), 0);
  const totalCommission = rows.reduce((s, r) => s + parseNum(r.earning.commissionAmount), 0);
  const totalOwnerEarnings = rows.reduce((s, r) => s + parseNum(r.earning.netAmount), 0);
  const totalPayouts = rows
    .filter((r) => r.earning.status === "withdrawn")
    .reduce((s, r) => s + parseNum(r.earning.netAmount), 0);
  const totalBookings = rows.length;

  const typeMap = new Map<
    string,
    { revenue: number; commission: number; ownerEarnings: number; bookings: number }
  >();
  for (const r of rows) {
    const bt = r.earning.bookingType;
    const cur = typeMap.get(bt) ?? { revenue: 0, commission: 0, ownerEarnings: 0, bookings: 0 };
    cur.revenue += parseNum(r.earning.grossAmount);
    cur.commission += parseNum(r.earning.commissionAmount);
    cur.ownerEarnings += parseNum(r.earning.netAmount);
    cur.bookings += 1;
    typeMap.set(bt, cur);
  }
  const byType = Array.from(typeMap.entries()).map(([bookingType, v]) => ({ bookingType, ...v }));

  const monthMap = new Map<
    string,
    { revenue: number; commission: number; ownerEarnings: number }
  >();
  for (const r of rows) {
    const m = r.earning.createdAt.toISOString().substring(0, 7);
    const cur = monthMap.get(m) ?? { revenue: 0, commission: 0, ownerEarnings: 0 };
    cur.revenue += parseNum(r.earning.grossAmount);
    cur.commission += parseNum(r.earning.commissionAmount);
    cur.ownerEarnings += parseNum(r.earning.netAmount);
    monthMap.set(m, cur);
  }
  const monthly = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));

  const reportRows = rows.map((r) => ({
    date: r.earning.createdAt.toISOString().substring(0, 10),
    paymentRef: r.paymentRef ?? "—",
    bookingType: r.earning.bookingType,
    gross: parseNum(r.earning.grossAmount),
    commission: parseNum(r.earning.commissionAmount),
    net: parseNum(r.earning.netAmount),
    ownerName: r.ownerName ?? "Unknown",
    status: r.earning.status,
  }));

  return {
    generatedAt: new Date().toISOString(),
    period: { from: from ?? "all-time", to: to ?? "all-time" },
    summary: { totalRevenue, totalCommission, totalOwnerEarnings, totalPayouts, totalBookings },
    byType,
    monthly,
    rows: reportRows,
  };
}

router.get(
  "/reports/revenue",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const { from, to, bookingType } = req.query as Record<string, string>;
    const report = await buildRevenueReport(from, to, undefined, bookingType);
    res.json(report);
  },
);

router.get(
  "/reports/commission",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const { from, to, bookingType } = req.query as Record<string, string>;
    const report = await buildRevenueReport(from, to, undefined, bookingType);
    res.json(report);
  },
);

router.get(
  "/reports/earnings",
  requireRole("hotel_owner", "restaurant_owner", "spa_owner", "admin", "super_admin"),
  async (req, res) => {
    const user = (req as any).currentUser;
    const { from, to } = req.query as Record<string, string>;
    const ownerIdParam = req.query.ownerId ? parseInt(String(req.query.ownerId)) : undefined;
    const isAdmin = user.role === "admin" || user.role === "super_admin";
    const ownerId = isAdmin ? ownerIdParam : (user.id as number);
    const report = await buildRevenueReport(from, to, ownerId, undefined);
    res.json(report);
  },
);

router.get(
  "/admin/reports/users",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const [byRole, byStatus, total, recent] = await Promise.all([
      db.select({ role: usersTable.role, count: sql<number>`count(*)::int` })
        .from(usersTable).groupBy(usersTable.role),
      db.select({ status: usersTable.status, count: sql<number>`count(*)::int` })
        .from(usersTable).groupBy(usersTable.status),
      db.select({ count: sql<number>`count(*)::int` }).from(usersTable),
      db.select({ role: usersTable.role, count: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(gte(usersTable.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
        .groupBy(usersTable.role),
    ]);
    res.json({ total: total[0]?.count ?? 0, byRole, byStatus, recentSignups: recent });
  },
);

router.get(
  "/admin/reports/bookings",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const { from, to } = req.query as Record<string, string>;
    const where = [];
    if (from) where.push(gte(paymentsTable.createdAt, new Date(from)));
    if (to) where.push(lte(paymentsTable.createdAt, new Date(to)));
    const whereClause = where.length ? and(...where) : undefined;

    const [byType, byStatus, total, hotelRows] = await Promise.all([
      db.select({ bookingType: paymentsTable.bookingType, count: sql<number>`count(*)::int`, totalAmount: sql<string>`sum(amount)::text` })
        .from(paymentsTable).where(whereClause).groupBy(paymentsTable.bookingType),
      db.select({ status: paymentsTable.paymentStatus, count: sql<number>`count(*)::int` })
        .from(paymentsTable).where(whereClause).groupBy(paymentsTable.paymentStatus),
      db.select({ count: sql<number>`count(*)::int` }).from(paymentsTable).where(whereClause),
      db.select({
        id: bookingsTable.id,
        bookingRef: bookingsTable.bookingRef,
        hotelName: hotelsTable.name,
        customerName: usersTable.fullName,
        status: bookingsTable.status,
        finalAmount: bookingsTable.finalAmount,
        createdAt: bookingsTable.createdAt,
      }).from(bookingsTable)
        .leftJoin(hotelsTable, eq(bookingsTable.hotelId, hotelsTable.id))
        .leftJoin(usersTable, eq(bookingsTable.customerId, usersTable.id))
        .where(
          from || to
            ? and(
                ...(from ? [gte(bookingsTable.createdAt, new Date(from))] : []),
                ...(to ? [lte(bookingsTable.createdAt, new Date(to))] : []),
              )
            : undefined,
        )
        .orderBy(desc(bookingsTable.createdAt))
        .limit(50),
    ]);

    res.json({
      generatedAt: new Date().toISOString(),
      period: { from: from ?? "all-time", to: to ?? "all-time" },
      total: total[0]?.count ?? 0,
      byType,
      byStatus,
      recentHotelBookings: hotelRows,
    });
  },
);

router.get(
  "/admin/reports/refunds",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const { from, to } = req.query as Record<string, string>;
    const payWhere = [];
    if (from) payWhere.push(gte(refundsTable.createdAt, new Date(from)));
    if (to) payWhere.push(lte(refundsTable.createdAt, new Date(to)));
    const payWhereClause = payWhere.length ? and(...payWhere) : undefined;

    const cancelWhere = [];
    if (from) cancelWhere.push(gte(cancellationsTable.createdAt, new Date(from)));
    if (to) cancelWhere.push(lte(cancellationsTable.createdAt, new Date(to)));
    const cancelWhereClause = cancelWhere.length ? and(...cancelWhere) : undefined;

    const [byStatus, totalRefunds, totalCancellations, refundRows, cancelRows] = await Promise.all([
      db.select({ status: refundsTable.status, count: sql<number>`count(*)::int`, totalAmount: sql<string>`sum(amount)::text` })
        .from(refundsTable).where(payWhereClause).groupBy(refundsTable.status),
      db.select({ count: sql<number>`count(*)::int` }).from(refundsTable).where(payWhereClause),
      db.select({ count: sql<number>`count(*)::int` }).from(cancellationsTable).where(cancelWhereClause),
      db.select({
        id: refundsTable.id,
        refundRef: refundsTable.refundRef,
        refundAmount: refundsTable.amount,
        status: refundsTable.status,
        reason: refundsTable.refundReason,
        createdAt: refundsTable.createdAt,
      }).from(refundsTable).where(payWhereClause).orderBy(desc(refundsTable.createdAt)).limit(50),
      db.select({
        id: cancellationsTable.id,
        cancelRef: cancellationsTable.cancelRef,
        bookingType: cancellationsTable.bookingType,
        reason: cancellationsTable.reason,
        status: cancellationsTable.status,
        createdAt: cancellationsTable.createdAt,
      }).from(cancellationsTable).where(cancelWhereClause).orderBy(desc(cancellationsTable.createdAt)).limit(50),
    ]);

    res.json({
      generatedAt: new Date().toISOString(),
      period: { from: from ?? "all-time", to: to ?? "all-time" },
      totalRefunds: totalRefunds[0]?.count ?? 0,
      totalCancellations: totalCancellations[0]?.count ?? 0,
      byStatus,
      recentRefunds: refundRows,
      recentCancellations: cancelRows,
    });
  },
);

router.get(
  "/admin/reports/export/:type",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const raw = Array.isArray(req.params.type) ? req.params.type[0] : req.params.type;
    const { from, to } = req.query as Record<string, string>;

    if (raw === "revenue") {
      const report = await buildRevenueReport(from, to, undefined, undefined);
      const lines = [
        "Date,Payment Ref,Booking Type,Gross (₹),Commission (₹),Net (₹),Owner,Status",
        ...report.rows.map((r) =>
          [r.date, r.paymentRef, r.bookingType, r.gross.toFixed(2), r.commission.toFixed(2), r.net.toFixed(2), `"${r.ownerName}"`, r.status].join(",")
        ),
      ];
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="revenue-report-${new Date().toISOString().substring(0, 10)}.csv"`);
      res.send(lines.join("\n"));
      return;
    }

    if (raw === "users") {
      const users = await db.select({
        id: usersTable.id,
        fullName: usersTable.fullName,
        email: usersTable.email,
        role: usersTable.role,
        status: usersTable.status,
        city: usersTable.city,
        createdAt: usersTable.createdAt,
      }).from(usersTable).orderBy(desc(usersTable.createdAt));
      const lines = [
        "ID,Full Name,Email,Role,Status,City,Joined",
        ...users.map((u) =>
          [u.id, `"${u.fullName}"`, u.email, u.role, u.status, u.city || "", u.createdAt.toISOString().substring(0, 10)].join(",")
        ),
      ];
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="users-report-${new Date().toISOString().substring(0, 10)}.csv"`);
      res.send(lines.join("\n"));
      return;
    }

    if (raw === "bookings") {
      const rows = await db.select({
        bookingRef: bookingsTable.bookingRef,
        hotelName: hotelsTable.name,
        customerName: usersTable.fullName,
        status: bookingsTable.status,
        finalAmount: bookingsTable.finalAmount,
        createdAt: bookingsTable.createdAt,
      }).from(bookingsTable)
        .leftJoin(hotelsTable, eq(bookingsTable.hotelId, hotelsTable.id))
        .leftJoin(usersTable, eq(bookingsTable.customerId, usersTable.id))
        .orderBy(desc(bookingsTable.createdAt));
      const lines = [
        "Booking Ref,Hotel,Customer,Status,Amount (₹),Date",
        ...rows.map((r) =>
          [r.bookingRef, `"${r.hotelName ?? ""}"`, `"${r.customerName ?? ""}"`, r.status, parseNum(r.finalAmount).toFixed(2), r.createdAt.toISOString().substring(0, 10)].join(",")
        ),
      ];
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="bookings-report-${new Date().toISOString().substring(0, 10)}.csv"`);
      res.send(lines.join("\n"));
      return;
    }

    if (raw === "refunds") {
      const rows = await db.select({
        refundRef: refundsTable.refundRef,
        refundAmount: refundsTable.amount,
        status: refundsTable.status,
        reason: refundsTable.refundReason,
        createdAt: refundsTable.createdAt,
      }).from(refundsTable).orderBy(desc(refundsTable.createdAt));
      const lines = [
        "Refund Ref,Amount (₹),Status,Reason,Date",
        ...rows.map((r) =>
          [r.refundRef, parseNum(r.refundAmount).toFixed(2), r.status, `"${r.reason ?? ""}"`, r.createdAt.toISOString().substring(0, 10)].join(",")
        ),
      ];
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="refunds-report-${new Date().toISOString().substring(0, 10)}.csv"`);
      res.send(lines.join("\n"));
      return;
    }

    res.status(400).json({ error: `Unknown report type: ${raw}. Use revenue, users, bookings, or refunds.` });
  },
);

router.get(
  "/admin/reports/export",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const { from, to, bookingType } = req.query as Record<string, string>;
    const report = await buildRevenueReport(from, to, undefined, bookingType);

    const lines = [
      "Date,Payment Ref,Booking Type,Gross (₹),Commission (₹),Net (₹),Owner,Status",
      ...report.rows.map((r) =>
        [r.date, r.paymentRef, r.bookingType, r.gross.toFixed(2), r.commission.toFixed(2), r.net.toFixed(2), `"${r.ownerName}"`, r.status].join(",")
      ),
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="revenue-report-${new Date().toISOString().substring(0, 10)}.csv"`);
    res.send(lines.join("\n"));
  },
);

router.get(
  "/admin/reports/users/export",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const users = await db.select({
      id: usersTable.id,
      fullName: usersTable.fullName,
      email: usersTable.email,
      role: usersTable.role,
      status: usersTable.status,
      city: usersTable.city,
      createdAt: usersTable.createdAt,
    }).from(usersTable).orderBy(desc(usersTable.createdAt));

    const lines = [
      "ID,Full Name,Email,Role,Status,City,Joined",
      ...users.map((u) =>
        [u.id, `"${u.fullName}"`, u.email, u.role, u.status, u.city || "", u.createdAt.toISOString().substring(0, 10)].join(",")
      ),
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="users-report-${new Date().toISOString().substring(0, 10)}.csv"`);
    res.send(lines.join("\n"));
  },
);

export default router;
