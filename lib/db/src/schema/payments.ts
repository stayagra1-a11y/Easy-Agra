import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  pgEnum,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const paymentMethodEnum = pgEnum("payment_method", [
  "upi",
  "credit_card",
  "debit_card",
  "net_banking",
  "wallet",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "successful",
  "failed",
  "refunded",
  "partially_refunded",
]);

export const bookingTypeEnum = pgEnum("booking_type", [
  "hotel",
  "restaurant",
  "spa",
]);

export const paymentModeEnum = pgEnum("payment_mode", ["full", "advance"]);

export const paymentGatewayEnum = pgEnum("payment_gateway", [
  "razorpay",
  "stripe",
  "manual",
]);

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  paymentRef: text("payment_ref").notNull().unique(),

  bookingType: bookingTypeEnum("booking_type").notNull(),
  bookingId: integer("booking_id").notNull(),
  bookingRef: text("booking_ref").notNull(),

  customerId: integer("customer_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),

  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  currency: text("currency").notNull().default("INR"),

  paymentMode: paymentModeEnum("payment_mode").notNull().default("full"),
  paymentMethod: paymentMethodEnum("payment_method"),
  paymentStatus: paymentStatusEnum("payment_status")
    .notNull()
    .default("pending"),
  paymentGateway: paymentGatewayEnum("payment_gateway")
    .notNull()
    .default("manual"),

  gatewayOrderId: text("gateway_order_id"),
  gatewayPaymentId: text("gateway_payment_id"),
  gatewaySignature: text("gateway_signature"),

  failureReason: text("failure_reason"),
  notes: text("notes"),
  paidAt: timestamp("paid_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const refundStatusEnum = pgEnum("refund_status", [
  "pending",
  "approved",
  "rejected",
  "processed",
]);

export const refundReasonEnum = pgEnum("refund_reason", [
  "change_of_plan",
  "wrong_booking",
  "service_issue",
  "emergency",
  "other",
]);

export const refundTypeEnum = pgEnum("refund_type", [
  "full",
  "partial",
  "no_refund",
]);

export const refundsTable = pgTable("refunds", {
  id: serial("id").primaryKey(),
  refundRef: text("refund_ref").notNull().unique(),

  paymentId: integer("payment_id")
    .notNull()
    .references(() => paymentsTable.id, { onDelete: "cascade" }),

  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  status: refundStatusEnum("status").notNull().default("pending"),

  requestedBy: integer("requested_by")
    .notNull()
    .references(() => usersTable.id),
  processedBy: integer("processed_by").references(() => usersTable.id),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  gatewayRefundId: text("gateway_refund_id"),

  refundReason: refundReasonEnum("refund_reason"),
  refundType: refundTypeEnum("refund_type"),
  customerId: integer("customer_id").references(() => usersTable.id),
  bookingRef: text("booking_ref"),
  cancellationRef: text("cancellation_ref"),
  overriddenBy: integer("overridden_by").references(() => usersTable.id),
  adminNotes: text("admin_notes"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const transactionTypeEnum = pgEnum("transaction_type_enum", [
  "payment",
  "refund",
  "partial_refund",
]);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  transactionRef: text("transaction_ref").notNull().unique(),

  paymentId: integer("payment_id")
    .notNull()
    .references(() => paymentsTable.id, { onDelete: "cascade" }),

  type: transactionTypeEnum("transaction_type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("success"),
  metadata: jsonb("metadata"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;

export const insertRefundSchema = createInsertSchema(refundsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRefund = z.infer<typeof insertRefundSchema>;
export type Refund = typeof refundsTable.$inferSelect;

export type Transaction = typeof transactionsTable.$inferSelect;
