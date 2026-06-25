import {
  pgTable,
  text,
  serial,
  timestamp,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── Enums ──────────────────────────────────────────────────────────────
export const transportTypeEnum = pgEnum("transport_type", [
  "railway_station",
  "bus_stand",
  "airport",
]);

// ── Transport Locations ────────────────────────────────────────────────
export const transportLocationsTable = pgTable("transport_locations", {
  id: serial("id").primaryKey(),

  name: text("name").notNull(),
  type: transportTypeEnum("type").notNull(),

  description: text("description"),
  address: text("address"),
  googleMapsLink: text("google_maps_link"),
  contactNumber: text("contact_number"),
  timings: text("timings"),

  mainImage: text("main_image"),

  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertTransportLocationSchema = createInsertSchema(
  transportLocationsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTransportLocation = z.infer<typeof insertTransportLocationSchema>;
export type TransportLocation = typeof transportLocationsTable.$inferSelect;
