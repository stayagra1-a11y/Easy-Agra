import {
  pgTable,
  text,
  serial,
  timestamp,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "admin",
  "hotel_owner",
  "restaurant_owner",
  "spa_owner",
  "customer",
]);

export const userStatusEnum = pgEnum("user_status", [
  "pending",
  "active",
  "suspended",
  "rejected",
  "banned",
]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  mobile: text("mobile").notNull(),
  passwordHash: text("password_hash"),
  city: text("city"),
  state: text("state"),
  role: userRoleEnum("role").notNull().default("customer"),
  status: userStatusEnum("status").notNull().default("active"),
  profilePhoto: text("profile_photo"),
  emailVerified: boolean("email_verified").notNull().default(true),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpiry: timestamp("email_verification_expiry", { withTimezone: true }),
  googleId: text("google_id").unique(),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
