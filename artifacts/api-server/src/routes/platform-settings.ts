import { Router } from "express";
import { db, platformSettingsTable, hotelsTable, restaurantsTable, spasTable, touristPlacesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

router.get("/platform-settings", requireAuth, async (req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json({ ...settings, updatedAt: settings.updatedAt.toISOString() });
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
      touristPlaces: settings.featuredTouristPlaceIds ?? [],
    },
    all: { hotels, restaurants, spas, touristPlaces: places },
  });
});

router.patch("/admin/featured-content", requireRole("super_admin"), async (req, res): Promise<void> => {
  const currentUser = (req as any).currentUser;
  const { featuredHotelIds, featuredRestaurantIds, featuredSpaIds, featuredTouristPlaceIds } = req.body;

  const updates: Record<string, any> = {};
  if (featuredHotelIds !== undefined) updates.featuredHotelIds = featuredHotelIds;
  if (featuredRestaurantIds !== undefined) updates.featuredRestaurantIds = featuredRestaurantIds;
  if (featuredSpaIds !== undefined) updates.featuredSpaIds = featuredSpaIds;
  if (featuredTouristPlaceIds !== undefined) updates.featuredTouristPlaceIds = featuredTouristPlaceIds;

  const existing = await getOrCreateSettings();
  const [updated] = await db.update(platformSettingsTable).set(updates).where(eq(platformSettingsTable.id, existing.id)).returning();

  await logActivity(req, "featured_content_updated", "Featured content updated", currentUser.id, currentUser.role);
  res.json({
    featuredHotelIds: updated.featuredHotelIds,
    featuredRestaurantIds: updated.featuredRestaurantIds,
    featuredSpaIds: updated.featuredSpaIds,
    featuredTouristPlaceIds: updated.featuredTouristPlaceIds,
  });
});

export default router;
