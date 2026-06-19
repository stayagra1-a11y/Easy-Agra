import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  pgEnum,
  jsonb,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { hotelsTable } from "./hotels";

export const roomTypeEnum = pgEnum("room_type", [
  "standard",
  "deluxe",
  "premium",
  "family",
  "executive",
  "suite",
]);

export const bedTypeEnum = pgEnum("bed_type", [
  "single",
  "double",
  "queen",
  "king",
]);

export const roomSizeUnitEnum = pgEnum("room_size_unit", ["sqft", "sqm"]);

export const roomStatusEnum = pgEnum("room_status", [
  "draft",
  "active",
  "inactive",
  "maintenance",
]);

export const roomsTable = pgTable("rooms", {
  id: serial("id").primaryKey(),
  hotelId: integer("hotel_id")
    .notNull()
    .references(() => hotelsTable.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  roomNumber: text("room_number"),
  roomType: roomTypeEnum("room_type").notNull().default("standard"),
  description: text("description"),

  adultsCapacity: integer("adults_capacity").notNull().default(2),
  childrenCapacity: integer("children_capacity").notNull().default(0),

  bedType: bedTypeEnum("bed_type").notNull().default("double"),
  roomSize: numeric("room_size", { precision: 10, scale: 2 }),
  roomSizeUnit: roomSizeUnitEnum("room_size_unit").default("sqft"),

  basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
  weekendPrice: numeric("weekend_price", { precision: 10, scale: 2 }),
  holidayPrice: numeric("holiday_price", { precision: 10, scale: 2 }),
  discountPercentage: numeric("discount_percentage", { precision: 5, scale: 2 }).default("0"),
  extraGuestCharge: numeric("extra_guest_charge", { precision: 10, scale: 2 }),
  finalPrice: numeric("final_price", { precision: 10, scale: 2 }),

  amenities: jsonb("amenities").$type<string[]>(),
  coverImage: text("cover_image"),
  galleryImages: jsonb("gallery_images").$type<string[]>(),

  totalRooms: integer("total_rooms").notNull().default(1),
  availableRooms: integer("available_rooms").notNull().default(1),
  occupiedRooms: integer("occupied_rooms").notNull().default(0),
  blockedRooms: integer("blocked_rooms").notNull().default(0),
  underMaintenanceRooms: integer("under_maintenance_rooms").notNull().default(0),

  status: roomStatusEnum("status").notNull().default("draft"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertRoomSchema = createInsertSchema(roomsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof roomsTable.$inferSelect;
