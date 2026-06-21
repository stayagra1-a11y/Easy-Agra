import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  pgEnum,
  jsonb,
  boolean,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const hotelCategoryEnum = pgEnum("hotel_category", [
  "budget",
  "standard",
  "premium",
  "luxury",
]);

export const hotelStatusEnum = pgEnum("hotel_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "suspended",
]);

export const hotelsTable = pgTable("hotels", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  description: text("description"),
  category: hotelCategoryEnum("category").notNull().default("standard"),

  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  googleMapLink: text("google_map_link"),
  landmark: text("landmark"),

  contactPerson: text("contact_person"),
  contactMobile: text("contact_mobile"),
  contactEmail: text("contact_email"),
  website: text("website"),

  checkInTime: text("check_in_time"),
  checkOutTime: text("check_out_time"),
  totalRooms: integer("total_rooms"),
  policies: text("policies"),
  cancellationPolicy: text("cancellation_policy"),

  amenities: jsonb("amenities").$type<string[]>(),
  coverImage: text("cover_image"),
  galleryImages: jsonb("gallery_images").$type<string[]>(),

  earlyCheckInEnabled: boolean("early_check_in_enabled").notNull().default(false),
  earlyCheckInTime: text("early_check_in_time"),
  earlyCheckInPrice: numeric("early_check_in_price", { precision: 10, scale: 2 }),

  upiId: text("upi_id"),
  upiQrImage: text("upi_qr_image"),

  status: hotelStatusEnum("status").notNull().default("draft"),
  rejectionReason: text("rejection_reason"),
  reviewedBy: integer("reviewed_by").references(() => usersTable.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertHotelSchema = createInsertSchema(hotelsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertHotel = z.infer<typeof insertHotelSchema>;
export type Hotel = typeof hotelsTable.$inferSelect;

// ── Hotel Nearby Places ─────────────────────────────────────────────────────
export const hotelNearbyPlaceCategoryEnum = pgEnum("hotel_nearby_place_category", [
  "tourist_place",
  "railway_station",
  "airport",
  "bus_stand",
  "hospital",
  "market",
  "other",
]);

export const hotelNearbyPlacesTable = pgTable("hotel_nearby_places", {
  id: serial("id").primaryKey(),
  hotelId: integer("hotel_id")
    .notNull()
    .references(() => hotelsTable.id, { onDelete: "cascade" }),
  placeName: text("place_name").notNull(),
  category: hotelNearbyPlaceCategoryEnum("category")
    .notNull()
    .default("tourist_place"),
  distanceKm: numeric("distance_km", { precision: 6, scale: 2 }),
  estimatedTimeMinutes: integer("estimated_time_minutes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertHotelNearbyPlaceSchema = createInsertSchema(
  hotelNearbyPlacesTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHotelNearbyPlace = z.infer<typeof insertHotelNearbyPlaceSchema>;
export type HotelNearbyPlace = typeof hotelNearbyPlacesTable.$inferSelect;
