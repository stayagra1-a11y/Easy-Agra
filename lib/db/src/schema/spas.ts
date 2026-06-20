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
export const spaStatusEnum = pgEnum("spa_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "suspended",
]);

export const spaServiceCategoryEnum = pgEnum("spa_service_category", [
  "full_body_massage",
  "head_massage",
  "foot_massage",
  "aromatherapy",
  "facial",
  "beauty_treatment",
  "couples_therapy",
  "wellness_package",
]);

export const spaAppointmentStatusEnum = pgEnum("spa_appointment_status", [
  "pending",
  "confirmed",
  "rejected",
  "completed",
  "cancelled",
]);

// ── Spas ──────────────────────────────────────────────────────────────
export const spasTable = pgTable("spas", {
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

  coverPhoto: text("cover_photo"),
  galleryPhotos: jsonb("gallery_photos").$type<string[]>(),

  facilities: jsonb("facilities").$type<string[]>(),

  status: spaStatusEnum("status").notNull().default("draft"),

  rejectionReason: text("rejection_reason"),

  deletedAt: timestamp("deleted_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertSpaSchema = createInsertSchema(spasTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  rejectionReason: true,
});
export type InsertSpa = z.infer<typeof insertSpaSchema>;
export type Spa = typeof spasTable.$inferSelect;

// ── Spa Services ───────────────────────────────────────────────────────
export const spaServicesTable = pgTable("spa_services", {
  id: serial("id").primaryKey(),
  spaId: integer("spa_id")
    .notNull()
    .references(() => spasTable.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  category: spaServiceCategoryEnum("category")
    .notNull()
    .default("full_body_massage"),
  description: text("description"),
  duration: integer("duration").notNull().default(60),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  serviceImage: text("service_image"),
  isAvailable: boolean("is_available").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertSpaServiceSchema = createInsertSchema(
  spaServicesTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSpaService = z.infer<typeof insertSpaServiceSchema>;
export type SpaService = typeof spaServicesTable.$inferSelect;

// ── Spa Appointments ───────────────────────────────────────────────────
export const spaAppointmentsTable = pgTable("spa_appointments", {
  id: serial("id").primaryKey(),
  appointmentRef: text("appointment_ref").notNull().unique(),

  spaId: integer("spa_id")
    .notNull()
    .references(() => spasTable.id, { onDelete: "cascade" }),
  serviceId: integer("service_id").references(() => spaServicesTable.id, {
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

  serviceName: text("service_name").notNull(),
  appointmentDate: text("appointment_date").notNull(),
  appointmentTime: text("appointment_time").notNull(),
  numberOfPersons: integer("number_of_persons").notNull().default(1),
  specialRequest: text("special_request"),

  amount: numeric("amount", { precision: 10, scale: 2 }),

  status: spaAppointmentStatusEnum("status").notNull().default("pending"),
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
});

export const insertSpaAppointmentSchema = createInsertSchema(
  spaAppointmentsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  confirmedAt: true,
  completedAt: true,
  cancelledAt: true,
});
export type InsertSpaAppointment = z.infer<typeof insertSpaAppointmentSchema>;
export type SpaAppointment = typeof spaAppointmentsTable.$inferSelect;
