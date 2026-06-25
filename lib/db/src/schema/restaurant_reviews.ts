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
import { restaurantsTable } from "./restaurants";

export const restaurantReviewStatusEnum = pgEnum("restaurant_review_status", [
  "approved",
  "hidden",
  "removed",
]);

export const restaurantReviewsTable = pgTable("restaurant_reviews", {
  id: serial("id").primaryKey(),

  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurantsTable.id, { onDelete: "cascade" }),
  customerId: integer("customer_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),

  overallRating: integer("overall_rating").notNull(),
  foodQualityRating: integer("food_quality_rating").notNull(),
  serviceRating: integer("service_rating").notNull(),
  ambienceRating: integer("ambience_rating").notNull(),
  cleanlinessRating: integer("cleanliness_rating").notNull(),
  valueRating: integer("value_rating").notNull(),

  reviewTitle: text("review_title").notNull(),
  reviewDescription: text("review_description").notNull(),
  reviewPhotos: jsonb("review_photos").$type<string[]>().default([]),

  ownerReplyTitle: text("owner_reply_title"),
  ownerReplyMessage: text("owner_reply_message"),
  ownerRepliedAt: timestamp("owner_replied_at", { withTimezone: true }),

  status: restaurantReviewStatusEnum("status").notNull().default("approved"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type RestaurantReview = typeof restaurantReviewsTable.$inferSelect;
export type InsertRestaurantReview = typeof restaurantReviewsTable.$inferInsert;
