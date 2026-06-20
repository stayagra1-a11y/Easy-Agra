import { Router } from "express";
import { db, platformSettingsTable, hotelsTable, restaurantsTable, spasTable, touristPlacesTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { logActivity } from "../lib/auth";

const router = Router();

async function getOrCreateSettings() {
  let [settings] = await db.select().from(platformSettingsTable).limit(1);
  if (!settings) {
    const inserted = await db.insert(platformSettingsTable).values({}).returning();
    settings = inserted[0];
  }
  return settings;
}

const SECRET_FIELDS = ["razorpayKeySecret", "razorpayWebhookSecret"] as const;

router.get("/platform-settings", requireAuth, async (req, res): Promise<void> => {
  const currentUser = (req as any).currentUser;
  const settings = await getOrCreateSettings();
  const result: Record<string, any> = { ...settings, updatedAt: settings.updatedAt.toISOString() };

  if (currentUser.role !== "super_admin") {
    for (const f of SECRET_FIELDS) delete result[f];
  }

  res.json(result);
});

const ALL_FIELDS = [
  "appName", "logo", "contactEmail", "supportEmail", "contactNumber", "officeAddress",
  "facebookUrl", "instagramUrl", "youtubeUrl", "twitterUrl",
  "hotelCommissionPct", "restaurantCommissionPct", "spaCommissionPct",
  "paymentMode", "razorpayKeyId", "razorpayKeySecret", "razorpayWebhookSecret", "refundPolicy",
  "whatsappTemplate", "smsTemplate", "emailTemplate",
  "featuredHotelIds", "featuredRestaurantIds", "featuredSpaIds", "featuredTouristPlaceIds",
  "termsAndConditions", "privacyPolicy", "maintenanceMode",
];

router.patch("/platform-settings", requireRole("super_admin"), async (req, res): Promise<void> => {
  const currentUser = (req as any).currentUser;
  const updates: Record<string, any> = {};
  for (const field of ALL_FIELDS) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const existing = await getOrCreateSettings();
  const [updated] = await db.update(platformSettingsTable).set(updates).where(eq(platformSettingsTable.id, existing.id)).returning();

  await logActivity(req, "settings_updated", "Platform settings updated", currentUser.id, currentUser.role);
  res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
});

router.get("/admin/featured-content", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const settings = await getOrCreateSettings();

  const [hotels, restaurants, spas, places] = await Promise.all([
    db.select({ id: hotelsTable.id, name: hotelsTable.name, status: hotelsTable.status, category: hotelsTable.category }).from(hotelsTable),
    db.select({ id: restaurantsTable.id, name: restaurantsTable.name, status: restaurantsTable.status }).from(restaurantsTable),
    db.select({ id: spasTable.id, name: spasTable.name, status: spasTable.status }).from(spasTable),
    db.select({ id: touristPlacesTable.id, name: touristPlacesTable.name }).from(touristPlacesTable),
  ]);

  res.json({
    featuredIds: {
      hotels: settings.featuredHotelIds ?? [],
      restaurants: settings.featuredRestaurantIds ?? [],
      spas: settings.featuredSpaIds ?? [],
      places: settings.featuredTouristPlaceIds ?? [],
    },
    all: { hotels, restaurants, spas, places },
  });
});

router.patch("/admin/featured-content", requireRole("super_admin"), async (req, res): Promise<void> => {
  const currentUser = (req as any).currentUser;
  const { hotels, restaurants, spas, places } = req.body;
  const existing = await getOrCreateSettings();
  const [updated] = await db.update(platformSettingsTable).set({
    featuredHotelIds: Array.isArray(hotels) ? hotels : existing.featuredHotelIds,
    featuredRestaurantIds: Array.isArray(restaurants) ? restaurants : existing.featuredRestaurantIds,
    featuredSpaIds: Array.isArray(spas) ? spas : existing.featuredSpaIds,
    featuredTouristPlaceIds: Array.isArray(places) ? places : existing.featuredTouristPlaceIds,
  }).where(eq(platformSettingsTable.id, existing.id)).returning();

  await logActivity(req, "featured_updated", "Featured content updated", currentUser.id, currentUser.role);
  res.json({ message: "Featured content updated", featuredIds: {
    hotels: updated.featuredHotelIds,
    restaurants: updated.featuredRestaurantIds,
    spas: updated.featuredSpaIds,
    places: updated.featuredTouristPlaceIds,
  }});
});

router.get("/platform-settings/featured", requireAuth, async (req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  const featuredHotelIds = (settings.featuredHotelIds ?? []) as number[];
  const featuredRestaurantIds = (settings.featuredRestaurantIds ?? []) as number[];
  const featuredSpaIds = (settings.featuredSpaIds ?? []) as number[];
  const featuredPlaceIds = (settings.featuredTouristPlaceIds ?? []) as number[];

  const [hotels, restaurants, spas, places] = await Promise.all([
    featuredHotelIds.length
      ? db.select({ id: hotelsTable.id, name: hotelsTable.name, category: hotelsTable.category, status: hotelsTable.status })
          .from(hotelsTable).where(inArray(hotelsTable.id, featuredHotelIds))
      : Promise.resolve([]),
    featuredRestaurantIds.length
      ? db.select({ id: restaurantsTable.id, name: restaurantsTable.name, status: restaurantsTable.status })
          .from(restaurantsTable).where(inArray(restaurantsTable.id, featuredRestaurantIds))
      : Promise.resolve([]),
    featuredSpaIds.length
      ? db.select({ id: spasTable.id, name: spasTable.name, status: spasTable.status })
          .from(spasTable).where(inArray(spasTable.id, featuredSpaIds))
      : Promise.resolve([]),
    featuredPlaceIds.length
      ? db.select({ id: touristPlacesTable.id, name: touristPlacesTable.name })
          .from(touristPlacesTable).where(inArray(touristPlacesTable.id, featuredPlaceIds))
      : Promise.resolve([]),
  ]);

  res.json({ hotels, restaurants, spas, places });
});

export default router;
