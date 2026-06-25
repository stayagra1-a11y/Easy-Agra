import { Router } from "express";
import { db, restaurantReviewsTable, restaurantsTable, usersTable } from "@workspace/db";
import { eq, and, ilike, sql, or, desc, asc, inArray } from "drizzle-orm";
import { logActivity, createNotification } from "../lib/auth";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

type ReviewRow = typeof restaurantReviewsTable.$inferSelect;

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
// GET /restaurant-reviews/:restaurantId — public reviews
// ───────────────────────────────────────────────────────
router.get("/restaurant-reviews/:restaurantId", async (req, res): Promise<void> => {
  const restaurantId = parseInt(String(req.params.restaurantId), 10);
  const { sort = "newest", rating, page = "1", limit = "10" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [
    eq(restaurantReviewsTable.restaurantId, restaurantId),
    eq(restaurantReviewsTable.status, "approved"),
  ];
  if (rating) conditions.push(eq(restaurantReviewsTable.overallRating, parseInt(rating, 10)));

  const sortExpr =
    sort === "oldest" ? asc(restaurantReviewsTable.createdAt)
    : sort === "highest" ? desc(restaurantReviewsTable.overallRating)
    : sort === "lowest" ? asc(restaurantReviewsTable.overallRating)
    : desc(restaurantReviewsTable.createdAt);

  const [reviews, countRes, summaryRes] = await Promise.all([
    db
      .select({
        review: restaurantReviewsTable,
        customerName: usersTable.fullName,
        customerPhoto: usersTable.profilePhoto,
      })
      .from(restaurantReviewsTable)
      .innerJoin(usersTable, eq(restaurantReviewsTable.customerId, usersTable.id))
      .where(and(...conditions))
      .orderBy(sortExpr)
      .limit(limitNum)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(restaurantReviewsTable).where(and(...conditions)),
    db
      .select({
        avgOverall: sql<number>`round(avg(${restaurantReviewsTable.overallRating}),2)::numeric`,
        avgFood: sql<number>`round(avg(${restaurantReviewsTable.foodQualityRating}),1)::numeric`,
        avgService: sql<number>`round(avg(${restaurantReviewsTable.serviceRating}),1)::numeric`,
        avgAmbience: sql<number>`round(avg(${restaurantReviewsTable.ambienceRating}),1)::numeric`,
        avgCleanliness: sql<number>`round(avg(${restaurantReviewsTable.cleanlinessRating}),1)::numeric`,
        avgValue: sql<number>`round(avg(${restaurantReviewsTable.valueRating}),1)::numeric`,
        total: sql<number>`count(*)::int`,
        five: sql<number>`sum(case when ${restaurantReviewsTable.overallRating}=5 then 1 else 0 end)::int`,
        four: sql<number>`sum(case when ${restaurantReviewsTable.overallRating}=4 then 1 else 0 end)::int`,
        three: sql<number>`sum(case when ${restaurantReviewsTable.overallRating}=3 then 1 else 0 end)::int`,
        two: sql<number>`sum(case when ${restaurantReviewsTable.overallRating}=2 then 1 else 0 end)::int`,
        one: sql<number>`sum(case when ${restaurantReviewsTable.overallRating}=1 then 1 else 0 end)::int`,
      })
      .from(restaurantReviewsTable)
      .where(and(eq(restaurantReviewsTable.restaurantId, restaurantId), eq(restaurantReviewsTable.status, "approved"))),
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
      avgFood: parseNum(s?.avgFood),
      avgService: parseNum(s?.avgService),
      avgAmbience: parseNum(s?.avgAmbience),
      avgCleanliness: parseNum(s?.avgCleanliness),
      avgValue: parseNum(s?.avgValue),
      total: s?.total ?? 0,
      distribution: { 5: s?.five ?? 0, 4: s?.four ?? 0, 3: s?.three ?? 0, 2: s?.two ?? 0, 1: s?.one ?? 0 },
    },
  });
});

// ───────────────────────────────────────────────────────
// POST /restaurant-reviews/:restaurantId — create
// ───────────────────────────────────────────────────────
router.post("/restaurant-reviews/:restaurantId", requireRole("customer"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const restaurantId = parseInt(String(req.params.restaurantId), 10);
  const {
    overallRating, foodQualityRating, serviceRating, ambienceRating,
    cleanlinessRating, valueRating, reviewTitle, reviewDescription, reviewPhotos = [],
  } = req.body;

  if (!overallRating || !reviewTitle?.trim() || !reviewDescription?.trim()) {
    res.status(400).json({ error: "Ratings, title, and description are required" });
    return;
  }

  let or1, fq, sr, ar, cl, va;
  try {
    or1 = validateRating(overallRating, "Overall rating");
    fq = validateRating(foodQualityRating, "Food quality rating");
    sr = validateRating(serviceRating, "Service rating");
    ar = validateRating(ambienceRating, "Ambience rating");
    cl = validateRating(cleanlinessRating, "Cleanliness rating");
    va = validateRating(valueRating, "Value rating");
  } catch (e: any) {
    res.status(400).json({ error: e.message });
    return;
  }

  const [restaurant] = await db.select({ id: restaurantsTable.id, ownerId: restaurantsTable.ownerId }).from(restaurantsTable).where(eq(restaurantsTable.id, restaurantId));
  if (!restaurant) { res.status(404).json({ error: "Restaurant not found" }); return; }

  const photos = Array.isArray(reviewPhotos) ? reviewPhotos.slice(0, 5) : [];
  const [review] = await db.insert(restaurantReviewsTable).values({
    restaurantId,
    customerId: cu.id,
    ownerId: restaurant.ownerId,
    overallRating: or1,
    foodQualityRating: fq,
    serviceRating: sr,
    ambienceRating: ar,
    cleanlinessRating: cl,
    valueRating: va,
    reviewTitle: reviewTitle.trim(),
    reviewDescription: reviewDescription.trim(),
    reviewPhotos: photos,
    status: "approved",
  }).returning();

  await logActivity(req, "restaurant_review_created", `Review #${review.id} for restaurant ${restaurantId}`, cu.id, cu.role);
  await createNotification(cu.id, "Review Submitted ✓", "Your restaurant review has been submitted successfully.", "general");
  await createNotification(restaurant.ownerId, "New Restaurant Review ⭐", `A customer left a ${or1}-star review.`, "general");

  res.status(201).json(serializeReview(review));
});

// ───────────────────────────────────────────────────────
// PUT /restaurant-reviews/:id — update
// ───────────────────────────────────────────────────────
router.put("/restaurant-reviews/:id", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(String(req.params.id), 10);
  const [review] = await db.select().from(restaurantReviewsTable).where(eq(restaurantReviewsTable.id, id));
  if (!review) { res.status(404).json({ error: "Not found" }); return; }
  if (review.customerId !== cu.id && cu.role !== "admin" && cu.role !== "super_admin") {
    res.status(403).json({ error: "Access denied" }); return;
  }

  const { overallRating, foodQualityRating, serviceRating, ambienceRating, cleanlinessRating, valueRating, reviewTitle, reviewDescription, reviewPhotos } = req.body;
  const updates: any = {};
  if (overallRating != null) { try { updates.overallRating = validateRating(overallRating, "Overall"); } catch (e: any) { res.status(400).json({ error: e.message }); return; } }
  if (foodQualityRating != null) { try { updates.foodQualityRating = validateRating(foodQualityRating, "Food quality"); } catch (e: any) { res.status(400).json({ error: e.message }); return; } }
  if (serviceRating != null) { try { updates.serviceRating = validateRating(serviceRating, "Service"); } catch (e: any) { res.status(400).json({ error: e.message }); return; } }
  if (ambienceRating != null) { try { updates.ambienceRating = validateRating(ambienceRating, "Ambience"); } catch (e: any) { res.status(400).json({ error: e.message }); return; } }
  if (cleanlinessRating != null) { try { updates.cleanlinessRating = validateRating(cleanlinessRating, "Cleanliness"); } catch (e: any) { res.status(400).json({ error: e.message }); return; } }
  if (valueRating != null) { try { updates.valueRating = validateRating(valueRating, "Value"); } catch (e: any) { res.status(400).json({ error: e.message }); return; } }
  if (reviewTitle?.trim()) updates.reviewTitle = reviewTitle.trim();
  if (reviewDescription?.trim()) updates.reviewDescription = reviewDescription.trim();
  if (reviewPhotos != null) updates.reviewPhotos = Array.isArray(reviewPhotos) ? reviewPhotos.slice(0, 5) : [];

  const [updated] = await db.update(restaurantReviewsTable).set(updates).where(eq(restaurantReviewsTable.id, id)).returning();
  await logActivity(req, "restaurant_review_updated", `Review #${id} updated`, cu.id, cu.role);
  res.json(serializeReview(updated));
});

// ───────────────────────────────────────────────────────
// POST /restaurant-reviews/:id/reply — owner reply
// ───────────────────────────────────────────────────────
router.post("/restaurant-reviews/:id/reply", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(String(req.params.id), 10);
  const [review] = await db.select().from(restaurantReviewsTable).where(eq(restaurantReviewsTable.id, id));
  if (!review) { res.status(404).json({ error: "Not found" }); return; }
  if (review.ownerId !== cu.id && cu.role !== "admin" && cu.role !== "super_admin") {
    res.status(403).json({ error: "Access denied" }); return;
  }
  const { title, message } = req.body;
  if (!message?.trim()) { res.status(400).json({ error: "Reply message is required" }); return; }

  const [updated] = await db.update(restaurantReviewsTable).set({
    ownerReplyTitle: title?.trim() || null,
    ownerReplyMessage: message.trim(),
    ownerRepliedAt: new Date(),
  }).where(eq(restaurantReviewsTable.id, id)).returning();

  await createNotification(review.customerId, "Restaurant Owner Replied", "The restaurant owner replied to your review.", "general");
  res.json(serializeReview(updated));
});

// ───────────────────────────────────────────────────────
// GET /restaurant-reviews/admin — admin list
// ───────────────────────────────────────────────────────
router.get("/restaurant-reviews/admin", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const { restaurantId, rating, status, search, page = "1", limit = "15" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  if (restaurantId) conditions.push(eq(restaurantReviewsTable.restaurantId, parseInt(restaurantId, 10)));
  if (rating) conditions.push(eq(restaurantReviewsTable.overallRating, parseInt(rating, 10)));
  if (status) conditions.push(eq(restaurantReviewsTable.status, status as any));

  const baseWhere = conditions.length > 0 ? and(...conditions) : undefined;
  const searchWhere = search
    ? and(baseWhere, or(ilike(restaurantsTable.name, `%${search}%`), ilike(usersTable.fullName, `%${search}%`)))
    : baseWhere;

  const [reviews, countRes] = await Promise.all([
    db
      .select({
        review: restaurantReviewsTable,
        customerName: usersTable.fullName,
        customerPhoto: usersTable.profilePhoto,
        restaurantName: restaurantsTable.name,
      })
      .from(restaurantReviewsTable)
      .innerJoin(usersTable, eq(restaurantReviewsTable.customerId, usersTable.id))
      .innerJoin(restaurantsTable, eq(restaurantReviewsTable.restaurantId, restaurantsTable.id))
      .where(searchWhere)
      .orderBy(desc(restaurantReviewsTable.createdAt))
      .limit(limitNum)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(restaurantReviewsTable).innerJoin(usersTable, eq(restaurantReviewsTable.customerId, usersTable.id)).innerJoin(restaurantsTable, eq(restaurantReviewsTable.restaurantId, restaurantsTable.id)).where(searchWhere),
  ]);

  res.json({
    reviews: reviews.map(({ review, customerName, customerPhoto, restaurantName }) => ({
      ...serializeReview(review),
      customerName,
      customerPhoto: customerPhoto ?? null,
      restaurantName,
    })),
    total: countRes[0]?.count ?? 0,
    page: pageNum,
    limit: limitNum,
  });
});

// ───────────────────────────────────────────────────────
// DELETE /restaurant-reviews/:id — admin delete
// ───────────────────────────────────────────────────────
router.delete("/restaurant-reviews/:id", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(String(req.params.id), 10);
  const [row] = await db.delete(restaurantReviewsTable).where(eq(restaurantReviewsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  await logActivity(req, "restaurant_review_deleted", `Review #${id} deleted`, cu.id, cu.role);
  res.json({ message: "Deleted", id: row.id });
});

export default router;
