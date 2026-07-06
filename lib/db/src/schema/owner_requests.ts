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
  // Business info
  businessName: text("business_name"),
  businessDescription: text("business_description"),
  businessAddress: text("business_address"),
  city: text("city"),
  state: text("state"),
  gstNumber: text("gst_number"),
  // Owner contact info (may differ from account)
  ownerName: text("owner_name"),
  ownerMobile: text("owner_mobile"),
  ownerEmail: text("owner_email"),
  // Files stored as base64 data URIs
  businessPhotos: jsonb("business_photos").$type<string[]>(),
  identityProof: text("identity_proof"),
  identityProofBack: text("identity_proof_back"),
  // Review
  rejectionReason: text("rejection_reason"),
  reviewedBy: integer("reviewed_by").references(() => usersTable.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
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
