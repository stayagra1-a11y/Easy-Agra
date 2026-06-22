import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { hotelsTable } from "./hotels";

export const hotelCommissionAgreementsTable = pgTable("hotel_commission_agreements", {
  id: serial("id").primaryKey(),

  hotelId: integer("hotel_id")
    .notNull()
    .references(() => hotelsTable.id, { onDelete: "cascade" }),

  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),

  commissionRate: numeric("commission_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("15.00"),

  agreed: boolean("agreed").notNull().default(false),
  agreedAt: timestamp("agreed_at", { withTimezone: true }),

  // Platform copy fields
  agreementText: text("agreement_text"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertHotelCommissionAgreementSchema = createInsertSchema(
  hotelCommissionAgreementsTable
).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertHotelCommissionAgreement = z.infer<
  typeof insertHotelCommissionAgreementSchema
>;
export type HotelCommissionAgreement =
  typeof hotelCommissionAgreementsTable.$inferSelect;
