import { Router } from "express";
import {
  db,
  touristPlacesTable,
  touristPlaceImagesTable,
  touristPlaceTipsTable,
  touristPlaceDistancesTable,
} from "@workspace/db";
import { eq, and, ilike, sql, desc, asc, isNull, or } from "drizzle-orm";
import { logActivity } from "../lib/auth";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

// ── Serializers ─────────────────────────────────────────────────────────

function serializePlace(r: typeof touristPlacesTable.$inferSelect) {
  return {
    ...r,
    ticketPriceIndian: r.ticketPriceIndian ? parseFloat(String(r.ticketPriceIndian)) : null,
    ticketPriceForeign: r.ticketPriceForeign ? parseFloat(String(r.ticketPriceForeign)) : null,
    ticketPriceChild: r.ticketPriceChild ? parseFloat(String(r.ticketPriceChild)) : null,
    latitude: r.latitude ? parseFloat(String(r.latitude)) : null,
    longitude: r.longitude ? parseFloat(String(r.longitude)) : null,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
    deletedAt: r.deletedAt instanceof Date ? r.deletedAt.toISOString() : r.deletedAt,
  };
}

function serializeImage(r: typeof touristPlaceImagesTable.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

function serializeTip(r: typeof touristPlaceTipsTable.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

function serializeDistance(r: typeof touristPlaceDistancesTable.$inferSelect) {
  return {
    ...r,
    distanceKm: r.distanceKm ? parseFloat(String(r.distanceKm)) : null,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

async function getPlaceWithRelations(id: number) {
  const place = await db.query.touristPlacesTable.findFirst({
    where: and(eq(touristPlacesTable.id, id), isNull(touristPlacesTable.deletedAt)),
  });
  if (!place) return null;

  const images = await db
    .select()
    .from(touristPlaceImagesTable)
    .where(eq(touristPlaceImagesTable.placeId, id))
    .orderBy(asc(touristPlaceImagesTable.sortOrder), asc(touristPlaceImagesTable.id));

  const tips = await db
    .select()
    .from(touristPlaceTipsTable)
    .where(eq(touristPlaceTipsTable.placeId, id))
    .orderBy(asc(touristPlaceTipsTable.sortOrder), asc(touristPlaceTipsTable.id));

  const distances = await db
    .select()
    .from(touristPlaceDistancesTable)
    .where(eq(touristPlaceDistancesTable.placeId, id))
    .orderBy(asc(touristPlaceDistancesTable.id));

  const coverImage = images.find((img) => img.imageType === "cover" || img.isFeatured);
  const coverImageUrl = coverImage?.imageUrl ?? null;

  return {
    ...serializePlace(place),
    coverImageUrl,
    images: images.map(serializeImage),
    tips: tips.map(serializeTip),
    distances: distances.map(serializeDistance),
  };
}

// ── Static routes (BEFORE /:id) ─────────────────────────────────────────

// POST /tourist-places/seed — super_admin only
router.post(
  "/tourist-places/seed",
  requireRole("super_admin"),
  async (req, res) => {
    const existing = await db
      .select({ id: touristPlacesTable.id })
      .from(touristPlacesTable)
      .limit(1);

    if (existing.length > 0) {
      res.json({ message: "Tourist places already seeded", count: 0 });
      return;
    }

    const PLACES_SEED = getSeedData();
    let count = 0;

    for (const placeData of PLACES_SEED) {
      const { images, tips, distances, ...placeFields } = placeData;

      const [place] = await db
        .insert(touristPlacesTable)
        .values(placeFields)
        .returning();

      for (let i = 0; i < images.length; i++) {
        await db.insert(touristPlaceImagesTable).values({
          placeId: place.id,
          ...images[i],
          sortOrder: i,
        });
      }

      for (let i = 0; i < tips.length; i++) {
        await db.insert(touristPlaceTipsTable).values({
          placeId: place.id,
          ...tips[i],
          sortOrder: i,
        });
      }

      for (const dist of distances) {
        await db.insert(touristPlaceDistancesTable).values({
          placeId: place.id,
          ...dist,
        });
      }
      count++;
    }

    await logActivity(req, "seed_tourist_places", `Seeded ${count} tourist places`);
    res.json({ message: `Seeded ${count} tourist places successfully`, count });
  },
);

// PUT /tourist-places/images/:imageId
router.put(
  "/tourist-places/images/:imageId",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const imageId = parseInt(req.params.imageId as string);
    const { imageUrl, caption, altText, imageType, isFeatured, sortOrder } = req.body;

    const [updated] = await db
      .update(touristPlaceImagesTable)
      .set({ imageUrl, caption, altText, imageType, isFeatured, sortOrder })
      .where(eq(touristPlaceImagesTable.id, imageId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Image not found" });
      return;
    }
    res.json(serializeImage(updated));
  },
);

// DELETE /tourist-places/images/:imageId
router.delete(
  "/tourist-places/images/:imageId",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const imageId = parseInt(req.params.imageId as string);
    await db.delete(touristPlaceImagesTable).where(eq(touristPlaceImagesTable.id, imageId));
    res.json({ success: true });
  },
);

// PUT /tourist-places/images/:imageId/feature
router.put(
  "/tourist-places/images/:imageId/feature",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const imageId = parseInt(req.params.imageId as string);

    const image = await db.query.touristPlaceImagesTable.findFirst({
      where: eq(touristPlaceImagesTable.id, imageId),
    });
    if (!image) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

    await db
      .update(touristPlaceImagesTable)
      .set({ isFeatured: false })
      .where(eq(touristPlaceImagesTable.placeId, image.placeId));

    await db
      .update(touristPlaceImagesTable)
      .set({ isFeatured: true })
      .where(eq(touristPlaceImagesTable.id, imageId));

    res.json({ success: true });
  },
);

// PUT /tourist-places/tips/:tipId
router.put(
  "/tourist-places/tips/:tipId",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const tipId = parseInt(req.params.tipId as string);
    const { tip, category, sortOrder } = req.body;

    const [updated] = await db
      .update(touristPlaceTipsTable)
      .set({ tip, category, sortOrder })
      .where(eq(touristPlaceTipsTable.id, tipId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Tip not found" });
      return;
    }
    res.json(serializeTip(updated));
  },
);

// DELETE /tourist-places/tips/:tipId
router.delete(
  "/tourist-places/tips/:tipId",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const tipId = parseInt(req.params.tipId as string);
    await db.delete(touristPlaceTipsTable).where(eq(touristPlaceTipsTable.id, tipId));
    res.json({ success: true });
  },
);

// PUT /tourist-places/distances/:distId
router.put(
  "/tourist-places/distances/:distId",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const distId = parseInt(req.params.distId as string);
    const { fromLocation, locationType, distanceKm, estimatedTimeMinutes } = req.body;

    const [updated] = await db
      .update(touristPlaceDistancesTable)
      .set({ fromLocation, locationType, distanceKm, estimatedTimeMinutes })
      .where(eq(touristPlaceDistancesTable.id, distId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Distance record not found" });
      return;
    }
    res.json(serializeDistance(updated));
  },
);

// DELETE /tourist-places/distances/:distId
router.delete(
  "/tourist-places/distances/:distId",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const distId = parseInt(req.params.distId as string);
    await db.delete(touristPlaceDistancesTable).where(eq(touristPlaceDistancesTable.id, distId));
    res.json({ success: true });
  },
);

// ── Main CRUD routes ────────────────────────────────────────────────────

// GET /tourist-places — public
router.get("/tourist-places", async (req, res) => {
  const page = parseInt(String(req.query.page || "1"));
  const limit = Math.min(parseInt(String(req.query.limit || "20")), 50);
  const offset = (page - 1) * limit;
  const search = req.query.search as string | undefined;
  const city = req.query.city as string | undefined;
  const featured = req.query.featured === "true";

  const conditions = [isNull(touristPlacesTable.deletedAt), eq(touristPlacesTable.isActive, true)];
  if (search) conditions.push(ilike(touristPlacesTable.name, `%${search}%`));
  if (city) conditions.push(ilike(touristPlacesTable.city, `%${city}%`));
  if (featured) conditions.push(eq(touristPlacesTable.isFeatured, true));

  const whereClause = and(...conditions);

  const [places, countResult] = await Promise.all([
    db
      .select()
      .from(touristPlacesTable)
      .where(whereClause)
      .orderBy(asc(touristPlacesTable.sortOrder), asc(touristPlacesTable.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(touristPlacesTable)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;

  const placesWithImages = await Promise.all(
    places.map(async (place) => {
      const images = await db
        .select()
        .from(touristPlaceImagesTable)
        .where(eq(touristPlaceImagesTable.placeId, place.id))
        .orderBy(asc(touristPlaceImagesTable.sortOrder))
        .limit(20);

      const tips = await db
        .select()
        .from(touristPlaceTipsTable)
        .where(eq(touristPlaceTipsTable.placeId, place.id))
        .orderBy(asc(touristPlaceTipsTable.sortOrder));

      const distances = await db
        .select()
        .from(touristPlaceDistancesTable)
        .where(eq(touristPlaceDistancesTable.placeId, place.id))
        .orderBy(asc(touristPlaceDistancesTable.id));

      const coverImage = images.find((img) => img.imageType === "cover" || img.isFeatured);
      return {
        ...serializePlace(place),
        coverImageUrl: coverImage?.imageUrl ?? null,
        images: images.map(serializeImage),
        tips: tips.map(serializeTip),
        distances: distances.map(serializeDistance),
      };
    }),
  );

  res.json({ places: placesWithImages, total, page, limit });
});

// POST /tourist-places — admin only
router.post(
  "/tourist-places",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const {
      name, slug, shortDescription, description, historicalInfo,
      openingTime, closingTime, ticketPriceIndian, ticketPriceForeign,
      ticketPriceChild, bestTimeToVisit, address, googleMapsLink,
      latitude, longitude, city, state, country, isActive, isFeatured, sortOrder,
    } = req.body;

    const [place] = await db
      .insert(touristPlacesTable)
      .values({
        name, slug, shortDescription, description, historicalInfo,
        openingTime, closingTime, ticketPriceIndian, ticketPriceForeign,
        ticketPriceChild, bestTimeToVisit, address, googleMapsLink,
        latitude, longitude, city: city || "Agra", state: state || "Uttar Pradesh",
        country: country || "India", isActive: isActive ?? true,
        isFeatured: isFeatured ?? false, sortOrder: sortOrder ?? 0,
      })
      .returning();

    await logActivity(req, "create_tourist_place", `Created tourist place: ${name}`);
    res.status(201).json(serializePlace(place));
  },
);

// GET /tourist-places/:id — public
router.get("/tourist-places/:id", async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const detail = await getPlaceWithRelations(id);
  if (!detail) {
    res.status(404).json({ error: "Tourist place not found" });
    return;
  }
  res.json(detail);
});

// PUT /tourist-places/:id — admin only
router.put(
  "/tourist-places/:id",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const id = parseInt(req.params.id as string);
    const {
      name, slug, shortDescription, description, historicalInfo,
      openingTime, closingTime, ticketPriceIndian, ticketPriceForeign,
      ticketPriceChild, bestTimeToVisit, address, googleMapsLink,
      latitude, longitude, city, state, country, isActive, isFeatured, sortOrder,
    } = req.body;

    const [updated] = await db
      .update(touristPlacesTable)
      .set({
        name, slug, shortDescription, description, historicalInfo,
        openingTime, closingTime, ticketPriceIndian, ticketPriceForeign,
        ticketPriceChild, bestTimeToVisit, address, googleMapsLink,
        latitude, longitude, city, state, country, isActive, isFeatured, sortOrder,
      })
      .where(and(eq(touristPlacesTable.id, id), isNull(touristPlacesTable.deletedAt)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Tourist place not found" });
      return;
    }

    await logActivity(req, "update_tourist_place", `Updated tourist place: ${updated.name}`);
    res.json(serializePlace(updated));
  },
);

// DELETE /tourist-places/:id — admin only (soft delete)
router.delete(
  "/tourist-places/:id",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const id = parseInt(req.params.id as string);

    const [deleted] = await db
      .update(touristPlacesTable)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(touristPlacesTable.id, id), isNull(touristPlacesTable.deletedAt)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Tourist place not found" });
      return;
    }

    await logActivity(req, "delete_tourist_place", `Deleted tourist place: ${deleted.name}`);
    res.json({ success: true });
  },
);

// POST /tourist-places/:id/images — admin only
router.post(
  "/tourist-places/:id/images",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const placeId = parseInt(req.params.id as string);
    const { imageUrl, caption, altText, imageType, isFeatured, sortOrder } = req.body;

    const maxOrder = await db
      .select({ max: sql<number>`coalesce(max(sort_order), -1)` })
      .from(touristPlaceImagesTable)
      .where(eq(touristPlaceImagesTable.placeId, placeId));

    const [image] = await db
      .insert(touristPlaceImagesTable)
      .values({
        placeId,
        imageUrl,
        caption,
        altText,
        imageType: imageType || "gallery",
        isFeatured: isFeatured ?? false,
        sortOrder: sortOrder ?? (maxOrder[0]?.max ?? -1) + 1,
      })
      .returning();

    res.status(201).json(serializeImage(image));
  },
);

// POST /tourist-places/:id/images/reorder — admin only
router.post(
  "/tourist-places/:id/images/reorder",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const { imageIds } = req.body as { imageIds: number[] };

    for (let i = 0; i < imageIds.length; i++) {
      await db
        .update(touristPlaceImagesTable)
        .set({ sortOrder: i })
        .where(eq(touristPlaceImagesTable.id, imageIds[i]));
    }
    res.json({ success: true });
  },
);

// POST /tourist-places/:id/tips — admin only
router.post(
  "/tourist-places/:id/tips",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const placeId = parseInt(req.params.id as string);
    const { tip, category, sortOrder } = req.body;

    const maxOrder = await db
      .select({ max: sql<number>`coalesce(max(sort_order), -1)` })
      .from(touristPlaceTipsTable)
      .where(eq(touristPlaceTipsTable.placeId, placeId));

    const [newTip] = await db
      .insert(touristPlaceTipsTable)
      .values({
        placeId,
        tip,
        category,
        sortOrder: sortOrder ?? (maxOrder[0]?.max ?? -1) + 1,
      })
      .returning();

    res.status(201).json(serializeTip(newTip));
  },
);

// POST /tourist-places/:id/distances — admin only
router.post(
  "/tourist-places/:id/distances",
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const placeId = parseInt(req.params.id as string);
    const { fromLocation, locationType, distanceKm, estimatedTimeMinutes } = req.body;

    const [dist] = await db
      .insert(touristPlaceDistancesTable)
      .values({ placeId, fromLocation, locationType, distanceKm, estimatedTimeMinutes })
      .returning();

    res.status(201).json(serializeDistance(dist));
  },
);

export default router;

// ── Seed Data ────────────────────────────────────────────────────────────

function getSeedData() {
  const img = (url: string, caption: string, type: "cover" | "gallery" = "gallery", featured = false) => ({
    imageUrl: url,
    caption,
    imageType: type,
    isFeatured: featured,
    altText: caption,
  });

  const u = (id: string) => `https://images.unsplash.com/photo-${id}?w=1200&q=80`;

  return [
    {
      name: "Taj Mahal",
      slug: "taj-mahal",
      sortOrder: 1,
      isFeatured: true,
      isActive: true,
      city: "Agra",
      state: "Uttar Pradesh",
      country: "India",
      shortDescription: "The crown jewel of India — an ivory-white marble mausoleum and UNESCO World Heritage Site.",
      description:
        "The Taj Mahal is an ivory-white marble mausoleum on the right bank of the river Yamuna in Agra. It was commissioned in 1631 by the Mughal emperor Shah Jahan to house the tomb of his favourite wife, Mumtaz Mahal. The tomb is the centrepiece of a 17-hectare complex, which includes a mosque, a guest house, and is set in formal gardens bounded on three sides by a crenellated wall. Construction of the mausoleum was essentially completed in 1643, while work continued on other phases of the project for another 10 years.",
      historicalInfo:
        "Built by Mughal Emperor Shah Jahan (1628–1658) in memory of his beloved wife Mumtaz Mahal, who died in 1631 during the birth of their 14th child. Construction began in 1632 and was completed in 1643, employing around 20,000 artisans. The complex took 22 years to complete at a cost equivalent to approximately 52.8 billion rupees today. It was designated a UNESCO World Heritage Site in 1983.",
      openingTime: "06:00",
      closingTime: "18:30",
      ticketPriceIndian: "50",
      ticketPriceForeign: "1100",
      ticketPriceChild: "0",
      bestTimeToVisit: "October to March (early morning for best views and fewer crowds)",
      address: "Dharmapuri, Forest Colony, Tajganj, Agra, Uttar Pradesh 282001",
      googleMapsLink: "https://maps.google.com/?q=Taj+Mahal,Agra",
      latitude: "27.1751",
      longitude: "78.0421",
      images: [
        img(u("1564507592333-c60657eea523"), "Taj Mahal — iconic front view", "cover", true),
        img(u("1548013146-72479768bada"), "Taj Mahal reflected in the lotus pool"),
        img(u("1523592121529-f6dde35f079e"), "Taj Mahal at golden sunrise"),
        img(u("1587474260584-136574528ed5"), "Taj Mahal gardens and pathways"),
        img(u("1524492412937-b28074a5d7da"), "The grand gateway (Darwaza-i-Rauza)"),
        img(u("1559654248-89b8e35e7a2b"), "Intricate marble inlay work (pietra dura)"),
        img(u("1571019613454-1cb2f99b2d8b"), "Taj Mahal at dusk"),
        img(u("1616164744857-1139f2b3e65e"), "Side view of the mausoleum"),
        img(u("1600091166971-7f9faad6c37e"), "Calligraphy on the main arch"),
        img(u("1581456495146-65a71543d316"), "Charbagh — the four-quadrant garden"),
        img(u("1613843439331-2958f52c1680"), "Interior cenotaph chamber"),
        img(u("1476362555312-ab9e108a0b7e"), "Moonrise over the Taj Mahal"),
      ],
      tips: [
        { tip: "Arrive at least 30 minutes before opening to avoid crowds — the first two hours are the best.", category: "Timing" },
        { tip: "The Taj Mahal is closed every Friday for prayers.", category: "Timing" },
        { tip: "Photography is allowed in the gardens and exterior but is prohibited inside the main mausoleum.", category: "Photography" },
        { tip: "Shoe covers are provided (or you can remove shoes) before entering the marble platform.", category: "General" },
        { tip: "Leather items and eatables are not allowed inside. Use the cloakrooms near the gates.", category: "Rules" },
        { tip: "The full moon night viewing (one day before, on, and after full moon) is a magical experience — book in advance.", category: "Special" },
        { tip: "Hire an ASI-certified guide at the gate for a richer historical experience.", category: "General" },
        { tip: "Carry water and sunscreen — there is minimal shade inside the complex.", category: "Preparation" },
      ],
      distances: [
        { fromLocation: "Agra Cantt Railway Station", locationType: "railway_station" as const, distanceKm: "5.5", estimatedTimeMinutes: 20 },
        { fromLocation: "Agra Fort Railway Station", locationType: "railway_station" as const, distanceKm: "4.0", estimatedTimeMinutes: 15 },
        { fromLocation: "Raja Ki Mandi Railway Station", locationType: "railway_station" as const, distanceKm: "6.0", estimatedTimeMinutes: 22 },
        { fromLocation: "Agra Airport (Kheria)", locationType: "airport" as const, distanceKm: "11.0", estimatedTimeMinutes: 35 },
      ],
    },
    {
      name: "Agra Fort",
      slug: "agra-fort",
      sortOrder: 2,
      isFeatured: true,
      isActive: true,
      city: "Agra",
      state: "Uttar Pradesh",
      country: "India",
      shortDescription: "A massive Mughal-era red sandstone fort and UNESCO World Heritage Site.",
      description:
        "Agra Fort is a historical fort in the city of Agra. It was the main residence of the emperors of the Mughal Dynasty until 1638, when the capital was shifted from Agra to Delhi. The fort is a UNESCO World Heritage site. It is about 2.5 km northwest of its more famous sister monument, the Taj Mahal. The fort houses several palaces such as the Jahangir Palace and the Khas Mahal, audience halls such as the Diwan-i-Khas and Diwan-i-Am, and several mosques.",
      historicalInfo:
        "The Agra Fort was built by the Mughal Emperor Akbar beginning in 1565. Initially a military establishment, it became the imperial residence of Akbar, Jahangir, Shah Jahan, and Aurangzeb. The present form was largely built by Akbar between 1565 and 1574, while later additions were made by Jahangir and Shah Jahan. Shah Jahan was imprisoned here by his son Aurangzeb and died in captivity in 1666, gazing at the Taj Mahal from the Musamman Burj tower.",
      openingTime: "06:00",
      closingTime: "18:00",
      ticketPriceIndian: "40",
      ticketPriceForeign: "550",
      ticketPriceChild: "0",
      bestTimeToVisit: "October to March, early morning or evening",
      address: "Rakabganj, Agra, Uttar Pradesh 282003",
      googleMapsLink: "https://maps.google.com/?q=Agra+Fort,Agra",
      latitude: "27.1795",
      longitude: "78.0211",
      images: [
        img(u("1605640840605-14ac1855827b"), "Agra Fort — Amar Singh Gate entrance", "cover", true),
        img(u("1558618666-fcd25c85cd64"), "Diwan-i-Am (Hall of Public Audience)"),
        img(u("1573183073210-18ae36d29e1b"), "Red sandstone ramparts and towers"),
        img(u("1542628682-88d6b5d67d1d"), "Jahangiri Mahal palace complex"),
        img(u("1516214104703-d2151c9e03e6"), "Musamman Burj — octagonal tower"),
        img(u("1529563021893-cc83c992d75d"), "Khas Mahal with marble inlay work"),
        img(u("1554531382-5b3c9a23b7c5"), "Anguri Bagh (Grape Garden) courtyard"),
        img(u("1561761155-6db7d6ad6588"), "View of Taj Mahal from the fort"),
        img(u("1598439210625-5067c578f3f6"), "Diwan-i-Khas (Hall of Private Audience)"),
        img(u("1610371996919-07db6afee15e"), "Nagina Masjid — the gem mosque"),
        img(u("1529563021893-cc83c992d75d"), "Moti Masjid (Pearl Mosque)"),
      ],
      tips: [
        { tip: "Start from the Amar Singh Gate (tourist entrance) — it's the only gate open to tourists.", category: "General" },
        { tip: "Carry sufficient water, especially in summer. The fort is large and mostly exposed to sun.", category: "Preparation" },
        { tip: "Visit the Musamman Burj for a beautiful view of the Taj Mahal in the distance.", category: "Photography" },
        { tip: "The fort pairs perfectly with the Taj Mahal — plan both on the same day with an early start.", category: "Itinerary" },
        { tip: "Evening visit offers great light for photography of the red sandstone.", category: "Photography" },
        { tip: "An ASI guide can bring the Mughal history alive — consider hiring one at the gate.", category: "General" },
        { tip: "Allow 2–3 hours to explore the fort properly.", category: "Timing" },
      ],
      distances: [
        { fromLocation: "Agra Cantt Railway Station", locationType: "railway_station" as const, distanceKm: "5.0", estimatedTimeMinutes: 15 },
        { fromLocation: "Agra Fort Railway Station", locationType: "railway_station" as const, distanceKm: "0.8", estimatedTimeMinutes: 5 },
        { fromLocation: "Raja Ki Mandi Railway Station", locationType: "railway_station" as const, distanceKm: "5.5", estimatedTimeMinutes: 18 },
        { fromLocation: "Agra Airport (Kheria)", locationType: "airport" as const, distanceKm: "12.0", estimatedTimeMinutes: 38 },
      ],
    },
    {
      name: "Mehtab Bagh",
      slug: "mehtab-bagh",
      sortOrder: 3,
      isFeatured: false,
      isActive: true,
      city: "Agra",
      state: "Uttar Pradesh",
      country: "India",
      shortDescription: "The 'Moonlight Garden' — offering the most breathtaking opposite-bank view of the Taj Mahal.",
      description:
        "Mehtab Bagh (Moonlight Garden) is a charbagh complex in Agra, just north of the Taj Mahal complex across the Yamuna river. It offers one of the most stunning views of the Taj Mahal from directly across the river. Legend says Shah Jahan planned a second Taj Mahal built in black marble here, but the project was never realized. The garden is best visited at sunset when the Taj Mahal glows golden.",
      historicalInfo:
        "Built by Emperor Babur in the early 16th century, the garden was later renovated by Shah Jahan. Mehtab Bagh was originally designed to be aligned with the Taj Mahal and served as the viewing garden for the mausoleum. Archaeological excavations here have revealed an octagonal pool whose size mirrors the dome of the Taj Mahal.",
      openingTime: "06:00",
      closingTime: "18:00",
      ticketPriceIndian: "25",
      ticketPriceForeign: "200",
      ticketPriceChild: "0",
      bestTimeToVisit: "Sunrise and sunset — the golden light on the Taj from across the river is magical",
      address: "Dharmapuri, Forest Colony, Tajganj, Agra, Uttar Pradesh 282001",
      googleMapsLink: "https://maps.google.com/?q=Mehtab+Bagh,Agra",
      latitude: "27.1795",
      longitude: "78.0398",
      images: [
        img(u("1586183189334-f0ef2e58c855"), "Mehtab Bagh — Taj Mahal view at sunset", "cover", true),
        img(u("1564507592333-c60657eea523"), "Taj Mahal from Mehtab Bagh"),
        img(u("1523592121529-f6dde35f079e"), "Sunrise reflections from the garden"),
        img(u("1476362555312-ab9e108a0b7e"), "Garden pathways and fountains"),
        img(u("1581456495146-65a71543d316"), "Mehtab Bagh symmetrical gardens"),
        img(u("1548013146-72479768bada"), "Full moon reflection of Taj from here"),
        img(u("1600091166971-7f9faad6c37e"), "Octagonal pool in the garden"),
        img(u("1615380547901-7c35d04be72e"), "Evening light over the Yamuna"),
        img(u("1587474260584-136574528ed5"), "Charbagh four-quadrant layout"),
        img(u("1524492412937-b28074a5d7da"), "Historic garden archways"),
      ],
      tips: [
        { tip: "Visit at sunset for the most spectacular view — the Taj Mahal turns golden in the evening light.", category: "Timing" },
        { tip: "This is one of the best spots for photography of the Taj Mahal without crowds in the frame.", category: "Photography" },
        { tip: "The garden is less crowded than the Taj Mahal complex — a peaceful alternative.", category: "General" },
        { tip: "Combine with Taj Mahal visit — just take a short auto-rickshaw ride across the river.", category: "Itinerary" },
        { tip: "Carry your own snacks and water as there are limited facilities inside.", category: "Preparation" },
        { tip: "The octagonal pool at the center was rediscovered during excavations — ask your guide about it.", category: "History" },
      ],
      distances: [
        { fromLocation: "Agra Cantt Railway Station", locationType: "railway_station" as const, distanceKm: "6.5", estimatedTimeMinutes: 25 },
        { fromLocation: "Agra Fort Railway Station", locationType: "railway_station" as const, distanceKm: "5.0", estimatedTimeMinutes: 18 },
        { fromLocation: "Raja Ki Mandi Railway Station", locationType: "railway_station" as const, distanceKm: "7.0", estimatedTimeMinutes: 27 },
        { fromLocation: "Agra Airport (Kheria)", locationType: "airport" as const, distanceKm: "12.0", estimatedTimeMinutes: 37 },
      ],
    },
    {
      name: "Itimad-ud-Daulah",
      slug: "itimad-ud-daulah",
      sortOrder: 4,
      isFeatured: false,
      isActive: true,
      city: "Agra",
      state: "Uttar Pradesh",
      country: "India",
      shortDescription: "The 'Baby Taj' — first Mughal structure built entirely of white marble with exquisite lattice screens.",
      description:
        "Itimad-ud-Daulah (Tomb of Itimad-ud-Daulah) is a Mughal mausoleum located on the left bank of the Yamuna river in Agra. Often described as a jewel box of marble, it was built between 1622 and 1628 by Nur Jahan, wife of Emperor Jahangir, for her father Mirza Ghiyas Beg. It is sometimes called the 'Baby Taj' as it is seen as a draft of the Taj Mahal. It is the first Mughal structure built entirely from white marble.",
      historicalInfo:
        "Built by Empress Nur Jahan between 1622 and 1628, Itimad-ud-Daulah predates the Taj Mahal and is considered a transitional monument between the earlier Mughal style of red sandstone with marble details and the later all-marble style epitomized by the Taj Mahal. The mausoleum features the first use of pietra dura (inlaid marble) on a large scale in Mughal architecture.",
      openingTime: "06:00",
      closingTime: "18:00",
      ticketPriceIndian: "30",
      ticketPriceForeign: "310",
      ticketPriceChild: "0",
      bestTimeToVisit: "Morning light is best for photography of the marble work",
      address: "Moti Bagh, Agra, Uttar Pradesh 282001",
      googleMapsLink: "https://maps.google.com/?q=Itmad-ud-Daulah,Agra",
      latitude: "27.1965",
      longitude: "78.0399",
      images: [
        img(u("1524231757912-21f4fe3a7200"), "Itimad-ud-Daulah — marble façade", "cover", true),
        img(u("1561761155-6db7d6ad6588"), "Intricate lattice marble screens (jali work)"),
        img(u("1559654248-89b8e35e7a2b"), "Pietra dura floral inlay detail"),
        img(u("1558618666-fcd25c85cd64"), "Riverside garden complex"),
        img(u("1573183073210-18ae36d29e1b"), "Corner towers and minarets"),
        img(u("1542628682-88d6b5d67d1d"), "Interior chamber ceiling"),
        img(u("1516214104703-d2151c9e03e6"), "Ornamental archways and niches"),
        img(u("1613843439331-2958f52c1680"), "Garden reflecting pool"),
        img(u("1598439210625-5067c578f3f6"), "View from the riverside"),
        img(u("1610371996919-07db6afee15e"), "Cenotaphs of Mirza Ghiyas Beg and wife"),
      ],
      tips: [
        { tip: "Visit in the morning when the marble glows in soft light — ideal for photography.", category: "Photography" },
        { tip: "Don't miss the intricate lattice screens (jali work) — they are considered the finest in Mughal architecture.", category: "History" },
        { tip: "The tomb is less visited than the Taj Mahal — enjoy it with far fewer crowds.", category: "General" },
        { tip: "Combine with a visit to Ram Bagh and Chini Ka Rauza nearby, all on the east bank of Yamuna.", category: "Itinerary" },
        { tip: "An auto-rickshaw from Taj Mahal to Itimad-ud-Daulah takes about 20 minutes.", category: "Transport" },
        { tip: "The gardens surrounding the tomb are manicured — a good spot for a relaxed picnic.", category: "General" },
      ],
      distances: [
        { fromLocation: "Agra Cantt Railway Station", locationType: "railway_station" as const, distanceKm: "8.0", estimatedTimeMinutes: 28 },
        { fromLocation: "Agra Fort Railway Station", locationType: "railway_station" as const, distanceKm: "6.5", estimatedTimeMinutes: 22 },
        { fromLocation: "Raja Ki Mandi Railway Station", locationType: "railway_station" as const, distanceKm: "8.5", estimatedTimeMinutes: 30 },
        { fromLocation: "Agra Airport (Kheria)", locationType: "airport" as const, distanceKm: "15.0", estimatedTimeMinutes: 45 },
      ],
    },
    {
      name: "Fatehpur Sikri",
      slug: "fatehpur-sikri",
      sortOrder: 5,
      isFeatured: true,
      isActive: true,
      city: "Fatehpur Sikri",
      state: "Uttar Pradesh",
      country: "India",
      shortDescription: "A magnificent Mughal ghost city — the abandoned capital of Emperor Akbar, a UNESCO World Heritage Site.",
      description:
        "Fatehpur Sikri is a city and a municipal board in the Agra district. The city was founded by Mughal Emperor Akbar in 1569, and served as the capital of the Mughal Empire from 1571 to 1585. After only 14 years as capital, the city was abruptly abandoned, most likely due to water scarcity. The complex includes the mosque, the royal palaces, reception rooms, and the Turkish Sultana's House. It is a UNESCO World Heritage Site since 1986.",
      historicalInfo:
        "Emperor Akbar had the city built as thanksgiving to the Sufi saint Salim Chishti, who predicted the birth of his son. The city took 15 years to build and then was abandoned. The Buland Darwaza (Gate of Magnificence), standing 54 metres high, was built by Akbar to commemorate his victory over Gujarat. Fatehpur Sikri blends Indian and Persian architectural styles, reflecting Akbar's syncretic vision.",
      openingTime: "06:00",
      closingTime: "18:00",
      ticketPriceIndian: "40",
      ticketPriceForeign: "610",
      ticketPriceChild: "0",
      bestTimeToVisit: "October to March, early morning for fewer crowds",
      address: "Fatehpur Sikri, Agra, Uttar Pradesh 283110",
      googleMapsLink: "https://maps.google.com/?q=Fatehpur+Sikri,Agra",
      latitude: "27.0945",
      longitude: "77.6641",
      images: [
        img(u("1601142634808-38923eb7a6a7"), "Buland Darwaza — the great gateway", "cover", true),
        img(u("1598439210625-5067c578f3f6"), "Jama Masjid mosque complex"),
        img(u("1573183073210-18ae36d29e1b"), "Panch Mahal — five-storey palace"),
        img(u("1516214104703-d2151c9e03e6"), "Diwan-i-Khas with central stone pillar"),
        img(u("1542628682-88d6b5d67d1d"), "Birbal's Palace courtyard"),
        img(u("1558618666-fcd25c85cd64"), "Tomb of Salim Chishti"),
        img(u("1613843439331-2958f52c1680"), "Anoop Talao — jewel pool"),
        img(u("1529563021893-cc83c992d75d"), "Turkish Sultana's House carvings"),
        img(u("1610371996919-07db6afee15e"), "Red sandstone ramparts"),
        img(u("1554531382-5b3c9a23b7c5"), "Aerial view of the abandoned city"),
        img(u("1561761155-6db7d6ad6588"), "Ornate Mughal archways"),
      ],
      tips: [
        { tip: "Fatehpur Sikri is 40 km from Agra — hire a taxi or take a bus from Agra Fort bus stand.", category: "Transport" },
        { tip: "Tie a thread at the dargah of Salim Chishti — a popular tradition for those with unfulfilled wishes.", category: "Culture" },
        { tip: "The Buland Darwaza is best photographed in the morning light.", category: "Photography" },
        { tip: "Allow 3–4 hours to properly explore the entire complex.", category: "Timing" },
        { tip: "Parrots and peacocks roam freely in the complex — keep an eye out!", category: "Nature" },
        { tip: "The complex can be combined with a Taj Mahal trip — most tours cover both in one day.", category: "Itinerary" },
        { tip: "Wear comfortable footwear — the site is large and has uneven terrain.", category: "Preparation" },
        { tip: "Guides at the entrance gate are officially registered — worth hiring for historical context.", category: "General" },
      ],
      distances: [
        { fromLocation: "Agra Cantt Railway Station", locationType: "railway_station" as const, distanceKm: "42.0", estimatedTimeMinutes: 70 },
        { fromLocation: "Agra Fort Railway Station", locationType: "railway_station" as const, distanceKm: "40.0", estimatedTimeMinutes: 65 },
        { fromLocation: "Raja Ki Mandi Railway Station", locationType: "railway_station" as const, distanceKm: "38.0", estimatedTimeMinutes: 60 },
        { fromLocation: "Agra Airport (Kheria)", locationType: "airport" as const, distanceKm: "55.0", estimatedTimeMinutes: 85 },
      ],
    },
    {
      name: "Akbar's Tomb (Sikandra)",
      slug: "akbar-tomb-sikandra",
      sortOrder: 6,
      isFeatured: false,
      isActive: true,
      city: "Agra",
      state: "Uttar Pradesh",
      country: "India",
      shortDescription: "The magnificent mausoleum of Emperor Akbar — a blend of Islamic, Hindu, Buddhist, and Jain styles.",
      description:
        "Akbar's Tomb, located at Sikandra on the outskirts of Agra, is the final resting place of the great Mughal Emperor Akbar. Commissioned by Akbar himself and completed by his son Jahangir in 1613, the tomb reflects Akbar's eclectic taste and his philosophy of Din-i-Ilahi, blending architectural styles from Hindu, Buddhist, Jain, and Islamic traditions. The complex features beautiful gardens with hundreds of deer and birds.",
      historicalInfo:
        "Construction began under Akbar around 1600 and was completed by Emperor Jahangir in 1613. The tomb was initially topped with a different structure, but Jahangir changed the design. The complex spans 119 acres. The four-storey gateway (Buland Darwaza) features white marble inlay on red sandstone. The actual burial chamber at the base is simple, with the actual tomb on the terrace above open to sky.",
      openingTime: "06:00",
      closingTime: "18:00",
      ticketPriceIndian: "15",
      ticketPriceForeign: "110",
      ticketPriceChild: "0",
      bestTimeToVisit: "Morning for wildlife sightings; October to March for pleasant weather",
      address: "Sikandra, Agra, Uttar Pradesh 282007",
      googleMapsLink: "https://maps.google.com/?q=Akbar+Tomb+Sikandra,Agra",
      latitude: "27.2324",
      longitude: "77.9576",
      images: [
        img(u("1571019613454-1cb2f99b2d8b"), "Akbar's Tomb — grand entrance gateway", "cover", true),
        img(u("1598439210625-5067c578f3f6"), "Main mausoleum structure"),
        img(u("1529563021893-cc83c992d75d"), "White marble inlay on red sandstone"),
        img(u("1558618666-fcd25c85cd64"), "Deer grazing in the complex gardens"),
        img(u("1573183073210-18ae36d29e1b"), "Ornate minarets and towers"),
        img(u("1542628682-88d6b5d67d1d"), "The four-tiered tomb platform"),
        img(u("1516214104703-d2151c9e03e6"), "Interior burial chamber"),
        img(u("1613843439331-2958f52c1680"), "Tree-lined pathways in the complex"),
        img(u("1610371996919-07db6afee15e"), "Peacocks in the gardens"),
        img(u("1561761155-6db7d6ad6588"), "Architectural detail of the arches"),
      ],
      tips: [
        { tip: "Hundreds of deer live freely in the complex — a unique and delightful experience.", category: "Wildlife" },
        { tip: "Visit early morning for the best chance to see peacocks and deer active.", category: "Wildlife" },
        { tip: "Akbar's actual burial chamber is in the basement — dark inside, carry a small torch.", category: "General" },
        { tip: "The tomb is just 10 km from Agra city — easy to combine with Taj Mahal or Agra Fort.", category: "Itinerary" },
        { tip: "Photography of wildlife is a highlight here — bring a telephoto lens if possible.", category: "Photography" },
        { tip: "The complex is less crowded than major sites — good for a peaceful half-day visit.", category: "General" },
      ],
      distances: [
        { fromLocation: "Agra Cantt Railway Station", locationType: "railway_station" as const, distanceKm: "8.5", estimatedTimeMinutes: 25 },
        { fromLocation: "Agra Fort Railway Station", locationType: "railway_station" as const, distanceKm: "10.0", estimatedTimeMinutes: 30 },
        { fromLocation: "Raja Ki Mandi Railway Station", locationType: "railway_station" as const, distanceKm: "7.0", estimatedTimeMinutes: 22 },
        { fromLocation: "Agra Airport (Kheria)", locationType: "airport" as const, distanceKm: "5.0", estimatedTimeMinutes: 15 },
      ],
    },
    {
      name: "Chini Ka Rauza",
      slug: "chini-ka-rauza",
      sortOrder: 7,
      isFeatured: false,
      isActive: true,
      city: "Agra",
      state: "Uttar Pradesh",
      country: "India",
      shortDescription: "A unique Persian-style tomb covered with glazed tile mosaic — Agra's hidden gem.",
      description:
        "Chini Ka Rauza is the tomb of Afzal Khan, a Persian poet who served as Prime Minister under Shah Jahan. Built between 1635 and 1639, it is one of the most unusual monuments of the Mughal era, featuring a distinctive glazed tile (chini) exterior. The name literally means 'China tomb' due to the Chinese-style glazed tiles used in its construction. Located on the eastern bank of the Yamuna, it stands in quiet contrast to the grand monuments of Agra.",
      historicalInfo:
        "Built between 1635 and 1639 for Allami Afzal Khan Shirazi, Prime Minister and poet of Emperor Shah Jahan. The monument shows strong Persian influence — Afzal Khan was from Shiraz, Iran. The polychrome enamelled tile work (once magnificent, now partially faded) was unusual for Mughal architecture and reflects the Persian homeland of its builder.",
      openingTime: "06:00",
      closingTime: "18:00",
      ticketPriceIndian: "0",
      ticketPriceForeign: "0",
      ticketPriceChild: "0",
      bestTimeToVisit: "Morning or evening; any time of year",
      address: "Yamuna Kinara Rd, Agra, Uttar Pradesh 282001",
      googleMapsLink: "https://maps.google.com/?q=Chini+Ka+Rauza,Agra",
      latitude: "27.1943",
      longitude: "78.0399",
      images: [
        img(u("1616164744857-1139f2b3e65e"), "Chini Ka Rauza — glazed tile exterior", "cover", true),
        img(u("1600091166971-7f9faad6c37e"), "Persian-style arch and tile mosaic"),
        img(u("1581456495146-65a71543d316"), "Yamuna riverbank view"),
        img(u("1554531382-5b3c9a23b7c5"), "Interior chamber with tile work"),
        img(u("1524492412937-b28074a5d7da"), "Faded but beautiful tile patterns"),
        img(u("1548013146-72479768bada"), "Garden surroundings"),
        img(u("1471623817240-8d8789a8e8aa"), "Arched gateway detail"),
        img(u("1529563021893-cc83c992d75d"), "Exterior dome covered in chini tiles"),
        img(u("1476362555312-ab9e108a0b7e"), "Peaceful grounds near Yamuna"),
        img(u("1587474260584-136574528ed5"), "Historical plaque and heritage signage"),
      ],
      tips: [
        { tip: "Entry is completely free — one of Agra's best-value heritage sites.", category: "General" },
        { tip: "Combine with Itimad-ud-Daulah (just 1 km away) for a Yamuna riverbank heritage walk.", category: "Itinerary" },
        { tip: "The monument is relatively unknown — you may have it almost entirely to yourself.", category: "General" },
        { tip: "The tile work is best seen up close — bring a camera for detail shots.", category: "Photography" },
        { tip: "The site may not have guides on site — read about it before visiting for context.", category: "General" },
        { tip: "Good location for a quiet picnic on the Yamuna banks.", category: "General" },
      ],
      distances: [
        { fromLocation: "Agra Cantt Railway Station", locationType: "railway_station" as const, distanceKm: "9.0", estimatedTimeMinutes: 30 },
        { fromLocation: "Agra Fort Railway Station", locationType: "railway_station" as const, distanceKm: "6.5", estimatedTimeMinutes: 22 },
        { fromLocation: "Raja Ki Mandi Railway Station", locationType: "railway_station" as const, distanceKm: "8.5", estimatedTimeMinutes: 28 },
        { fromLocation: "Agra Airport (Kheria)", locationType: "airport" as const, distanceKm: "15.0", estimatedTimeMinutes: 45 },
      ],
    },
    {
      name: "Jama Masjid Agra",
      slug: "jama-masjid-agra",
      sortOrder: 8,
      isFeatured: false,
      isActive: true,
      city: "Agra",
      state: "Uttar Pradesh",
      country: "India",
      shortDescription: "A grand Mughal mosque built by Shah Jahan's daughter — a centre of Islamic architecture in Agra.",
      description:
        "Jama Masjid of Agra is one of the largest mosques in India, built in 1648 by Shah Jahan's favourite daughter Jahanara Begum. Known locally as the 'Friday Mosque', it faces the Agra Fort and was once connected to it by a causeway. The mosque features three bulbous marble domes with red and white stripes, a large central courtyard, and a grand gateway. It remains an active place of worship.",
      historicalInfo:
        "Constructed between 1644 and 1648 CE by Princess Jahanara Begum, the eldest daughter of Emperor Shah Jahan. It was dedicated to the saint Moinuddin Chishti of Ajmer. The mosque follows the classical Mughal mosque layout — a large courtyard with iwans (archways) on three sides and the prayer hall on the west. Its three white marble domes with red and black striping are a distinctive feature of the Agra skyline.",
      openingTime: "07:00",
      closingTime: "12:00",
      ticketPriceIndian: "0",
      ticketPriceForeign: "0",
      ticketPriceChild: "0",
      bestTimeToVisit: "Non-prayer hours (early morning); Fridays after Juma prayers for cultural experience",
      address: "Jama Masjid Road, Kinari Bazar, Agra, Uttar Pradesh 282003",
      googleMapsLink: "https://maps.google.com/?q=Jama+Masjid,Agra",
      latitude: "27.1787",
      longitude: "78.0232",
      images: [
        img(u("1583422409516-2895a77efded"), "Jama Masjid Agra — grand courtyard", "cover", true),
        img(u("1598439210625-5067c578f3f6"), "Three-domed prayer hall with striped domes"),
        img(u("1573183073210-18ae36d29e1b"), "Main entrance gateway"),
        img(u("1516214104703-d2151c9e03e6"), "Courtyard colonnade and arches"),
        img(u("1542628682-88d6b5d67d1d"), "Interior prayer hall with mihrab"),
        img(u("1558618666-fcd25c85cd64"), "Marble minaret detail"),
        img(u("1613843439331-2958f52c1680"), "Visitors and worshippers in courtyard"),
        img(u("1529563021893-cc83c992d75d"), "Geometric tile patterns on the floor"),
        img(u("1554531382-5b3c9a23b7c5"), "View from the mosque towards Agra Fort"),
        img(u("1610371996919-07db6afee15e"), "Mosque at golden hour"),
        img(u("1561761155-6db7d6ad6588"), "Kinari Bazar market outside the mosque"),
      ],
      tips: [
        { tip: "Entry is free — but modest dress is required (head covering for women, no shorts for men).", category: "Rules" },
        { tip: "Visit on a Friday to witness the congregation prayers — a vibrant cultural experience.", category: "Culture" },
        { tip: "Non-Muslims should visit outside prayer times (especially 1–2 pm Friday).", category: "Timing" },
        { tip: "The surrounding Kinari Bazar market is excellent for shopping for Agra's famous marble items, leather goods, and sweets.", category: "Shopping" },
        { tip: "The mosque is very close to Agra Fort — combine both in one visit.", category: "Itinerary" },
        { tip: "Remove footwear before entering the mosque — carry a bag for your shoes.", category: "Rules" },
        { tip: "The view of Agra Fort from the mosque's upper level is excellent.", category: "Photography" },
      ],
      distances: [
        { fromLocation: "Agra Cantt Railway Station", locationType: "railway_station" as const, distanceKm: "5.0", estimatedTimeMinutes: 16 },
        { fromLocation: "Agra Fort Railway Station", locationType: "railway_station" as const, distanceKm: "1.0", estimatedTimeMinutes: 5 },
        { fromLocation: "Raja Ki Mandi Railway Station", locationType: "railway_station" as const, distanceKm: "5.5", estimatedTimeMinutes: 18 },
        { fromLocation: "Agra Airport (Kheria)", locationType: "airport" as const, distanceKm: "12.5", estimatedTimeMinutes: 40 },
      ],
    },
  ];
}
