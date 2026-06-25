import { Router } from "express";
import { db, spaReviewsTable, spasTable, usersTable } from "@workspace/db";
import { eq, and, ilike, sql, or, desc, asc, inArray } from "drizzle-orm";
import { logActivity, createNotification } from "../lib/auth";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

type ReviewRow = typeof spaReviewsTable.$inferSelect;

function parseNum(v: any): number {
  if (v == null) return 0;
  return parseFloat(String(v));
}

function serializeReview(r: ReviewRow) {
  return {
    ...r,
    reviewPhotos: Array.isArray(r.reviewPhotos) ? r.reviewPhotos : [],
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
    ownerRepliedAt: r.ownerRepliedAt instanceof Date ? r.ownerRepliedAt.toISOString() : r.ownerRepliedAt ?? null,
  };
}

function validateRating(v: any, name: string): number {
  const n = parseInt(String(v), 10);
  if (isNaN(n) || n < 1 || n > 5) throw new Error(`${name} must be 1–5`);
  return n;
}

// ───────────────────────────────────────────────────────
// GET /spa-reviews/:spaId — public reviews
// ───────────────────────────────────────────────────────
router.get("/spa-reviews/:spaId", async (req, res): Promise<void> => {
  const spaId = parseInt(String(req.params.spaId), 10);
  const { sort = "newest", rating, page = "1", limit = "10" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [
    eq(spaReviewsTable.spaId, spaId),
    eq(spaReviewsTable.status, "approved"),
  ];
  if (rating) conditions.push(eq(spaReviewsTable.overallRating, parseInt(rating, 10)));

  const sortExpr =
    sort === "oldest" ? asc(spaReviewsTable.createdAt)
    : sort === "highest" ? desc(spaReviewsTable.overallRating)
    : sort === "lowest" ? asc(spaReviewsTable.overallRating)
    : desc(spaReviewsTable.createdAt);

  const [reviews, countRes, summaryRes] = await Promise.all([
    db
      .select({
        review: spaReviewsTable,
        customerName: usersTable.fullName,
        customerPhoto: usersTable.profilePhoto,
      })
      .from(spaReviewsTable)
      .innerJoin(usersTable, eq(spaReviewsTable.customerId, usersTable.id))
      .where(and(...conditions))
      .orderBy(sortExpr)
      .limit(limitNum)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(spaReviewsTable).where(and(...conditions)),
    db
      .select({
        avgOverall: sql<number>`round(avg(${spaReviewsTable.overallRating}),2)::numeric`,
        avgService: sql<number>`round(avg(${spaReviewsTable.serviceQualityRating}),1)::numeric`,
        avgAmbience: sql<number>`round(avg(${spaReviewsTable.ambienceRating}),1)::numeric`,
        avgCleanliness: sql<number>`round(avg(${spaReviewsTable.cleanlinessRating}),1)::numeric`,
        avgValue: sql<number>`round(avg(${spaReviewsTable.valueRating}),1)::numeric`,
        avgTherapist: sql<number>`round(avg(${spaReviewsTable.therapistSkillRating}),1)::numeric`,
        total: sql<number>`count(*)::int`,
        five: sql<number>`sum(case when ${spaReviewsTable.overallRating}=5 then 1 else 0 end)::int`,
        four: sql<number>`sum(case when ${spaReviewsTable.overallRating}=4 then 1 else 0 end)::int`,
        three: sql<number>`sum(case when ${spaReviewsTable.overallRating}=3 then 1 else 0 end)::int`,
        two: sql<number>`sum(case when ${spaReviewsTable.overallRating}=2 then 1 else 0 end)::int`,
        one: sql<number>`sum(case when ${spaReviewsTable.overallRating}=1 then 1 else 0 end)::int`,
      })
      .from(spaReviewsTable)
      .where(and(eq(spaReviewsTable.spaId, spaId), eq(spaReviewsTable.status, "approved"))),
  ]);

  const s = summaryRes[0];
  res.json({
    reviews: reviews.map(({ review, customerName, customerPhoto }) => ({
      ...serializeReview(review),
      customerName,
      customerPhoto: customerPhoto ?? null,
    })),
    total: countRes[0]?.count ?? 0,
    page: pageNum,
    limit: limitNum,
    summary: {
      avgOverall: parseNum(s?.avgOverall),
      avgService: parseNum(s?.avgService),
      avgAmbience: parseNum(s?.avgAmbience),
      avgCleanliness: parseNum(s?.avgCleanliness),
      avgValue: parseNum(s?.avgValue),
      avgTherapist: parseNum(s?.avgTherapist),
      total: s?.total ?? 0,
      distribution: { 5: s?.five ?? 0, 4: s?.four ?? 0, 3: s?.three ?? 0, 2: s?.two ?? 0, 1: s?.one ?? 0 },
    },
  });
});

// ───────────────────────────────────────────────────────
// POST /spa-reviews/:spaId — create
// ───────────────────────────────────────────────────────
router.post("/spa-reviews/:spaId", requireRole("customer"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const spaId = parseInt(String(req.params.spaId), 10);
  const {
    overallRating, serviceQualityRating, ambienceRating, cleanlinessRating,
    valueRating, therapistSkillRating, reviewTitle, reviewDescription, reviewPhotos = [],
  } = req.body;

  if (!overallRating || !reviewTitle?.trim() || !reviewDescription?.trim()) {
    res.status(400).json({ error: "Ratings, title, and description are required" });
    return;
  }

  let or1, sq, ar, cl, va, ts;
  try {
    or1 = validateRating(overallRating, "Overall rating");
    sq = validateRating(serviceQualityRating, "Service quality rating");
    ar = validateRating(ambienceRating, "Ambience rating");
    cl = validateRating(cleanlinessRating, "Cleanliness rating");
    va = validateRating(valueRating, "Value rating");
    ts = validateRating(therapistSkillRating, "Therapist skill rating");
  } catch (e: any) {
    res.status(400).json({ error: e.message });
    return;
  }

  const [spa] = await db.select({ id: spasTable.id, ownerId: spasTable.ownerId }).from(spasTable).where(eq(spasTable.id, spaId));
  if (!spa) { res.status(404).json({ error: "Spa not found" }); return; }

  const photos = Array.isArray(reviewPhotos) ? reviewPhotos.slice(0, 5) : [];
  const [review] = await db.insert(spaReviewsTable).values({
    spaId,
    customerId: cu.id,
    ownerId: spa.ownerId,
    overallRating: or1,
    serviceQualityRating: sq,
    ambienceRating: ar,
    cleanlinessRating: cl,
    valueRating: va,
    therapistSkillRating: ts,
    reviewTitle: reviewTitle.trim(),
    reviewDescription: reviewDescription.trim(),
    reviewPhotos: photos,
    status: "approved",
  }).returning();

  await logActivity(req, "spa_review_created", `Review #${review.id} for spa ${spaId}`, cu.id, cu.role);
  await createNotification(cu.id, "Review Submitted ✓", "Your spa review has been submitted successfully.", "general");
  await createNotification(spa.ownerId, "New Spa Review ⭐", `A customer left a ${or1}-star review.`, "general");

  res.status(201).json(serializeReview(review));
});

// ───────────────────────────────────────────────────────
// PUT /spa-reviews/:id — update
// ───────────────────────────────────────────────────────
router.put("/spa-reviews/:id", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(String(req.params.id), 10);
  const [review] = await db.select().from(spaReviewsTable).where(eq(spaReviewsTable.id, id));
  if (!review) { res.status(404).json({ error: "Not found" }); return; }
  if (review.customerId !== cu.id && cu.role !== "admin" && cu.role !== "super_admin") {
    res.status(403).json({ error: "Access denied" }); return;
  }

  const { overallRating, serviceQualityRating, ambienceRating, cleanlinessRating, valueRating, therapistSkillRating, reviewTitle, reviewDescription, reviewPhotos } = req.body;
  const updates: any = {};
  if (overallRating != null) { try { updates.overallRating = validateRating(overallRating, "Overall"); } catch (e: any) { res.status(400).json({ error: e.message }); return; } }
  if (serviceQualityRating != null) { try { updates.serviceQualityRating = validateRating(serviceQualityRating, "Service quality"); } catch (e: any) { res.status(400).json({ error: e.message }); return; } }
  if (ambienceRating != null) { try { updates.ambienceRating = validateRating(ambienceRating, "Ambience"); } catch (e: any) { res.status(400).json({ error: e.message }); return; } }
  if (cleanlinessRating != null) { try { updates.cleanlinessRating = validateRating(cleanlinessRating, "Cleanliness"); } catch (e: any) { res.status(400).json({ error: e.message }); return; } }
  if (valueRating != null) { try { updates.valueRating = validateRating(valueRating, "Value"); } catch (e: any) { res.status(400).json({ error: e.message }); return; } }
  if (therapistSkillRating != null) { try { updates.therapistSkillRating = validateRating(therapistSkillRating, "Therapist skill"); } catch (e: any) { res.status(400).json({ error: e.message }); return; } }
  if (reviewTitle?.trim()) updates.reviewTitle = reviewTitle.trim();
  if (reviewDescription?.trim()) updates.reviewDescription = reviewDescription.trim();
  if (reviewPhotos != null) updates.reviewPhotos = Array.isArray(reviewPhotos) ? reviewPhotos.slice(0, 5) : [];

  const [updated] = await db.update(spaReviewsTable).set(updates).where(eq(spaReviewsTable.id, id)).returning();
  await logActivity(req, "spa_review_updated", `Review #${id} updated`, cu.id, cu.role);
  res.json(serializeReview(updated));
});

// ───────────────────────────────────────────────────────
// POST /spa-reviews/:id/reply — owner reply
// ───────────────────────────────────────────────────────
router.post("/spa-reviews/:id/reply", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(String(req.params.id), 10);
  const [review] = await db.select().from(spaReviewsTable).where(eq(spaReviewsTable.id, id));
  if (!review) { res.status(404).json({ error: "Not found" }); return; }
  if (review.ownerId !== cu.id && cu.role !== "admin" && cu.role !== "super_admin") {
    res.status(403).json({ error: "Access denied" }); return;
  }
  const { title, message } = req.body;
  if (!message?.trim()) { res.status(400).json({ error: "Reply message is required" }); return; }

  const [updated] = await db.update(spaReviewsTable).set({
    ownerReplyTitle: title?.trim() || null,
    ownerReplyMessage: message.trim(),
    ownerRepliedAt: new Date(),
  }).where(eq(spaReviewsTable.id, id)).returning();

  await createNotification(review.customerId, "Spa Owner Replied", "The spa owner replied to your review.", "general");
  res.json(serializeReview(updated));
});

// ───────────────────────────────────────────────────────
// GET /spa-reviews/admin — admin list
// ───────────────────────────────────────────────────────
router.get("/spa-reviews/admin", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const { spaId, rating, status, search, page = "1", limit = "15" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  if (spaId) conditions.push(eq(spaReviewsTable.spaId, parseInt(spaId, 10)));
  if (rating) conditions.push(eq(spaReviewsTable.overallRating, parseInt(rating, 10)));
  if (status) conditions.push(eq(spaReviewsTable.status, status as any));

  const baseWhere = conditions.length > 0 ? and(...conditions) : undefined;
  const searchWhere = search
    ? and(baseWhere, or(ilike(spasTable.name, `%${search}%`), ilike(usersTable.fullName, `%${search}%`)))
    : baseWhere;

  const [reviews, countRes] = await Promise.all([
    db
      .select({
        review: spaReviewsTable,
        customerName: usersTable.fullName,
        customerPhoto: usersTable.profilePhoto,
        spaName: spasTable.name,
      })
      .from(spaReviewsTable)
      .innerJoin(usersTable, eq(spaReviewsTable.customerId, usersTable.id))
      .innerJoin(spasTable, eq(spaReviewsTable.spaId, spasTable.id))
      .where(searchWhere)
      .orderBy(desc(spaReviewsTable.createdAt))
      .limit(limitNum)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(spaReviewsTable).innerJoin(usersTable, eq(spaReviewsTable.customerId, usersTable.id)).innerJoin(spasTable, eq(spaReviewsTable.spaId, spasTable.id)).where(searchWhere),
  ]);

  res.json({
    reviews: reviews.map(({ review, customerName, customerPhoto, spaName }) => ({
      ...serializeReview(review),
      customerName,
      customerPhoto: customerPhoto ?? null,
      spaName,
    })),
    total: countRes[0]?.count ?? 0,
    page: pageNum,
    limit: limitNum,
  });
});

// ───────────────────────────────────────────────────────
// DELETE /spa-reviews/:id — admin delete
// ───────────────────────────────────────────────────────
router.delete("/spa-reviews/:id", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(String(req.params.id), 10);
  const [row] = await db.delete(spaReviewsTable).where(eq(spaReviewsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  await logActivity(req, "spa_review_deleted", `Review #${id} deleted`, cu.id, cu.role);
  res.json({ message: "Deleted", id: row.id });
});

export default router;
