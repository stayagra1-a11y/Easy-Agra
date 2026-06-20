import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  pgEnum,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { hotelsTable } from "./hotels";
import { roomsTable } from "./rooms";

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "rejected",
  "cancelled",
  "checked_in",
  "checked_out",
]);

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  bookingRef: text("booking_ref").notNull().unique(),

  customerId: integer("customer_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  hotelId: integer("hotel_id")
    .notNull()
    .references(() => hotelsTable.id, { onDelete: "cascade" }),
  roomId: integer("room_id")
    .notNull()
    .references(() => roomsTable.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),

  checkInDate: text("check_in_date").notNull(),
  checkOutDate: text("check_out_date").notNull(),
  nights: integer("nights").notNull(),
  adultsCount: integer("adults_count").notNull().default(1),
  childrenCount: integer("children_count").notNull().default(0),

  earlyCheckIn: boolean("early_check_in").notNull().default(false),
  earlyCheckInAmount: numeric("early_check_in_amount", { precision: 10, scale: 2 }).notNull().default("0"),

  baseAmount: numeric("base_amount", { precision: 12, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("18"),
  finalAmount: numeric("final_amount", { precision: 12, scale: 2 }).notNull(),

  status: bookingStatusEnum("status").notNull().default("pending"),
  cancelReason: text("cancel_reason"),
  rejectionReason: text("rejection_reason"),
  customerNotes: text("customer_notes"),

  confirmedBy: integer("confirmed_by").references(() => usersTable.id),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  checkedOutAt: timestamp("checked_out_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
