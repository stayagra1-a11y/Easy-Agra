import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  pgEnum,
  jsonb,
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
