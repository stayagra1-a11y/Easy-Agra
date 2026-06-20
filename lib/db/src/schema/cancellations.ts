import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { bookingTypeEnum } from "./payments";

export const cancellationStatusEnum = pgEnum("cancellation_status", [
  "requested",
  "approved",
  "rejected",
  "cancelled",
]);

export const cancellationsTable = pgTable("cancellations", {
  id: serial("id").primaryKey(),
  cancelRef: text("cancel_ref").notNull().unique(),
  bookingType: bookingTypeEnum("booking_type").notNull(),
  bookingId: integer("booking_id").notNull(),
  bookingRef: text("booking_ref").notNull(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id").references(() => usersTable.id),
  reason: text("reason").notNull(),
  status: cancellationStatusEnum("status").notNull().default("requested"),
  ownerNote: text("owner_note"),
  adminNote: text("admin_note"),
  processedBy: integer("processed_by").references(() => usersTable.id),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertCancellationSchema = createInsertSchema(
  cancellationsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCancellation = z.infer<typeof insertCancellationSchema>;
export type Cancellation = typeof cancellationsTable.$inferSelect;
