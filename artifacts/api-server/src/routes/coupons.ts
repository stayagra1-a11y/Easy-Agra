import { Router } from "express";
import { db, couponsTable } from "@workspace/db";
import { eq, ilike, and, desc, sql } from "drizzle-orm";
import { requireRole, requireAuth } from "../middlewares/requireAuth";
import { logActivity } from "../lib/auth";
import { z } from "zod";

const createCouponSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum(["global", "festival", "first_booking", "seasonal"]).default("global"),
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

const validateCouponSchema = z.object({
  code: z.string().min(1),
  bookingType: z.enum(["hotel", "restaurant", "spa"]),
  amount: z.number().positive(),
});

const router = Router();

// ─────────────────────────────────────────────────
// POST /coupons/validate — customer coupon validation
// ─────────────────────────────────────────────────
router.post(
  "/coupons/validate",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = validateCouponSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const { code, bookingType, amount } = parsed.data;
    const today = new Date().toISOString().slice(0, 10);

    const [coupon] = await db
      .select()
      .from(couponsTable)
      .where(eq(couponsTable.code, code.toUpperCase()));

    if (!coupon) {
      res.status(404).json({ error: "Coupon not found" });
      return;
    }

    if (!coupon.isActive) {
      res.status(400).json({ error: "This coupon is no longer active" });
      return;
    }

    if (coupon.startDate && today < coupon.startDate) {
      res.status(400).json({ error: "This coupon is not yet valid" });
      return;
    }

    if (coupon.endDate && today > coupon.endDate) {
      res.status(400).json({ error: "This coupon has expired" });
      return;
    }

    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      res.status(400).json({ error: "This coupon has reached its usage limit" });
      return;
    }

    const applicableOn = (coupon.applicableOn as string[]) ?? ["all"];
    const appliesToType =
      applicableOn.includes("all") || applicableOn.includes(bookingType);
    if (!appliesToType) {
      res.status(400).json({ error: `This coupon is not applicable for ${bookingType} bookings` });
      return;
    }

    const minOrder = parseFloat((coupon.minOrderValue as string) ?? "0");
    if (amount < minOrder) {
      res.status(400).json({ error: `Minimum order value for this coupon is ₹${minOrder}` });
      return;
    }

    // Calculate discount
    const discountValue = parseFloat(coupon.discountValue as string);
    let discountAmount: number;
    if (coupon.discountType === "percentage") {
      discountAmount = (amount * discountValue) / 100;
      if (coupon.maxDiscount) {
        const maxDisc = parseFloat(coupon.maxDiscount as string);
        discountAmount = Math.min(discountAmount, maxDisc);
      }
    } else {
      discountAmount = discountValue;
    }
    discountAmount = Math.min(discountAmount, amount);

    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: discountValue,
      },
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      finalAmount: parseFloat((amount - discountAmount).toFixed(2)),
    });
  },
);

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
    const parsed = createCouponSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const data = parsed.data;

    const [coupon] = await db.insert(couponsTable).values({
      code: data.code.toUpperCase(),
      name: data.name,
      description: data.description,
      type: data.type,
      discountType: data.discountType,
      discountValue: String(data.discountValue),
      minOrderValue: data.minOrderValue != null ? String(data.minOrderValue) : "0",
      maxDiscount: data.maxDiscount != null ? String(data.maxDiscount) : undefined,
      applicableOn: data.applicableOn,
      startDate: data.startDate || undefined,
      endDate: data.endDate || undefined,
      maxUses: data.maxUses || undefined,
      isActive: data.isActive,
      createdBy: currentUser.id,
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
    const parsed = updateCouponSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const data = parsed.data;

    const updates: Record<string, any> = {};
    if (data.code !== undefined) updates.code = data.code.toUpperCase();
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.type !== undefined) updates.type = data.type;
    if (data.discountType !== undefined) updates.discountType = data.discountType;
    if (data.discountValue !== undefined) updates.discountValue = String(data.discountValue);
    if (data.minOrderValue !== undefined) updates.minOrderValue = String(data.minOrderValue);
    if (data.maxDiscount !== undefined) updates.maxDiscount = data.maxDiscount ? String(data.maxDiscount) : null;
    if (data.applicableOn !== undefined) updates.applicableOn = data.applicableOn;
    if (data.startDate !== undefined) updates.startDate = data.startDate || null;
    if (data.endDate !== undefined) updates.endDate = data.endDate || null;
    if (data.maxUses !== undefined) updates.maxUses = data.maxUses || null;
    if (data.isActive !== undefined) updates.isActive = data.isActive;

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
