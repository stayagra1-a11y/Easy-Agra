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

// ── Enums ──────────────────────────────────────────────────────────────
export const restaurantStatusEnum = pgEnum("restaurant_status", [
  "draft",
  "active",
  "suspended",
  "deleted",
]);

export const menuCategoryEnum = pgEnum("menu_category", [
  "starters",
  "main_course",
  "fast_food",
  "desserts",
  "beverages",
]);

export const tableStatusEnum = pgEnum("table_status", [
  "available",
  "reserved",
  "occupied",
]);

export const reservationStatusEnum = pgEnum("reservation_status", [
  "pending",
  "confirmed",
  "rejected",
  "completed",
  "cancelled",
]);

// ── Restaurants ──────────────────────────────────────────────────────
export const restaurantsTable = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  description: text("description"),

  address: text("address"),
  city: text("city"),
  state: text("state"),

  contactNumber: text("contact_number"),
  contactEmail: text("contact_email"),

  openingTime: text("opening_time"),
  closingTime: text("closing_time"),

  cuisineType: text("cuisine_type"),
  seatingCapacity: integer("seating_capacity"),

  coverPhoto: text("cover_photo"),
  galleryPhotos: jsonb("gallery_photos").$type<string[]>(),

  status: restaurantStatusEnum("status").notNull().default("active"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertRestaurantSchema = createInsertSchema(restaurantsTable).omit(
  { id: true, createdAt: true, updatedAt: true, deletedAt: true },
);
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Restaurant = typeof restaurantsTable.$inferSelect;

// ── Menu Items ──────────────────────────────────────────────────────
export const restaurantMenusTable = pgTable("restaurant_menus", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurantsTable.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  category: menuCategoryEnum("category").notNull().default("main_course"),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  itemPhoto: text("item_photo"),
  isVeg: boolean("is_veg").notNull().default(true),
  isAvailable: boolean("is_available").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertMenuItemSchema = createInsertSchema(
  restaurantMenusTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof restaurantMenusTable.$inferSelect;

// ── Tables ────────────────────────────────────────────────────────────
export const restaurantTablesTable = pgTable("restaurant_tables", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurantsTable.id, { onDelete: "cascade" }),

  tableNumber: text("table_number").notNull(),
  capacity: integer("capacity").notNull().default(2),
  status: tableStatusEnum("status").notNull().default("available"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertTableSchema = createInsertSchema(
  restaurantTablesTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTable = z.infer<typeof insertTableSchema>;
export type RestaurantTable = typeof restaurantTablesTable.$inferSelect;

// ── Reservations ─────────────────────────────────────────────────────
export const restaurantReservationsTable = pgTable(
  "restaurant_reservations",
  {
    id: serial("id").primaryKey(),
    reservationRef: text("reservation_ref").notNull().unique(),

    restaurantId: integer("restaurant_id")
      .notNull()
      .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    tableId: integer("table_id").references(() => restaurantTablesTable.id, {
      onDelete: "set null",
    }),
    customerId: integer("customer_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),

    customerName: text("customer_name").notNull(),
    customerMobile: text("customer_mobile").notNull(),
    customerEmail: text("customer_email"),

    reservationDate: text("reservation_date").notNull(),
    reservationTime: text("reservation_time").notNull(),
    guestCount: integer("guest_count").notNull().default(1),
    specialRequest: text("special_request"),

    status: reservationStatusEnum("status").notNull().default("pending"),
    rejectionReason: text("rejection_reason"),
    cancelReason: text("cancel_reason"),

    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
);

export const insertReservationSchema = createInsertSchema(
  restaurantReservationsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  confirmedAt: true,
  completedAt: true,
  cancelledAt: true,
});
export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type Reservation = typeof restaurantReservationsTable.$inferSelect;
