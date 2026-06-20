import { Router } from "express";
import { db, couponsTable } from "@workspace/db";
import { eq, ilike, and, desc, sql } from "drizzle-orm";
import { requireRole } from "../middlewares/requireAuth";
import { logActivity } from "../lib/auth";
import { z } from "zod";

const createCouponSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum(["global", "first_time", "referral", "seasonal"]).default("global"),
  discountType: z.enum(["percentage", "flat"]),
  discountValue: z.number().positive(),
  minOrderValue: z.number().min(0).optional(),
  maxDiscount: z.number().positive().optional(),
  applicableOn: z.array(z.enum(["all", "hotel", "restaurant", "spa"])).default(["all"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  maxUses: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
});

const updateCouponSchema = createCouponSchema.partial();

const router = Router();

router.get(
  "/admin/coupons",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const { search, isActive, type, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (search) conditions.push(ilike(couponsTable.code, `%${search}%`));
    if (isActive !== undefined) conditions.push(eq(couponsTable.isActive, isActive === "true"));
    if (type) conditions.push(eq(couponsTable.type, type as any));

    const where = conditions.length ? and(...conditions) : undefined;
    const [coupons, countResult] = await Promise.all([
      db.select().from(couponsTable).where(where).limit(limitNum).offset(offset).orderBy(desc(couponsTable.createdAt)),
      db.select({ count: sql<number>`count(*)::int` }).from(couponsTable).where(where),
    ]);

    res.json({ coupons, total: countResult[0]?.count ?? 0, page: pageNum, limit: limitNum });
  },
);

router.get(
  "/admin/coupons/:id",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.id, id));
    if (!coupon) { res.status(404).json({ error: "Coupon not found" }); return; }
    res.json(coupon);
  },
);

router.post(
  "/admin/coupons",
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const currentUser = (req as any).currentUser;
    const {
      code, name, description, type, discountType, discountValue,
      minOrderValue, maxDiscount, applicableOn, startDate, endDate,
      maxUses, isActive,
    } = req.body;

    if (!code || !name || !discountType || !discountValue) {
      res.status(400).json({ error: "code, name, discountType, and discountValue are required" });
      return;
    }

    const [coupon] = await db.insert(couponsTable).values({
      code: String(code).toUpperCase(),
      name,
      description,
      type: type || "global",
      discountType,
      discountValue: String(discountValue),
      minOrderValue: minOrderValue ? String(minOrderValue) : "0",
      maxDiscount: maxDiscount ? String(maxDiscount) : undefined,
      applicableOn: applicableOn || ["all"],
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      maxUses: maxUses || undefined,
      isActive: isActive !== false,
    }).returning();

    await logActivity(req, "coupon_created", `Coupon created: ${coupon.code}`, currentUser.id, currentUser.role);
    res.status(201).json(coupon);
  },
);

router.patch(
  "/admin/coupons/:id",
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const currentUser = (req as any).currentUser;
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    const {
      code, name, description, type, discountType, discountValue,
      minOrderValue, maxDiscount, applicableOn, startDate, endDate,
      maxUses, isActive,
    } = req.body;

    const updates: Record<string, any> = {};
    if (code !== undefined) updates.code = String(code).toUpperCase();
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (type !== undefined) updates.type = type;
    if (discountType !== undefined) updates.discountType = discountType;
    if (discountValue !== undefined) updates.discountValue = String(discountValue);
    if (minOrderValue !== undefined) updates.minOrderValue = String(minOrderValue);
    if (maxDiscount !== undefined) updates.maxDiscount = maxDiscount ? String(maxDiscount) : null;
    if (applicableOn !== undefined) updates.applicableOn = applicableOn;
    if (startDate !== undefined) updates.startDate = startDate || null;
    if (endDate !== undefined) updates.endDate = endDate || null;
    if (maxUses !== undefined) updates.maxUses = maxUses || null;
    if (isActive !== undefined) updates.isActive = isActive;

    const [updated] = await db.update(couponsTable).set(updates).where(eq(couponsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Coupon not found" }); return; }

    await logActivity(req, "coupon_updated", `Coupon updated: ${updated.code}`, currentUser.id, currentUser.role);
    res.json(updated);
  },
);

router.delete(
  "/admin/coupons/:id",
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const currentUser = (req as any).currentUser;
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.id, id));
    if (!coupon) { res.status(404).json({ error: "Coupon not found" }); return; }

    await db.delete(couponsTable).where(eq(couponsTable.id, id));
    await logActivity(req, "coupon_deleted", `Coupon deleted: ${coupon.code}`, currentUser.id, currentUser.role);
    res.json({ message: "Coupon deleted successfully" });
  },
);

export default router;
