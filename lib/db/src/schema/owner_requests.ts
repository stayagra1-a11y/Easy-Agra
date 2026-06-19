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

export const ownerRequestedRoleEnum = pgEnum("owner_requested_role", [
  "hotel_owner",
  "restaurant_owner",
  "spa_owner",
]);

export const ownerRequestStatusEnum = pgEnum("owner_request_status", [
  "pending",
  "approved",
  "rejected",
]);

export const ownerRequestsTable = pgTable("owner_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  requestedRole: ownerRequestedRoleEnum("requested_role").notNull(),
  status: ownerRequestStatusEnum("status").notNull().default("pending"),
  businessName: text("business_name"),
  businessDescription: text("business_description"),
  rejectionReason: text("rejection_reason"),
  reviewedBy: integer("reviewed_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertOwnerRequestSchema = createInsertSchema(
  ownerRequestsTable
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOwnerRequest = z.infer<typeof insertOwnerRequestSchema>;
export type OwnerRequest = typeof ownerRequestsTable.$inferSelect;
