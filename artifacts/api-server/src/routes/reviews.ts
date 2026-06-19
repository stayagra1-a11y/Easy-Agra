import { Router } from "express";
import {
  db,
  reviewsTable,
  bookingsTable,
  hotelsTable,
  usersTable,
} from "@workspace/db";
import {
  eq,
  and,
  ilike,
  sql,
  or,
  desc,
  asc,
  ne,
  inArray,
  isNull,
} from "drizzle-orm";
import { logActivity, createNotification } from "../lib/auth";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

type ReviewRow = typeof reviewsTable.$inferSelect;

function parseNum(v: any): number {
  if (v == null) return 0;
  return parseFloat(String(v));
}

function serializeReview(r: ReviewRow & Record<string, any>) {
  return {
    ...r,
    reviewPhotos: Array.isArray(r.reviewPhotos) ? r.reviewPhotos : [],
    reportReasons: Array.isArray(r.reportReasons) ? r.reportReasons : [],
    reportedByIds: Array.isArray(r.reportedByIds) ? r.reportedByIds : [],
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
    ownerRepliedAt: r.ownerRepliedAt instanceof Date ? r.ownerRepliedAt.toISOString() : r.ownerRepliedAt ?? null,
    editableUntil: r.editableUntil instanceof Date ? r.editableUntil.toISOString() : r.editableUntil ?? null,
  };
}

async function findReview(id: number) {
  const [r] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
  return r;
}

function validateRating(v: any, name: string): number {
  const n = parseInt(String(v), 10);
  if (isNaN(n) || n < 1 || n > 5) throw new Error(`${name} must be 1–5`);
  return n;
}

// ─────────────────────────────────────────────────
// GET /reviews/stats  (admin/super_admin) — BEFORE /:id
// ─────────────────────────────────────────────────
router.get(
  "/reviews/stats",
  requireRole("admin", "super_admin"),
  async (_req, res): Promise<void> => {
    const [row] = await db
      .select({
        total: sql<number>`count(*)::int`,
        approved: sql<number>`sum(case when ${reviewsTable.status}='approved' then 1 else 0 end)::int`,
        hidden: sql<number>`sum(case when ${reviewsTable.status}='hidden' then 1 else 0 end)::int`,
        removed: sql<number>`sum(case when ${reviewsTable.status}='removed' then 1 else 0 end)::int`,
        reported: sql<number>`sum(case when ${reviewsTable.reportStatus}='pending' then 1 else 0 end)::int`,
        avgRating: sql<number>`coalesce(round(avg(${reviewsTable.overallRating}),2),0)::numeric`,
        fiveStar: sql<number>`sum(case when ${reviewsTable.overallRating}=5 then 1 else 0 end)::int`,
        fourStar: sql<number>`sum(case when ${reviewsTable.overallRating}=4 then 1 else 0 end)::int`,
        threeStar: sql<number>`sum(case when ${reviewsTable.overallRating}=3 then 1 else 0 end)::int`,
        twoStar: sql<number>`sum(case when ${reviewsTable.overallRating}=2 then 1 else 0 end)::int`,
        oneStar: sql<number>`sum(case when ${reviewsTable.overallRating}=1 then 1 else 0 end)::int`,
      })
      .from(reviewsTable);

    res.json({
      total: row?.total ?? 0,
      approved: row?.approved ?? 0,
      hidden: row?.hidden ?? 0,
      removed: row?.removed ?? 0,
      reported: row?.reported ?? 0,
      avgRating: parseNum(row?.avgRating),
      distribution: {
        5: row?.fiveStar ?? 0,
        4: row?.fourStar ?? 0,
        3: row?.threeStar ?? 0,
        2: row?.twoStar ?? 0,
        1: row?.oneStar ?? 0,
      },
    });
  },
);

// ─────────────────────────────────────────────────
// GET /reviews/eligible-bookings — BEFORE /:id
// ─────────────────────────────────────────────────
router.get(
  "/reviews/eligible-bookings",
  requireRole("customer"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;

    const eligibleBookings = await db
      .select({
        bookingId: bookingsTable.id,
        bookingRef: bookingsTable.bookingRef,
        hotelId: bookingsTable.hotelId,
        hotelName: hotelsTable.name,
        checkInDate: bookingsTable.checkInDate,
        checkOutDate: bookingsTable.checkOutDate,
        checkedOutAt: bookingsTable.checkedOutAt,
        existingReview: reviewsTable.id,
      })
      .from(bookingsTable)
      .innerJoin(hotelsTable, eq(bookingsTable.hotelId, hotelsTable.id))
      .leftJoin(reviewsTable, eq(reviewsTable.bookingId, bookingsTable.id))
      .where(
        and(
          eq(bookingsTable.customerId, cu.id),
          eq(bookingsTable.status, "checked_out"),
        ),
      )
      .orderBy(desc(bookingsTable.checkedOutAt));

    res.json(
      eligibleBookings.map((b) => ({
        bookingId: b.bookingId,
        bookingRef: b.bookingRef,
        hotelId: b.hotelId,
        hotelName: b.hotelName,
        checkInDate: b.checkInDate,
        checkOutDate: b.checkOutDate,
        checkedOutAt: b.checkedOutAt?.toISOString() ?? null,
        alreadyReviewed: b.existingReview !== null,
        existingReviewId: b.existingReview,
      })),
    );
  },
);

// ─────────────────────────────────────────────────
// GET /reviews/top-hotels — public, BEFORE /:id
// ─────────────────────────────────────────────────
router.get("/reviews/top-hotels", async (req, res): Promise<void> => {
  const limit = Math.min(20, parseInt(String(req.query.limit ?? "10"), 10));

  const rows = await db
    .select({
      hotelId: reviewsTable.hotelId,
      hotelName: hotelsTable.name,
      hotelCity: hotelsTable.city,
      hotelCoverPhoto: hotelsTable.coverPhoto,
      avgRating: sql<number>`round(avg(${reviewsTable.overallRating}),2)::numeric`,
      reviewCount: sql<number>`count(*)::int`,
      avgCleanliness: sql<number>`round(avg(${reviewsTable.cleanlinessRating}),1)::numeric`,
      avgRoomQuality: sql<number>`round(avg(${reviewsTable.roomQualityRating}),1)::numeric`,
      avgStaff: sql<number>`round(avg(${reviewsTable.staffRating}),1)::numeric`,
      avgLocation: sql<number>`round(avg(${reviewsTable.locationRating}),1)::numeric`,
      avgValue: sql<number>`round(avg(${reviewsTable.valueRating}),1)::numeric`,
      fiveStar: sql<number>`sum(case when ${reviewsTable.overallRating}=5 then 1 else 0 end)::int`,
    })
    .from(reviewsTable)
    .innerJoin(hotelsTable, eq(reviewsTable.hotelId, hotelsTable.id))
    .where(eq(reviewsTable.status, "approved"))
    .groupBy(reviewsTable.hotelId, hotelsTable.name, hotelsTable.city, hotelsTable.coverPhoto)
    .having(sql`count(*) >= 1`)
    .orderBy(
      desc(sql`round(avg(${reviewsTable.overallRating}),2)`),
      desc(sql`count(*)`),
    )
    .limit(limit);

  res.json(
    rows.map((r) => ({
      hotelId: r.hotelId,
      hotelName: r.hotelName,
      hotelCity: r.hotelCity,
      hotelCoverPhoto: r.hotelCoverPhoto,
      avgRating: parseNum(r.avgRating),
      reviewCount: r.reviewCount,
      avgCleanliness: parseNum(r.avgCleanliness),
      avgRoomQuality: parseNum(r.avgRoomQuality),
      avgStaff: parseNum(r.avgStaff),
      avgLocation: parseNum(r.avgLocation),
      avgValue: parseNum(r.avgValue),
      positivePct: r.reviewCount > 0 ? Math.round((r.fiveStar / r.reviewCount) * 100) : 0,
    })),
  );
});

// ─────────────────────────────────────────────────
// GET /reviews/hotel/:hotelId — public, BEFORE /:id
// ─────────────────────────────────────────────────
router.get("/reviews/hotel/:hotelId", async (req, res): Promise<void> => {
  const hotelId = parseInt(req.params.hotelId, 10);
  const { sort = "newest", rating, page = "1", limit = "10" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [
    eq(reviewsTable.hotelId, hotelId),
    eq(reviewsTable.status, "approved"),
  ];
  if (rating) conditions.push(eq(reviewsTable.overallRating, parseInt(rating, 10)));
  const where = and(...conditions);

  const sortExpr =
    sort === "oldest" ? asc(reviewsTable.createdAt)
    : sort === "highest" ? desc(reviewsTable.overallRating)
    : sort === "lowest" ? asc(reviewsTable.overallRating)
    : desc(reviewsTable.createdAt);

  const [reviews, countRes, summaryRes] = await Promise.all([
    db
      .select({
        review: reviewsTable,
        customerName: usersTable.fullName,
        customerPhoto: usersTable.profilePhoto,
      })
      .from(reviewsTable)
      .innerJoin(usersTable, eq(reviewsTable.customerId, usersTable.id))
      .where(where)
      .orderBy(sortExpr)
      .limit(limitNum)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(reviewsTable).where(where),
    db
      .select({
        avgOverall: sql<number>`round(avg(${reviewsTable.overallRating}),2)::numeric`,
        avgCleanliness: sql<number>`round(avg(${reviewsTable.cleanlinessRating}),1)::numeric`,
        avgRoomQuality: sql<number>`round(avg(${reviewsTable.roomQualityRating}),1)::numeric`,
        avgStaff: sql<number>`round(avg(${reviewsTable.staffRating}),1)::numeric`,
        avgLocation: sql<number>`round(avg(${reviewsTable.locationRating}),1)::numeric`,
        avgValue: sql<number>`round(avg(${reviewsTable.valueRating}),1)::numeric`,
        total: sql<number>`count(*)::int`,
        five: sql<number>`sum(case when ${reviewsTable.overallRating}=5 then 1 else 0 end)::int`,
        four: sql<number>`sum(case when ${reviewsTable.overallRating}=4 then 1 else 0 end)::int`,
        three: sql<number>`sum(case when ${reviewsTable.overallRating}=3 then 1 else 0 end)::int`,
        two: sql<number>`sum(case when ${reviewsTable.overallRating}=2 then 1 else 0 end)::int`,
        one: sql<number>`sum(case when ${reviewsTable.overallRating}=1 then 1 else 0 end)::int`,
      })
      .from(reviewsTable)
      .where(and(eq(reviewsTable.hotelId, hotelId), eq(reviewsTable.status, "approved"))),
  ]);

  const s = summaryRes[0];
  res.json({
    reviews: reviews.map(({ review, customerName, customerPhoto }) => ({
      ...serializeReview(review as any),
      customerName,
      customerPhoto: customerPhoto ?? null,
    })),
    total: countRes[0]?.count ?? 0,
    page: pageNum,
    limit: limitNum,
    summary: {
      avgOverall: parseNum(s?.avgOverall),
      avgCleanliness: parseNum(s?.avgCleanliness),
      avgRoomQuality: parseNum(s?.avgRoomQuality),
      avgStaff: parseNum(s?.avgStaff),
      avgLocation: parseNum(s?.avgLocation),
      avgValue: parseNum(s?.avgValue),
      total: s?.total ?? 0,
      distribution: {
        5: s?.five ?? 0, 4: s?.four ?? 0, 3: s?.three ?? 0,
        2: s?.two ?? 0, 1: s?.one ?? 0,
      },
    },
  });
});

// ─────────────────────────────────────────────────
// GET /reviews — list
// ─────────────────────────────────────────────────
router.get("/reviews", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const {
    hotelId, customerId, rating, status, reportStatus,
    search, sort = "newest", page = "1", limit = "15",
  } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  if (cu.role === "customer") conditions.push(eq(reviewsTable.customerId, cu.id));
  if (cu.role === "hotel_owner") conditions.push(eq(reviewsTable.ownerId, cu.id));
  if (hotelId) conditions.push(eq(reviewsTable.hotelId, parseInt(hotelId, 10)));
  if (customerId) conditions.push(eq(reviewsTable.customerId, parseInt(customerId, 10)));
  if (rating) conditions.push(eq(reviewsTable.overallRating, parseInt(rating, 10)));
  if (status) conditions.push(eq(reviewsTable.status, status as any));
  if (reportStatus) conditions.push(eq(reviewsTable.reportStatus, reportStatus as any));

  const sortExpr =
    sort === "oldest" ? asc(reviewsTable.createdAt)
    : sort === "highest" ? desc(reviewsTable.overallRating)
    : sort === "lowest" ? asc(reviewsTable.overallRating)
    : desc(reviewsTable.createdAt);

  const baseWhere = conditions.length > 0 ? and(...conditions) : undefined;
  const searchWhere = search
    ? and(baseWhere, or(ilike(hotelsTable.name, `%${search}%`), ilike(usersTable.fullName, `%${search}%`)))
    : baseWhere;

  const [reviews, countRes] = await Promise.all([
    db
      .select({
        review: reviewsTable,
        customerName: usersTable.fullName,
        customerPhoto: usersTable.profilePhoto,
        hotelName: hotelsTable.name,
      })
      .from(reviewsTable)
      .innerJoin(usersTable, eq(reviewsTable.customerId, usersTable.id))
      .innerJoin(hotelsTable, eq(reviewsTable.hotelId, hotelsTable.id))
      .where(searchWhere)
      .orderBy(sortExpr)
      .limit(limitNum)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviewsTable)
      .innerJoin(usersTable, eq(reviewsTable.customerId, usersTable.id))
      .innerJoin(hotelsTable, eq(reviewsTable.hotelId, hotelsTable.id))
      .where(searchWhere),
  ]);

  res.json({
    reviews: reviews.map(({ review, customerName, customerPhoto, hotelName }) => ({
      ...serializeReview(review as any),
      customerName,
      customerPhoto: customerPhoto ?? null,
      hotelName,
    })),
    total: countRes[0]?.count ?? 0,
    page: pageNum,
    limit: limitNum,
  });
});

// ─────────────────────────────────────────────────
// POST /reviews — create
// ─────────────────────────────────────────────────
router.post("/reviews", requireRole("customer"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const {
    bookingId, overallRating, cleanlinessRating, roomQualityRating,
    staffRating, locationRating, valueRating,
    reviewTitle, reviewDescription, reviewPhotos = [],
  } = req.body;

  if (!bookingId || !overallRating || !reviewTitle?.trim() || !reviewDescription?.trim()) {
    res.status(400).json({ error: "bookingId, ratings, reviewTitle, and reviewDescription are required" });
    return;
  }

  // Validate all ratings
  let or1: number, cl: number, rq: number, st: number, lo: number, va: number;
  try {
    or1 = validateRating(overallRating, "Overall rating");
    cl = validateRating(cleanlinessRating, "Cleanliness rating");
    rq = validateRating(roomQualityRating, "Room quality rating");
    st = validateRating(staffRating, "Staff rating");
    lo = validateRating(locationRating, "Location rating");
    va = validateRating(valueRating, "Value rating");
  } catch (e: any) {
    res.status(400).json({ error: e.message });
    return;
  }

  // Check booking exists and is owned by this customer
  const [booking] = await db
    .select({ id: bookingsTable.id, status: bookingsTable.status, customerId: bookingsTable.customerId, hotelId: bookingsTable.hotelId, ownerId: bookingsTable.ownerId })
    .from(bookingsTable)
    .where(eq(bookingsTable.id, parseInt(String(bookingId), 10)));

  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
  if (booking.customerId !== cu.id) { res.status(403).json({ error: "Access denied" }); return; }
  if (booking.status !== "checked_out") { res.status(400).json({ error: "You can only review completed stays" }); return; }

  // Check duplicate
  const [existing] = await db.select({ id: reviewsTable.id }).from(reviewsTable).where(eq(reviewsTable.bookingId, booking.id));
  if (existing) { res.status(409).json({ error: "You have already reviewed this booking" }); return; }

  const editableUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const photos = Array.isArray(reviewPhotos) ? reviewPhotos.slice(0, 5) : [];

  const [review] = await db
    .insert(reviewsTable)
    .values({
      bookingId: booking.id,
      hotelId: booking.hotelId,
      customerId: cu.id,
      ownerId: booking.ownerId,
      overallRating: or1,
      cleanlinessRating: cl,
      roomQualityRating: rq,
      staffRating: st,
      locationRating: lo,
      valueRating: va,
      reviewTitle: reviewTitle.trim(),
      reviewDescription: reviewDescription.trim(),
      reviewPhotos: photos,
      editableUntil,
      status: "approved",
    })
    .returning();

  await logActivity(req, "review_created", `Review #${review.id} submitted for hotel ${booking.hotelId}`, cu.id, cu.role);
  await createNotification(cu.id, "Review Submitted ✓", `Your review has been submitted successfully.`, "general");
  await createNotification(booking.ownerId, "New Review Received ⭐", `A guest left a ${or1}-star review. Check your reviews dashboard.`, "general");

  // Notify admins of new review
  const admins = await db.select({ id: usersTable.id }).from(usersTable).where(inArray(usersTable.role, ["admin", "super_admin"]));
  await Promise.all(admins.map((a) => createNotification(a.id, "New Hotel Review", `Guest rated hotel ${or1}⭐. Review ID: ${review.id}.`, "general")));

  res.status(201).json(serializeReview(review as any));
});

// ─────────────────────────────────────────────────
// GET /reviews/:id
// ─────────────────────────────────────────────────
router.get("/reviews/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const review = await findReview(id);
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }
  res.json(serializeReview(review as any));
});

// ─────────────────────────────────────────────────
// PUT /reviews/:id — edit (within 7 days)
// ─────────────────────────────────────────────────
router.put("/reviews/:id", requireRole("customer"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id, 10);
  const review = await findReview(id);
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }
  if (review.customerId !== cu.id) { res.status(403).json({ error: "Access denied" }); return; }
  if (review.editableUntil && new Date() > review.editableUntil) {
    res.status(403).json({ error: "Review can only be edited within 7 days of submission" }); return;
  }
  if (review.status === "removed") { res.status(403).json({ error: "This review has been removed" }); return; }

  const {
    overallRating, cleanlinessRating, roomQualityRating,
    staffRating, locationRating, valueRating,
    reviewTitle, reviewDescription, reviewPhotos,
  } = req.body;

  let or1: number, cl: number, rq: number, st: number, lo: number, va: number;
  try {
    or1 = validateRating(overallRating, "Overall rating");
    cl = validateRating(cleanlinessRating, "Cleanliness rating");
    rq = validateRating(roomQualityRating, "Room quality rating");
    st = validateRating(staffRating, "Staff rating");
    lo = validateRating(locationRating, "Location rating");
    va = validateRating(valueRating, "Value rating");
  } catch (e: any) {
    res.status(400).json({ error: e.message }); return;
  }

  const [updated] = await db
    .update(reviewsTable)
    .set({
      overallRating: or1, cleanlinessRating: cl, roomQualityRating: rq,
      staffRating: st, locationRating: lo, valueRating: va,
      reviewTitle: reviewTitle.trim(),
      reviewDescription: reviewDescription.trim(),
      reviewPhotos: Array.isArray(reviewPhotos) ? reviewPhotos.slice(0, 5) : (review.reviewPhotos ?? []),
    })
    .where(eq(reviewsTable.id, id))
    .returning();

  await logActivity(req, "review_updated", `Review #${id} updated`, cu.id, cu.role);
  res.json(serializeReview(updated as any));
});

// ─────────────────────────────────────────────────
// DELETE /reviews/:id (within 7 days or admin)
// ─────────────────────────────────────────────────
router.delete("/reviews/:id", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id, 10);
  const review = await findReview(id);
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }

  const isOwner = review.customerId === cu.id;
  const isAdmin = cu.role === "admin" || cu.role === "super_admin";
  if (!isOwner && !isAdmin) { res.status(403).json({ error: "Access denied" }); return; }
  if (isOwner && !isAdmin && review.editableUntil && new Date() > review.editableUntil) {
    res.status(403).json({ error: "Review can only be deleted within 7 days" }); return;
  }

  if (cu.role === "super_admin") {
    await db.update(reviewsTable).set({ status: "removed" }).where(eq(reviewsTable.id, id));
  } else {
    await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
  }
  await logActivity(req, "review_deleted", `Review #${id} deleted`, cu.id, cu.role);
  res.json({ success: true });
});

// ─────────────────────────────────────────────────
// POST /reviews/:id/reply — hotel owner reply
// ─────────────────────────────────────────────────
router.post("/reviews/:id/reply", requireRole("hotel_owner", "admin", "super_admin"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id, 10);
  const { replyTitle, replyMessage } = req.body;
  if (!replyMessage?.trim()) { res.status(400).json({ error: "Reply message is required" }); return; }

  const review = await findReview(id);
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }
  if (cu.role === "hotel_owner" && review.ownerId !== cu.id) {
    res.status(403).json({ error: "Access denied" }); return;
  }

  const [updated] = await db
    .update(reviewsTable)
    .set({ ownerReplyTitle: replyTitle?.trim() ?? null, ownerReplyMessage: replyMessage.trim(), ownerRepliedAt: new Date() })
    .where(eq(reviewsTable.id, id))
    .returning();

  await logActivity(req, "review_replied", `Reply added to review #${id}`, cu.id, cu.role);
  await createNotification(review.customerId, "Owner Replied to Your Review", `The hotel owner has responded to your review.`, "general");
  res.json(serializeReview(updated as any));
});

// ─────────────────────────────────────────────────
// POST /reviews/:id/report
// ─────────────────────────────────────────────────
router.post("/reviews/:id/report", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id, 10);
  const { reason } = req.body;
  if (!reason?.trim()) { res.status(400).json({ error: "Report reason is required" }); return; }

  const review = await findReview(id);
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }

  const alreadyReported = Array.isArray(review.reportedByIds) && (review.reportedByIds as number[]).includes(cu.id);
  if (alreadyReported) { res.status(409).json({ error: "You have already reported this review" }); return; }

  const newReasons = [...(Array.isArray(review.reportReasons) ? review.reportReasons as string[] : []), String(reason).trim()];
  const newIds = [...(Array.isArray(review.reportedByIds) ? review.reportedByIds as number[] : []), cu.id];

  await db
    .update(reviewsTable)
    .set({ reportCount: (review.reportCount ?? 0) + 1, reportReasons: newReasons, reportedByIds: newIds, reportStatus: "pending" })
    .where(eq(reviewsTable.id, id));

  await logActivity(req, "review_reported", `Review #${id} reported: ${reason}`, cu.id, cu.role);
  const admins = await db.select({ id: usersTable.id }).from(usersTable).where(inArray(usersTable.role, ["admin", "super_admin"]));
  await Promise.all(admins.map((a) => createNotification(a.id, "Review Reported", `Review #${id} has been reported. Reason: ${reason}.`, "general")));
  res.json({ success: true });
});

// ─────────────────────────────────────────────────
// POST /reviews/:id/hide — admin
// ─────────────────────────────────────────────────
router.post("/reviews/:id/hide", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id, 10);
  const review = await findReview(id);
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }

  const [updated] = await db
    .update(reviewsTable)
    .set({ status: "hidden", reportStatus: "reviewed" })
    .where(eq(reviewsTable.id, id))
    .returning();

  await logActivity(req, "review_hidden", `Review #${id} hidden by admin`, cu.id, cu.role);
  await createNotification(review.customerId, "Review Hidden", `Your review has been hidden by the moderator.`, "general");
  res.json(serializeReview(updated as any));
});

// ─────────────────────────────────────────────────
// POST /reviews/:id/restore — super admin
// ─────────────────────────────────────────────────
router.post("/reviews/:id/restore", requireRole("super_admin"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id, 10);
  const review = await findReview(id);
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }

  const [updated] = await db
    .update(reviewsTable)
    .set({ status: "approved", reportStatus: "reviewed", reportCount: 0 })
    .where(eq(reviewsTable.id, id))
    .returning();

  await logActivity(req, "review_restored", `Review #${id} restored`, cu.id, cu.role);
  res.json(serializeReview(updated as any));
});

// ─────────────────────────────────────────────────
// POST /reviews/:id/remove — super admin permanent
// ─────────────────────────────────────────────────
router.post("/reviews/:id/remove", requireRole("super_admin"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id, 10);
  const review = await findReview(id);
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }

  await db.update(reviewsTable).set({ status: "removed", reportStatus: "reviewed" }).where(eq(reviewsTable.id, id));
  await logActivity(req, "review_removed", `Review #${id} permanently removed`, cu.id, cu.role);
  await createNotification(review.customerId, "Review Removed", `Your review was removed by the platform administrator.`, "general");
  res.json({ success: true });
});

export default router;
