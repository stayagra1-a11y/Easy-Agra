import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  pgEnum,
  boolean,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── Enums ──────────────────────────────────────────────────────────────
export const touristPlaceImageTypeEnum = pgEnum("tourist_place_image_type", [
  "cover",
  "gallery",
]);

export const touristPlaceLocationTypeEnum = pgEnum(
  "tourist_place_location_type",
  ["railway_station", "airport", "bus_stand", "city_center"],
);

// ── Tourist Places ─────────────────────────────────────────────────────
export const touristPlacesTable = pgTable("tourist_places", {
  id: serial("id").primaryKey(),

  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),

  shortDescription: text("short_description"),
  description: text("description"),
  historicalInfo: text("historical_info"),

  openingTime: text("opening_time"),
  closingTime: text("closing_time"),

  ticketPriceIndian: numeric("ticket_price_indian", {
    precision: 10,
    scale: 2,
  }),
  ticketPriceForeign: numeric("ticket_price_foreign", {
    precision: 10,
    scale: 2,
  }),
  ticketPriceChild: numeric("ticket_price_child", { precision: 10, scale: 2 }),

  bestTimeToVisit: text("best_time_to_visit"),

  address: text("address"),
  googleMapsLink: text("google_maps_link"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),

  city: text("city").notNull().default("Agra"),
  state: text("state").notNull().default("Uttar Pradesh"),
  country: text("country").notNull().default("India"),

  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),

  deletedAt: timestamp("deleted_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertTouristPlaceSchema = createInsertSchema(
  touristPlacesTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export type InsertTouristPlace = z.infer<typeof insertTouristPlaceSchema>;
export type TouristPlace = typeof touristPlacesTable.$inferSelect;

// ── Tourist Place Images ────────────────────────────────────────────────
export const touristPlaceImagesTable = pgTable("tourist_place_images", {
  id: serial("id").primaryKey(),
  placeId: integer("place_id")
    .notNull()
    .references(() => touristPlacesTable.id, { onDelete: "cascade" }),

  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  altText: text("alt_text"),
  imageType: touristPlaceImageTypeEnum("image_type").notNull().default("gallery"),
  isFeatured: boolean("is_featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertTouristPlaceImageSchema = createInsertSchema(
  touristPlaceImagesTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTouristPlaceImage = z.infer<
  typeof insertTouristPlaceImageSchema
>;
export type TouristPlaceImage = typeof touristPlaceImagesTable.$inferSelect;

// ── Tourist Place Tips ──────────────────────────────────────────────────
export const touristPlaceTipsTable = pgTable("tourist_place_tips", {
  id: serial("id").primaryKey(),
  placeId: integer("place_id")
    .notNull()
    .references(() => touristPlacesTable.id, { onDelete: "cascade" }),

  tip: text("tip").notNull(),
  category: text("category"),
  sortOrder: integer("sort_order").notNull().default(0),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertTouristPlaceTipSchema = createInsertSchema(
  touristPlaceTipsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTouristPlaceTip = z.infer<typeof insertTouristPlaceTipSchema>;
export type TouristPlaceTip = typeof touristPlaceTipsTable.$inferSelect;

// ── Tourist Place Distances ─────────────────────────────────────────────
export const touristPlaceDistancesTable = pgTable("tourist_place_distances", {
  id: serial("id").primaryKey(),
  placeId: integer("place_id")
    .notNull()
    .references(() => touristPlacesTable.id, { onDelete: "cascade" }),

  fromLocation: text("from_location").notNull(),
  locationType: touristPlaceLocationTypeEnum("location_type")
    .notNull()
    .default("railway_station"),
  distanceKm: numeric("distance_km", { precision: 6, scale: 2 }),
  estimatedTimeMinutes: integer("estimated_time_minutes"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertTouristPlaceDistanceSchema = createInsertSchema(
  touristPlaceDistancesTable,
).omit({ id: true, createdAt: true });
export type InsertTouristPlaceDistance = z.infer<
  typeof insertTouristPlaceDistanceSchema
>;
export type TouristPlaceDistance =
  typeof touristPlaceDistancesTable.$inferSelect;
