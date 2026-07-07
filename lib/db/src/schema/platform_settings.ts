import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const platformSettingsTable = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  // General
  appName: text("app_name").notNull().default("Easy Agra"),
  logo: text("logo"),
  contactEmail: text("contact_email"),
  supportEmail: text("support_email"),
  contactNumber: text("contact_number"),
  officeAddress: text("office_address"),
  // Social media
  facebookUrl: text("facebook_url"),
  instagramUrl: text("instagram_url"),
  youtubeUrl: text("youtube_url"),
  twitterUrl: text("twitter_url"),
  // Commission settings
  hotelCommissionPct: numeric("hotel_commission_pct", { precision: 5, scale: 2 }).default("10"),
  restaurantCommissionPct: numeric("restaurant_commission_pct", { precision: 5, scale: 2 }).default("10"),
  spaCommissionPct: numeric("spa_commission_pct", { precision: 5, scale: 2 }).default("10"),
  // Payment gateway
  paymentMode: text("payment_mode").default("razorpay"),
  razorpayKeyId: text("razorpay_key_id"),
  razorpayKeySecret: text("razorpay_key_secret"),
  razorpayWebhookSecret: text("razorpay_webhook_secret"),
  refundPolicy: text("refund_policy"),
  // Notification templates
  whatsappTemplate: text("whatsapp_template"),
  smsTemplate: text("sms_template"),
  emailTemplate: text("email_template"),
  // Hero banner slides
  heroSlides: jsonb("hero_slides").$type<{ img: string; title: string; sub: string }[]>(),
  // Featured content IDs
  featuredHotelIds: jsonb("featured_hotel_ids").$type<number[]>().default([]),
  featuredRestaurantIds: jsonb("featured_restaurant_ids").$type<number[]>().default([]),
  featuredSpaIds: jsonb("featured_spa_ids").$type<number[]>().default([]),
  featuredTouristPlaceIds: jsonb("featured_tourist_place_ids").$type<number[]>().default([]),
  // Legal & system
  termsAndConditions: text("terms_and_conditions"),
  privacyPolicy: text("privacy_policy"),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertPlatformSettingsSchema = createInsertSchema(
  platformSettingsTable
).omit({
  id: true,
  updatedAt: true,
});
export type InsertPlatformSettings = z.infer<typeof insertPlatformSettingsSchema>;
export type PlatformSettings = typeof platformSettingsTable.$inferSelect;
