import { Router } from "express";
import { db, commissionConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

const BOOKING_TYPES = ["hotel", "restaurant", "spa"] as const;
const DEFAULT_RATES: Record<string, string> = {
  hotel: "10.00",
  restaurant: "8.00",
  spa: "12.00",
};

async function seedDefaultConfigs() {
  for (const bt of BOOKING_TYPES) {
    const existing = await db
      .select()
      .from(commissionConfigsTable)
      .where(eq(commissionConfigsTable.bookingType, bt))
      .limit(1);
    if (!existing.length) {
      await db.insert(commissionConfigsTable).values({
        bookingType: bt,
        rate: DEFAULT_RATES[bt],
        isActive: true,
        description: `Default ${bt} commission`,
      });
    }
  }
}

function serializeConfig(c: typeof commissionConfigsTable.$inferSelect) {
  return {
    ...c,
    rate: parseFloat(String(c.rate)),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

router.get("/commissions/config", requireAuth, async (req, res) => {
  await seedDefaultConfigs();
  const configs = await db.select().from(commissionConfigsTable);
  res.json(configs.map(serializeConfig));
});

router.put(
  "/commissions/config",
  requireAuth,
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const { configs } = req.body as {
      configs: Array<{
        bookingType: "hotel" | "restaurant" | "spa";
        rate: number;
        isActive?: boolean;
        description?: string | null;
      }>;
    };
    if (!Array.isArray(configs) || !configs.length) {
      res.status(400).json({ error: "configs array required" });
      return;
    }
    await seedDefaultConfigs();
    const results = [];
    for (const cfg of configs) {
      if (!cfg.bookingType || cfg.rate == null) continue;
      const [updated] = await db
        .update(commissionConfigsTable)
        .set({
          rate: String(cfg.rate),
          isActive: cfg.isActive ?? true,
          description: cfg.description ?? null,
          updatedBy: user.id,
        })
        .where(eq(commissionConfigsTable.bookingType, cfg.bookingType))
        .returning();
      if (updated) results.push(updated);
    }
    res.json(results.map(serializeConfig));
  },
);

export default router;
