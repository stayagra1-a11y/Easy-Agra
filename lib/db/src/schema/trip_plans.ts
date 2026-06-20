import {
  pgTable,
  serial,
  integer,
  text,
  date,
  jsonb,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const travelTypeEnum = pgEnum("travel_type", [
  "solo",
  "couple",
  "family",
  "friends",
  "business",
]);

export const budgetCategoryEnum = pgEnum("budget_category", [
  "budget",
  "standard",
  "premium",
  "luxury",
]);

export const tripStatusEnum = pgEnum("trip_status", [
  "draft",
  "upcoming",
  "ongoing",
  "completed",
  "cancelled",
]);

export const tripPlansTable = pgTable("trip_plans", {
  id: serial("id").primaryKey(),
  tripRef: text("trip_ref").notNull().unique(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => usersTable.id),
  title: text("title"),
  arrivalDate: date("arrival_date").notNull(),
  departureDate: date("departure_date").notNull(),
  days: integer("days").notNull(),
  adults: integer("adults").notNull().default(1),
  children: integer("children").notNull().default(0),
  budget: text("budget").notNull(),
  travelType: travelTypeEnum("travel_type").notNull(),
  interests: jsonb("interests").$type<string[]>().notNull().default([]),
  budgetCategory: budgetCategoryEnum("budget_category").notNull(),
  status: tripStatusEnum("status").notNull().default("draft"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
