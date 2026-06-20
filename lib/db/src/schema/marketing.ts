import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { hotelsTable } from "./hotels";
import { restaurantsTable } from "./restaurants";
import { spasTable } from "./spas";
import { touristPlacesTable } from "./tourist_places";

export const bannerCategoryEnum = pgEnum("banner_category", [
  "home",
  "hotels",
  "restaurants",
  "spas",
  "tourist_places",
]);

export const bannersTable = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  imageUrl: text("image_url").notNull(),
  buttonText: text("button_text"),
  buttonLink: text("button_link"),
  category: bannerCategoryEnum("category").notNull().default("home"),
  isActive: boolean("is_active").notNull().default(true),
  startDate: text("start_date"),
  endDate: text("end_date"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const featuredHotelsTable = pgTable("featured_hotels", {
  id: serial("id").primaryKey(),
  hotelId: integer("hotel_id")
    .notNull()
    .references(() => hotelsTable.id, { onDelete: "cascade" })
    .unique(),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const featuredRestaurantsTable = pgTable("featured_restaurants", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurantsTable.id, { onDelete: "cascade" })
    .unique(),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const featuredSpasTable = pgTable("featured_spas", {
  id: serial("id").primaryKey(),
  spaId: integer("spa_id")
    .notNull()
    .references(() => spasTable.id, { onDelete: "cascade" })
    .unique(),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const featuredPlacesTable = pgTable("featured_places", {
  id: serial("id").primaryKey(),
  placeId: integer("place_id")
    .notNull()
    .references(() => touristPlacesTable.id, { onDelete: "cascade" })
    .unique(),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Banner = typeof bannersTable.$inferSelect;
export type FeaturedHotel = typeof featuredHotelsTable.$inferSelect;
export type FeaturedRestaurant = typeof featuredRestaurantsTable.$inferSelect;
export type FeaturedSpa = typeof featuredSpasTable.$inferSelect;
export type FeaturedPlace = typeof featuredPlacesTable.$inferSelect;
