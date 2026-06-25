import { Router } from "express";
import { db, transportLocationsTable } from "@workspace/db";
import { eq, ilike, and, sql, desc, asc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { logActivity } from "../lib/auth";
import { z } from "zod";

const router = Router();

// ── Serializers ───────────────────────────────────────────────────────────
function serializeTransport(r: typeof transportLocationsTable.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

// ── Zod Schemas ──────────────────────────────────────────────────────────
const transportTypeEnum = z.enum(["railway_station", "bus_stand", "airport"]);

const transportInputSchema = z.object({
  name: z.string().min(1).max(200),
  type: transportTypeEnum,
  description: z.string().optional(),
  address: z.string().optional(),
  googleMapsLink: z.string().optional(),
  contactNumber: z.string().optional(),
  timings: z.string().optional(),
  mainImage: z.string().optional(),
  isActive: z.boolean().default(true),
});

// ── Public: List transport locations ───────────────────────────────────
router.get("/transport", async (req, res): Promise<void> => {
  const { type, search, page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(transportLocationsTable.isActive, true)];
  if (type) {
    const validTypes = ["railway_station", "bus_stand", "airport"];
    if (validTypes.includes(type)) {
      conditions.push(eq(transportLocationsTable.type, type as any));
    }
  }
  if (search) {
    conditions.push(
      ilike(transportLocationsTable.name, `%${search}%`),
    );
  }

  const where = and(...conditions);
  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(transportLocationsTable)
      .where(where)
      .orderBy(asc(transportLocationsTable.name))
      .limit(limitNum)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(transportLocationsTable)
      .where(where),
  ]);

  res.json({
    locations: rows.map(serializeTransport),
    total: countResult[0]?.count ?? 0,
    page: pageNum,
    limit: limitNum,
  });
});

// ── Public: Get single transport location ──────────────────────────────────
router.get("/transport/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [row] = await db
    .select()
    .from(transportLocationsTable)
    .where(and(eq(transportLocationsTable.id, id), eq(transportLocationsTable.isActive, true)));

  if (!row) {
    res.status(404).json({ error: "Transport location not found" });
    return;
  }

  res.json(serializeTransport(row));
});

// ── Admin: List all transport locations (including inactive) ──────────────
router.get("/admin/transport", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const { type, search } = req.query as Record<string, string>;
  const conditions: any[] = [];
  if (type) {
    const validTypes = ["railway_station", "bus_stand", "airport"];
    if (validTypes.includes(type)) {
      conditions.push(eq(transportLocationsTable.type, type as any));
    }
  }
  if (search) {
    conditions.push(ilike(transportLocationsTable.name, `%${search}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db
    .select()
    .from(transportLocationsTable)
    .where(where)
    .orderBy(asc(transportLocationsTable.name));

  res.json({ locations: rows.map(serializeTransport) });
});

// ── Admin: Create transport location ──────────────────────────────────
router.post("/admin/transport", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const parsed = transportInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => `${i.path}: ${i.message}`).join(", ") });
    return;
  }

  const data = parsed.data;
  const [row] = await db
    .insert(transportLocationsTable)
    .values({
      name: data.name,
      type: data.type,
      description: data.description || null,
      address: data.address || null,
      googleMapsLink: data.googleMapsLink || null,
      contactNumber: data.contactNumber || null,
      timings: data.timings || null,
      mainImage: data.mainImage || null,
      isActive: data.isActive,
    })
    .returning();

  await logActivity(req, "transport_created", `Transport "${row.name}" (${row.type}) created`, cu.id, cu.role);
  res.status(201).json(serializeTransport(row));
});

// ── Admin: Update transport location ──────────────────────────────────
router.put("/admin/transport/:id", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = transportInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => `${i.path}: ${i.message}`).join(", ") });
    return;
  }

  const data = parsed.data;
  const [row] = await db
    .update(transportLocationsTable)
    .set({
      name: data.name,
      type: data.type,
      description: data.description || null,
      address: data.address || null,
      googleMapsLink: data.googleMapsLink || null,
      contactNumber: data.contactNumber || null,
      timings: data.timings || null,
      mainImage: data.mainImage || null,
      isActive: data.isActive,
    })
    .where(eq(transportLocationsTable.id, id))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  await logActivity(req, "transport_updated", `Transport "${row.name}" updated`, cu.id, cu.role);
  res.json(serializeTransport(row));
});

// ── Admin: Delete transport location ──────────────────────────────────
router.delete("/admin/transport/:id", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [row] = await db
    .delete(transportLocationsTable)
    .where(eq(transportLocationsTable.id, id))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  await logActivity(req, "transport_deleted", `Transport "${row.name}" deleted`, cu.id, cu.role);
  res.json({ message: "Deleted", id: row.id });
});

export default router;
