import { Router } from "express";
import {
  db,
  bannersTable,
  featuredHotelsTable,
  featuredRestaurantsTable,
  featuredSpasTable,
  featuredPlacesTable,
  hotelsTable,
  restaurantsTable,
  spasTable,
  touristPlacesTable,
} from "@workspace/db";
import { eq, asc, ilike, or, and, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { z } from "zod";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// BANNERS
// ─────────────────────────────────────────────────────────────────────────────

const bannerSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().optional(),
  imageUrl: z.string().min(1),
  buttonText: z.string().optional(),
  buttonLink: z.string().optional(),
  category: z.enum(["home", "hotels", "restaurants", "spas", "tourist_places"]).default("home"),
  isActive: z.boolean().default(true),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  displayOrder: z.number().int().default(0),
});

// GET /marketing/banners — public, returns active banners (optionally filtered by category)
router.get("/marketing/banners", async (req, res): Promise<void> => {
  const { category } = req.query as Record<string, string>;
  const today = new Date().toISOString().slice(0, 10);

  const rows = await db
    .select()
    .from(bannersTable)
    .where(eq(bannersTable.isActive, true))
    .orderBy(asc(bannersTable.displayOrder), asc(bannersTable.createdAt));

  const filtered = rows.filter((b) => {
    if (category && b.category !== category) return false;
    if (b.startDate && today < b.startDate) return false;
    if (b.endDate && today > b.endDate) return false;
    return true;
  });

  res.json(filtered);
});

// GET /admin/marketing/banners — admin: all banners
router.get(
  "/admin/marketing/banners",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const { category } = req.query as Record<string, string>;
    const rows = await db
      .select()
      .from(bannersTable)
      .orderBy(asc(bannersTable.displayOrder), asc(bannersTable.createdAt));

    const result = category ? rows.filter((b) => b.category === category) : rows;
    res.json(result);
  },
);

// POST /admin/marketing/banners — create
router.post(
  "/admin/marketing/banners",
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const parsed = bannerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const d = parsed.data;

    // Auto-assign displayOrder as max + 1
    const existing = await db.select({ displayOrder: bannersTable.displayOrder }).from(bannersTable).orderBy(asc(bannersTable.displayOrder));
    const maxOrder = existing.length > 0 ? Math.max(...existing.map((r) => r.displayOrder)) : -1;

    const [banner] = await db
      .insert(bannersTable)
      .values({
        title: d.title,
        subtitle: d.subtitle ?? null,
        imageUrl: d.imageUrl,
        buttonText: d.buttonText ?? null,
        buttonLink: d.buttonLink ?? null,
        category: d.category,
        isActive: d.isActive,
        startDate: d.startDate ?? null,
        endDate: d.endDate ?? null,
        displayOrder: d.displayOrder !== 0 ? d.displayOrder : maxOrder + 1,
      })
      .returning();

    res.status(201).json(banner);
  },
);

// PATCH /admin/marketing/banners/reorder — bulk reorder
router.patch(
  "/admin/marketing/banners/reorder",
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const { order } = req.body as { order: { id: number; displayOrder: number }[] };
    if (!Array.isArray(order)) {
      res.status(400).json({ error: "order must be an array" });
      return;
    }
    await Promise.all(
      order.map(({ id, displayOrder }) =>
        db.update(bannersTable).set({ displayOrder }).where(eq(bannersTable.id, id)),
      ),
    );
    const updated = await db.select().from(bannersTable).orderBy(asc(bannersTable.displayOrder));
    res.json(updated);
  },
);

// PATCH /admin/marketing/banners/:id — update
router.patch(
  "/admin/marketing/banners/:id",
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id as string, 10);
    const parsed = bannerSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }

    const [existing] = await db.select().from(bannersTable).where(eq(bannersTable.id, id));
    if (!existing) { res.status(404).json({ error: "Banner not found" }); return; }

    const updates: Record<string, any> = {};
    const d = parsed.data;
    if (d.title !== undefined) updates.title = d.title;
    if (d.subtitle !== undefined) updates.subtitle = d.subtitle;
    if (d.imageUrl !== undefined) updates.imageUrl = d.imageUrl;
    if (d.buttonText !== undefined) updates.buttonText = d.buttonText;
    if (d.buttonLink !== undefined) updates.buttonLink = d.buttonLink;
    if (d.category !== undefined) updates.category = d.category;
    if (d.isActive !== undefined) updates.isActive = d.isActive;
    if (d.startDate !== undefined) updates.startDate = d.startDate ?? null;
    if (d.endDate !== undefined) updates.endDate = d.endDate ?? null;
    if (d.displayOrder !== undefined) updates.displayOrder = d.displayOrder;

    const [updated] = await db.update(bannersTable).set(updates).where(eq(bannersTable.id, id)).returning();
    res.json(updated);
  },
);

// DELETE /admin/marketing/banners/:id — delete
router.delete(
  "/admin/marketing/banners/:id",
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id as string, 10);
    const [existing] = await db.select().from(bannersTable).where(eq(bannersTable.id, id));
    if (!existing) { res.status(404).json({ error: "Banner not found" }); return; }
    await db.delete(bannersTable).where(eq(bannersTable.id, id));
    res.json({ success: true });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC FEATURED ENDPOINTS (for homepage)
// ─────────────────────────────────────────────────────────────────────────────

router.get("/marketing/featured", async (req, res): Promise<void> => {
  const [hotels, restaurants, spas, places] = await Promise.all([
    db
      .select({ id: hotelsTable.id, name: hotelsTable.name, city: hotelsTable.city, coverImage: hotelsTable.coverImage, category: hotelsTable.category, displayOrder: featuredHotelsTable.displayOrder })
      .from(featuredHotelsTable)
      .innerJoin(hotelsTable, eq(featuredHotelsTable.hotelId, hotelsTable.id))
      .where(eq(hotelsTable.status, "approved"))
      .orderBy(asc(featuredHotelsTable.displayOrder)),
    db
      .select({ id: restaurantsTable.id, name: restaurantsTable.name, city: restaurantsTable.city, coverPhoto: restaurantsTable.coverPhoto, displayOrder: featuredRestaurantsTable.displayOrder })
      .from(featuredRestaurantsTable)
      .innerJoin(restaurantsTable, eq(featuredRestaurantsTable.restaurantId, restaurantsTable.id))
      .where(eq(restaurantsTable.status, "active"))
      .orderBy(asc(featuredRestaurantsTable.displayOrder)),
    db
      .select({ id: spasTable.id, name: spasTable.name, city: spasTable.city, coverPhoto: spasTable.coverPhoto, displayOrder: featuredSpasTable.displayOrder })
      .from(featuredSpasTable)
      .innerJoin(spasTable, eq(featuredSpasTable.spaId, spasTable.id))
      .where(eq(spasTable.status, "approved"))
      .orderBy(asc(featuredSpasTable.displayOrder)),
    db
      .select({ id: touristPlacesTable.id, name: touristPlacesTable.name, city: touristPlacesTable.city, displayOrder: featuredPlacesTable.displayOrder })
      .from(featuredPlacesTable)
      .innerJoin(touristPlacesTable, eq(featuredPlacesTable.placeId, touristPlacesTable.id))
      .orderBy(asc(featuredPlacesTable.displayOrder)),
  ]);

  res.json({ hotels, restaurants, spas, places });
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURED HOTELS
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/admin/marketing/featured-hotels",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const { search } = req.query as Record<string, string>;

    const featured = await db
      .select({ fh: featuredHotelsTable, hotel: hotelsTable })
      .from(featuredHotelsTable)
      .innerJoin(hotelsTable, eq(featuredHotelsTable.hotelId, hotelsTable.id))
      .orderBy(asc(featuredHotelsTable.displayOrder));

    const featuredIds = featured.map((r) => r.fh.hotelId);

    const allHotels = await (search
      ? db.select().from(hotelsTable).where(and(eq(hotelsTable.status, "approved"), ilike(hotelsTable.name, `%${search}%`)))
      : db.select().from(hotelsTable).where(eq(hotelsTable.status, "approved")));

    res.json({
      featured: featured.map((r) => ({ ...r.fh, hotelName: r.hotel.name, hotelCity: r.hotel.city, coverImage: r.hotel.coverImage })),
      all: allHotels.map((h) => ({ ...h, isFeatured: featuredIds.includes(h.id) })),
    });
  },
);

router.post(
  "/admin/marketing/featured-hotels",
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const { hotelId } = req.body;
    if (!hotelId) { res.status(400).json({ error: "hotelId is required" }); return; }

    const existing = await db.select().from(featuredHotelsTable).where(eq(featuredHotelsTable.hotelId, parseInt(String(hotelId), 10)));
    if (existing.length > 0) { res.status(400).json({ error: "Hotel is already featured" }); return; }

    const all = await db.select({ displayOrder: featuredHotelsTable.displayOrder }).from(featuredHotelsTable);
    const maxOrder = all.length > 0 ? Math.max(...all.map((r) => r.displayOrder)) : -1;

    const [row] = await db.insert(featuredHotelsTable).values({ hotelId: parseInt(String(hotelId), 10), displayOrder: maxOrder + 1 }).returning();
    res.status(201).json(row);
  },
);

router.delete(
  "/admin/marketing/featured-hotels/:hotelId",
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const hotelId = parseInt(req.params.hotelId as string, 10);
    await db.delete(featuredHotelsTable).where(eq(featuredHotelsTable.hotelId, hotelId));
    res.json({ success: true });
  },
);

router.patch(
  "/admin/marketing/featured-hotels/reorder",
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const { order } = req.body as { order: { id: number; displayOrder: number }[] };
    if (!Array.isArray(order)) { res.status(400).json({ error: "order must be an array" }); return; }
    await Promise.all(order.map(({ id, displayOrder }) => db.update(featuredHotelsTable).set({ displayOrder }).where(eq(featuredHotelsTable.id, id))));
    res.json({ success: true });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// FEATURED RESTAURANTS
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/admin/marketing/featured-restaurants",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const { search } = req.query as Record<string, string>;

    const featured = await db
      .select({ fr: featuredRestaurantsTable, restaurant: restaurantsTable })
      .from(featuredRestaurantsTable)
      .innerJoin(restaurantsTable, eq(featuredRestaurantsTable.restaurantId, restaurantsTable.id))
      .orderBy(asc(featuredRestaurantsTable.displayOrder));

    const featuredIds = featured.map((r) => r.fr.restaurantId);

    const allRestaurants = await (search
      ? db.select().from(restaurantsTable).where(and(eq(restaurantsTable.status, "active"), ilike(restaurantsTable.name, `%${search}%`)))
      : db.select().from(restaurantsTable).where(eq(restaurantsTable.status, "active")));

    res.json({
      featured: featured.map((r) => ({ ...r.fr, restaurantName: r.restaurant.name, restaurantCity: r.restaurant.city, coverPhoto: r.restaurant.coverPhoto })),
      all: allRestaurants.map((r) => ({ ...r, isFeatured: featuredIds.includes(r.id) })),
    });
  },
);

router.post(
  "/admin/marketing/featured-restaurants",
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const { restaurantId } = req.body;
    if (!restaurantId) { res.status(400).json({ error: "restaurantId is required" }); return; }

    const existing = await db.select().from(featuredRestaurantsTable).where(eq(featuredRestaurantsTable.restaurantId, parseInt(String(restaurantId), 10)));
    if (existing.length > 0) { res.status(400).json({ error: "Restaurant is already featured" }); return; }

    const all = await db.select({ displayOrder: featuredRestaurantsTable.displayOrder }).from(featuredRestaurantsTable);
    const maxOrder = all.length > 0 ? Math.max(...all.map((r) => r.displayOrder)) : -1;

    const [row] = await db.insert(featuredRestaurantsTable).values({ restaurantId: parseInt(String(restaurantId), 10), displayOrder: maxOrder + 1 }).returning();
    res.status(201).json(row);
  },
);

router.delete(
  "/admin/marketing/featured-restaurants/:restaurantId",
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const restaurantId = parseInt(req.params.restaurantId as string, 10);
    await db.delete(featuredRestaurantsTable).where(eq(featuredRestaurantsTable.restaurantId, restaurantId));
    res.json({ success: true });
  },
);

router.patch(
  "/admin/marketing/featured-restaurants/reorder",
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const { order } = req.body as { order: { id: number; displayOrder: number }[] };
    if (!Array.isArray(order)) { res.status(400).json({ error: "order must be an array" }); return; }
    await Promise.all(order.map(({ id, displayOrder }) => db.update(featuredRestaurantsTable).set({ displayOrder }).where(eq(featuredRestaurantsTable.id, id))));
    res.json({ success: true });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// FEATURED SPAS
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/admin/marketing/featured-spas",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const { search } = req.query as Record<string, string>;

    const featured = await db
      .select({ fs: featuredSpasTable, spa: spasTable })
      .from(featuredSpasTable)
      .innerJoin(spasTable, eq(featuredSpasTable.spaId, spasTable.id))
      .orderBy(asc(featuredSpasTable.displayOrder));

    const featuredIds = featured.map((r) => r.fs.spaId);

    const allSpas = await (search
      ? db.select().from(spasTable).where(and(eq(spasTable.status, "approved"), ilike(spasTable.name, `%${search}%`)))
      : db.select().from(spasTable).where(eq(spasTable.status, "approved")));

    res.json({
      featured: featured.map((r) => ({ ...r.fs, spaName: r.spa.name, spaCity: r.spa.city, coverPhoto: r.spa.coverPhoto })),
      all: allSpas.map((s) => ({ ...s, isFeatured: featuredIds.includes(s.id) })),
    });
  },
);

router.post(
  "/admin/marketing/featured-spas",
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const { spaId } = req.body;
    if (!spaId) { res.status(400).json({ error: "spaId is required" }); return; }

    const existing = await db.select().from(featuredSpasTable).where(eq(featuredSpasTable.spaId, parseInt(String(spaId), 10)));
    if (existing.length > 0) { res.status(400).json({ error: "Spa is already featured" }); return; }

    const all = await db.select({ displayOrder: featuredSpasTable.displayOrder }).from(featuredSpasTable);
    const maxOrder = all.length > 0 ? Math.max(...all.map((r) => r.displayOrder)) : -1;

    const [row] = await db.insert(featuredSpasTable).values({ spaId: parseInt(String(spaId), 10), displayOrder: maxOrder + 1 }).returning();
    res.status(201).json(row);
  },
);

router.delete(
  "/admin/marketing/featured-spas/:spaId",
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const spaId = parseInt(req.params.spaId as string, 10);
    await db.delete(featuredSpasTable).where(eq(featuredSpasTable.spaId, spaId));
    res.json({ success: true });
  },
);

router.patch(
  "/admin/marketing/featured-spas/reorder",
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const { order } = req.body as { order: { id: number; displayOrder: number }[] };
    if (!Array.isArray(order)) { res.status(400).json({ error: "order must be an array" }); return; }
    await Promise.all(order.map(({ id, displayOrder }) => db.update(featuredSpasTable).set({ displayOrder }).where(eq(featuredSpasTable.id, id))));
    res.json({ success: true });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// FEATURED TOURIST PLACES
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/admin/marketing/featured-places",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const { search } = req.query as Record<string, string>;

    const featured = await db
      .select({ fp: featuredPlacesTable, place: touristPlacesTable })
      .from(featuredPlacesTable)
      .innerJoin(touristPlacesTable, eq(featuredPlacesTable.placeId, touristPlacesTable.id))
      .orderBy(asc(featuredPlacesTable.displayOrder));

    const featuredIds = featured.map((r) => r.fp.placeId);

    const allPlaces = await (search
      ? db.select().from(touristPlacesTable).where(ilike(touristPlacesTable.name, `%${search}%`))
      : db.select().from(touristPlacesTable));

    res.json({
      featured: featured.map((r) => ({ ...r.fp, placeName: r.place.name, placeCity: r.place.city })),
      all: allPlaces.map((p) => ({ ...p, isFeatured: featuredIds.includes(p.id) })),
    });
  },
);

router.post(
  "/admin/marketing/featured-places",
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const { placeId } = req.body;
    if (!placeId) { res.status(400).json({ error: "placeId is required" }); return; }

    const existing = await db.select().from(featuredPlacesTable).where(eq(featuredPlacesTable.placeId, parseInt(String(placeId), 10)));
    if (existing.length > 0) { res.status(400).json({ error: "Place is already featured" }); return; }

    const all = await db.select({ displayOrder: featuredPlacesTable.displayOrder }).from(featuredPlacesTable);
    const maxOrder = all.length > 0 ? Math.max(...all.map((r) => r.displayOrder)) : -1;

    const [row] = await db.insert(featuredPlacesTable).values({ placeId: parseInt(String(placeId), 10), displayOrder: maxOrder + 1 }).returning();
    res.status(201).json(row);
  },
);

router.delete(
  "/admin/marketing/featured-places/:placeId",
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const placeId = parseInt(req.params.placeId as string, 10);
    await db.delete(featuredPlacesTable).where(eq(featuredPlacesTable.placeId, placeId));
    res.json({ success: true });
  },
);

router.patch(
  "/admin/marketing/featured-places/reorder",
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const { order } = req.body as { order: { id: number; displayOrder: number }[] };
    if (!Array.isArray(order)) { res.status(400).json({ error: "order must be an array" }); return; }
    await Promise.all(order.map(({ id, displayOrder }) => db.update(featuredPlacesTable).set({ displayOrder }).where(eq(featuredPlacesTable.id, id))));
    res.json({ success: true });
  },
);

export default router;
