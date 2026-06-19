import { db, usersTable, activityLogsTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request } from "express";
import type { User } from "@workspace/db";

export function getIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

export async function logActivity(
  req: Request,
  actionType: string,
  description: string,
  userId?: number,
  userRole?: string,
): Promise<void> {
  await db.insert(activityLogsTable).values({
    userId: userId ?? null,
    userRole: userRole ?? null,
    actionType,
    description,
    ipAddress: getIp(req),
  });
}

export async function createNotification(
  userId: number,
  title: string,
  message: string,
  type: "welcome" | "owner_approved" | "owner_rejected" | "account_update" | "announcement" | "general",
): Promise<void> {
  await db.insert(notificationsTable).values({ userId, title, message, type });
}

export async function getUserById(id: number): Promise<User | undefined> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  return user;
}

export function safeUser(user: User) {
  const { passwordHash, resetToken, resetTokenExpiry, ...safe } = user;
  return {
    ...safe,
    createdAt: safe.createdAt.toISOString(),
    updatedAt: safe.updatedAt.toISOString(),
  };
}

declare module "express-session" {
  interface SessionData {
    userId?: number;
    rememberMe?: boolean;
  }
}
