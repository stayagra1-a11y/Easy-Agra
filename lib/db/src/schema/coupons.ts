import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
  numeric,
  integer,
  date,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const couponTypeEnum = pgEnum("coupon_type", [
  "global",
  "festival",
  "first_booking",
  "seasonal",
]);

export const couponDiscountTypeEnum = pgEnum("coupon_discount_type", [
  "percentage",
  "flat",
]);

export const couponsTable = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  type: couponTypeEnum("type").notNull().default("global"),
  discountType: couponDiscountTypeEnum("discount_type").notNull().default("percentage"),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrderValue: numeric("min_order_value", { precision: 10, scale: 2 }).default("0"),
  maxDiscount: numeric("max_discount", { precision: 10, scale: 2 }),
  applicableOn: jsonb("applicable_on").$type<string[]>().default(["all"]),
  startDate: date("start_date"),
  endDate: date("end_date"),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertCouponSchema = createInsertSchema(couponsTable).omit({
  id: true,
  usedCount: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof couponsTable.$inferSelect;
