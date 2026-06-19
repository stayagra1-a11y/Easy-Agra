import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { hotelsTable } from "./hotels";
import { bookingsTable } from "./bookings";

export const reviewStatusEnum = pgEnum("review_status", [
  "approved",
  "hidden",
  "removed",
]);

export const reviewReportStatusEnum = pgEnum("review_report_status", [
  "none",
  "pending",
  "reviewed",
]);

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),

  bookingId: integer("booking_id")
    .notNull()
    .unique()
    .references(() => bookingsTable.id, { onDelete: "cascade" }),
  hotelId: integer("hotel_id")
    .notNull()
    .references(() => hotelsTable.id, { onDelete: "cascade" }),
  customerId: integer("customer_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),

  overallRating: integer("overall_rating").notNull(),
  cleanlinessRating: integer("cleanliness_rating").notNull(),
  roomQualityRating: integer("room_quality_rating").notNull(),
  staffRating: integer("staff_rating").notNull(),
  locationRating: integer("location_rating").notNull(),
  valueRating: integer("value_rating").notNull(),

  reviewTitle: text("review_title").notNull(),
  reviewDescription: text("review_description").notNull(),
  reviewPhotos: jsonb("review_photos").$type<string[]>().default([]),

  ownerReplyTitle: text("owner_reply_title"),
  ownerReplyMessage: text("owner_reply_message"),
  ownerRepliedAt: timestamp("owner_replied_at", { withTimezone: true }),

  status: reviewStatusEnum("status").notNull().default("approved"),

  reportCount: integer("report_count").notNull().default(0),
  reportReasons: jsonb("report_reasons").$type<string[]>().default([]),
  reportedByIds: jsonb("reported_by_ids").$type<number[]>().default([]),
  reportStatus: reviewReportStatusEnum("report_status").notNull().default("none"),

  editableUntil: timestamp("editable_until", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Review = typeof reviewsTable.$inferSelect;
export type InsertReview = typeof reviewsTable.$inferInsert;
