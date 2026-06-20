import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const ticketCategoryEnum = pgEnum("ticket_category", [
  "hotel_issue",
  "booking_issue",
  "payment_issue",
  "refund_issue",
  "restaurant_issue",
  "spa_issue",
  "technical_issue",
  "other",
]);

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "waiting_for_customer",
  "resolved",
  "closed",
]);

export const supportTicketsTable = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  ticketRef: text("ticket_ref").notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  subject: text("subject").notNull(),
  category: ticketCategoryEnum("category").notNull(),
  priority: ticketPriorityEnum("priority").notNull().default("medium"),
  status: ticketStatusEnum("status").notNull().default("open"),
  description: text("description").notNull(),
  assignedTo: integer("assigned_to").references(() => usersTable.id),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ticketMessagesTable = pgTable("ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => supportTicketsTable.id),
  senderId: integer("sender_id")
    .notNull()
    .references(() => usersTable.id),
  message: text("message").notNull(),
  attachmentUrl: text("attachment_url"),
  isInternal: boolean("is_internal").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
