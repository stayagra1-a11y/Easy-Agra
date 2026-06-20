import { Router } from "express";
import { db, spasTable, spaServicesTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { requireRole } from "../middlewares/requireAuth";

const router = Router();

type ServiceRow = typeof spaServicesTable.$inferSelect;

function parseNum(v: any): number {
  if (v == null) return 0;
  return parseFloat(String(v));
}

function serializeService(s: ServiceRow) {
  return {
    ...s,
    price: parseNum(s.price),
    createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
    updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : s.updatedAt,
  };
}

async function findSpaOwned(spaId: number, ownerId: number) {
  const [s] = await db
    .select()
    .from(spasTable)
    .where(and(eq(spasTable.id, spaId), isNull(spasTable.deletedAt)));
  return s;
}

const VALID_CATEGORIES = [
  "full_body_massage",
  "head_massage",
  "foot_massage",
  "aromatherapy",
  "facial",
  "beauty_treatment",
  "couples_therapy",
  "wellness_package",
] as const;
type ServiceCategory = (typeof VALID_CATEGORIES)[number];

// ────────────────────────────────────────────────────────────────────────
// GET /spas/:id/services — public
// ────────────────────────────────────────────────────────────────────────
router.get("/spas/:id/services", async (req, res): Promise<void> => {
  const spaId = parseInt(req.params.id as string, 10);
  if (isNaN(spaId)) { res.status(400).json({ error: "Invalid spa id" }); return; }

  const services = await db
    .select()
    .from(spaServicesTable)
    .where(eq(spaServicesTable.spaId, spaId))
    .orderBy(spaServicesTable.category, spaServicesTable.name);

  res.json(services.map(serializeService));
});

// ────────────────────────────────────────────────────────────────────────
// POST /spas/:id/services — owner adds service
// ────────────────────────────────────────────────────────────────────────
router.post(
  "/spas/:id/services",
  requireRole("spa_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const spaId = parseInt(req.params.id as string, 10);
    if (isNaN(spaId)) { res.status(400).json({ error: "Invalid spa id" }); return; }

    const spa = await findSpaOwned(spaId, cu.id);
    if (!spa) { res.status(404).json({ error: "Spa not found" }); return; }
    if (spa.ownerId !== cu.id) { res.status(403).json({ error: "Forbidden" }); return; }

    const { name, category, description, duration, price, serviceImage, isAvailable = true } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: "Service name required" }); return; }
    if (!price || isNaN(parseFloat(price))) { res.status(400).json({ error: "Valid price required" }); return; }

    const cat: ServiceCategory = VALID_CATEGORIES.includes(category) ? category : "full_body_massage";

    const [svc] = await db
      .insert(spaServicesTable)
      .values({
        spaId,
        name: name.trim(),
        category: cat,
        description: description?.trim() ?? null,
        duration: parseInt(String(duration ?? 60), 10) || 60,
        price: String(parseFloat(price)),
        serviceImage: serviceImage ?? null,
        isAvailable: Boolean(isAvailable),
      })
      .returning();

    res.status(201).json(serializeService(svc));
  },
);

// ────────────────────────────────────────────────────────────────────────
// PUT /spa-services/:id — owner updates service
// ────────────────────────────────────────────────────────────────────────
router.put(
  "/spa-services/:id",
  requireRole("spa_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [svc] = await db.select().from(spaServicesTable).where(eq(spaServicesTable.id, id));
    if (!svc) { res.status(404).json({ error: "Service not found" }); return; }

    const spa = await findSpaOwned(svc.spaId, cu.id);
    if (!spa || spa.ownerId !== cu.id) { res.status(403).json({ error: "Forbidden" }); return; }

    const { name, category, description, duration, price, serviceImage, isAvailable } = req.body;
    const cat: ServiceCategory = category && VALID_CATEGORIES.includes(category) ? category : svc.category;

    const [updated] = await db
      .update(spaServicesTable)
      .set({
        name: name?.trim() ?? svc.name,
        category: cat,
        description: description?.trim() ?? svc.description,
        duration: duration != null ? parseInt(String(duration), 10) : svc.duration,
        price: price != null ? String(parseFloat(price)) : svc.price,
        serviceImage: serviceImage !== undefined ? serviceImage : svc.serviceImage,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : svc.isAvailable,
      })
      .where(eq(spaServicesTable.id, id))
      .returning();

    res.json(serializeService(updated));
  },
);

// ────────────────────────────────────────────────────────────────────────
// DELETE /spa-services/:id — owner removes service
// ────────────────────────────────────────────────────────────────────────
router.delete(
  "/spa-services/:id",
  requireRole("spa_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [svc] = await db.select().from(spaServicesTable).where(eq(spaServicesTable.id, id));
    if (!svc) { res.status(404).json({ error: "Service not found" }); return; }

    const spa = await findSpaOwned(svc.spaId, cu.id);
    if (!spa || spa.ownerId !== cu.id) { res.status(403).json({ error: "Forbidden" }); return; }

    await db.delete(spaServicesTable).where(eq(spaServicesTable.id, id));
    res.json({ success: true });
  },
);

export default router;
