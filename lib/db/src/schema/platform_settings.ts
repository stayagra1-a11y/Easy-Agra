import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const platformSettingsTable = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  appName: text("app_name").notNull().default("Easy Agra"),
  logo: text("logo"),
  contactEmail: text("contact_email"),
  supportEmail: text("support_email"),
  termsAndConditions: text("terms_and_conditions"),
  privacyPolicy: text("privacy_policy"),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertPlatformSettingsSchema = createInsertSchema(
  platformSettingsTable
).omit({
  id: true,
  updatedAt: true,
});
export type InsertPlatformSettings = z.infer<
  typeof insertPlatformSettingsSchema
>;
export type PlatformSettings = typeof platformSettingsTable.$inferSelect;
