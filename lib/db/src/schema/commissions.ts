import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  pgEnum,
  numeric,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { paymentsTable, bookingTypeEnum } from "./payments";

export const earningStatusEnum = pgEnum("earning_status", [
  "pending",
  "credited",
  "withdrawn",
]);

export const payoutStatusEnum = pgEnum("payout_status", [
  "pending",
  "approved",
  "rejected",
  "paid",
]);

export const commissionConfigsTable = pgTable("commission_configs", {
  id: serial("id").primaryKey(),
  bookingType: bookingTypeEnum("booking_type").notNull().unique(),
  rate: numeric("rate", { precision: 5, scale: 2 }).notNull().default("10.00"),
  isActive: boolean("is_active").notNull().default(true),
  description: text("description"),
  updatedBy: integer("updated_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const ownerEarningsTable = pgTable("owner_earnings", {
  id: serial("id").primaryKey(),
  earningRef: text("earning_ref").notNull().unique(),

  paymentId: integer("payment_id")
    .notNull()
    .references(() => paymentsTable.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),

  bookingType: bookingTypeEnum("booking_type").notNull(),

  grossAmount: numeric("gross_amount", { precision: 12, scale: 2 }).notNull(),
  commissionRate: numeric("commission_rate", {
    precision: 5,
    scale: 2,
  }).notNull(),
  commissionAmount: numeric("commission_amount", {
    precision: 12,
    scale: 2,
  }).notNull(),
  netAmount: numeric("net_amount", { precision: 12, scale: 2 }).notNull(),

  status: earningStatusEnum("status").notNull().default("pending"),
  creditedAt: timestamp("credited_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const payoutsTable = pgTable("payouts", {
  id: serial("id").primaryKey(),
  payoutRef: text("payout_ref").notNull().unique(),

  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),

  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: payoutStatusEnum("status").notNull().default("pending"),

  bankDetails: jsonb("bank_details"),
  notes: text("notes"),
  rejectionReason: text("rejection_reason"),

  processedBy: integer("processed_by").references(() => usersTable.id),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertCommissionConfigSchema = createInsertSchema(
  commissionConfigsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCommissionConfig = z.infer<
  typeof insertCommissionConfigSchema
>;
export type CommissionConfig = typeof commissionConfigsTable.$inferSelect;

export const insertOwnerEarningSchema = createInsertSchema(
  ownerEarningsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOwnerEarning = z.infer<typeof insertOwnerEarningSchema>;
export type OwnerEarning = typeof ownerEarningsTable.$inferSelect;

export const insertPayoutSchema = createInsertSchema(payoutsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPayout = z.infer<typeof insertPayoutSchema>;
export type Payout = typeof payoutsTable.$inferSelect;
