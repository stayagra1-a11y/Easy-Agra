import { Router } from "express";
import {
  db,
  supportTicketsTable,
  ticketMessagesTable,
  usersTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, desc, count, or, ilike, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { logActivity } from "../lib/auth";

const router = Router();

function genTicketRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${ts}-${rand}`;
}

function serializeTicket(t: typeof supportTicketsTable.$inferSelect) {
  return {
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    resolvedAt: t.resolvedAt?.toISOString() ?? null,
    closedAt: t.closedAt?.toISOString() ?? null,
  };
}

function serializeMessage(m: typeof ticketMessagesTable.$inferSelect) {
  return {
    ...m,
    createdAt: m.createdAt.toISOString(),
  };
}

async function sendTicketNotification(
  recipientId: number,
  title: string,
  body: string,
) {
  try {
    await db.insert(notificationsTable).values({
      userId: recipientId,
      title,
      message: body,
      type: "general",
      isRead: false,
    });
  } catch {
    // non-critical
  }
}

// ─── CUSTOMER / OWNER ROUTES ──────────────────────────────────────────────────

router.post(
  "/support/tickets",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const { subject, category, priority, description } = req.body as {
      subject: string;
      category: string;
      priority: string;
      description: string;
    };

    if (!subject || !category || !description) {
      res.status(400).json({ error: "subject, category, and description are required" });
      return;
    }

    const validCategories = [
      "hotel_issue", "booking_issue", "payment_issue", "refund_issue",
      "restaurant_issue", "spa_issue", "technical_issue", "other",
    ];
    const validPriorities = ["low", "medium", "high", "urgent"];

    if (!validCategories.includes(category)) {
      res.status(400).json({ error: "Invalid category" });
      return;
    }
    if (priority && !validPriorities.includes(priority)) {
      res.status(400).json({ error: "Invalid priority" });
      return;
    }

    const [ticket] = await db
      .insert(supportTicketsTable)
      .values({
        ticketRef: genTicketRef(),
        userId: user.id,
        subject,
        category: category as any,
        priority: (priority as any) ?? "medium",
        description,
        status: "open",
      })
      .returning();

    // Add initial message from the description
    await db.insert(ticketMessagesTable).values({
      ticketId: ticket.id,
      senderId: user.id,
      message: description,
      isInternal: false,
    });

    // Notify admins — fetch admin IDs
    const admins = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(or(eq(usersTable.role, "admin"), eq(usersTable.role, "super_admin")));
    for (const admin of admins) {
      await sendTicketNotification(
        admin.id,
        "New Support Ticket",
        `Ticket ${ticket.ticketRef}: ${subject}`,
      );
    }

    await logActivity(req, "ticket_created", `Ticket ${ticket.ticketRef} created`, user.id, user.role);
    res.status(201).json(serializeTicket(ticket));
  },
);

router.get(
  "/support/tickets",
  requireAuth,
  async (req, res) => {
    const user = (req as any).currentUser;
    const isAdmin = user.role === "admin" || user.role === "super_admin";

    if (isAdmin) {
      // Admins: redirect to admin route logic inline
      const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
      const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit ?? "20"))));
      const offset = (page - 1) * limit;
      const status = req.query.status as string | undefined;
      const priority = req.query.priority as string | undefined;
      const category = req.query.category as string | undefined;
      const search = req.query.search as string | undefined;

      const where: any[] = [];
      if (status && status !== "all") where.push(eq(supportTicketsTable.status, status as any));
      if (priority && priority !== "all") where.push(eq(supportTicketsTable.priority, priority as any));
      if (category && category !== "all") where.push(eq(supportTicketsTable.category, category as any));
      if (search) where.push(
        or(
          ilike(supportTicketsTable.subject, `%${search}%`),
          ilike(supportTicketsTable.ticketRef, `%${search}%`),
        ),
      );

      const whereClause = where.length ? and(...where) : undefined;

      const [rows, totalRows] = await Promise.all([
        db
          .select({
            ticket: supportTicketsTable,
            userFullName: usersTable.fullName,
            userEmail: usersTable.email,
          })
          .from(supportTicketsTable)
          .leftJoin(usersTable, eq(supportTicketsTable.userId, usersTable.id))
          .where(whereClause)
          .orderBy(desc(supportTicketsTable.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: count() }).from(supportTicketsTable).where(whereClause),
      ]);

      const tickets = rows.map(({ ticket, userFullName, userEmail }) => ({
        ...serializeTicket(ticket),
        userFullName: userFullName ?? null,
        userEmail: userEmail ?? null,
      }));

      res.json({ tickets, total: totalRows[0]?.count ?? 0, page, limit });
      return;
    }

    // Non-admin: own tickets only
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const limit = Math.max(1, Math.min(50, parseInt(String(req.query.limit ?? "20"))));
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const where: any[] = [eq(supportTicketsTable.userId, user.id)];
    if (status && status !== "all") where.push(eq(supportTicketsTable.status, status as any));

    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(supportTicketsTable)
        .where(and(...where))
        .orderBy(desc(supportTicketsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(supportTicketsTable).where(and(...where)),
    ]);

    res.json({
      tickets: rows.map(serializeTicket),
      total: totalRows[0]?.count ?? 0,
      page,
      limit,
    });
  },
);

router.get(
  "/support/tickets/:ref",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const ref = req.params.ref as string;
    const isAdmin = user.role === "admin" || user.role === "super_admin";

    const [ticket] = await db
      .select()
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.ticketRef, ref))
      .limit(1);

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    if (!isAdmin && ticket.userId !== user.id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const [messagesRows, ticketUser, assignedUser] = await Promise.all([
      db
        .select({
          msg: ticketMessagesTable,
          senderName: usersTable.fullName,
          senderRole: usersTable.role,
        })
        .from(ticketMessagesTable)
        .leftJoin(usersTable, eq(ticketMessagesTable.senderId, usersTable.id))
        .where(
          and(
            eq(ticketMessagesTable.ticketId, ticket.id),
            isAdmin ? sql`1=1` : eq(ticketMessagesTable.isInternal, false),
          ),
        )
        .orderBy(ticketMessagesTable.createdAt),
      db
        .select({ fullName: usersTable.fullName, email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, ticket.userId))
        .limit(1),
      ticket.assignedTo
        ? db
            .select({ fullName: usersTable.fullName })
            .from(usersTable)
            .where(eq(usersTable.id, ticket.assignedTo))
            .limit(1)
        : Promise.resolve([]),
    ]);

    const messages = messagesRows.map(({ msg, senderName, senderRole }) => ({
      ...serializeMessage(msg),
      senderName: senderName ?? "Unknown",
      senderRole: senderRole ?? null,
    }));

    res.json({
      ...serializeTicket(ticket),
      userFullName: ticketUser[0]?.fullName ?? null,
      userEmail: ticketUser[0]?.email ?? null,
      assignedToName: (assignedUser as any[])[0]?.fullName ?? null,
      messages,
    });
  },
);

router.post(
  "/support/tickets/:ref/messages",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const ref = req.params.ref as string;
    const isAdmin = user.role === "admin" || user.role === "super_admin";

    const [ticket] = await db
      .select()
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.ticketRef, ref))
      .limit(1);

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }
    if (!isAdmin && ticket.userId !== user.id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    if (ticket.status === "closed") {
      res.status(400).json({ error: "Cannot reply to a closed ticket" });
      return;
    }

    const { message, attachmentUrl, isInternal } = req.body as {
      message: string;
      attachmentUrl?: string | null;
      isInternal?: boolean;
    };

    if (!message?.trim()) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const [msg] = await db
      .insert(ticketMessagesTable)
      .values({
        ticketId: ticket.id,
        senderId: user.id,
        message: message.trim(),
        attachmentUrl: attachmentUrl ?? null,
        isInternal: isAdmin && isInternal ? true : false,
      })
      .returning();

    // Update ticket status on reply
    const newStatus =
      isAdmin && ticket.status === "open"
        ? "in_progress"
        : !isAdmin && ticket.status === "waiting_for_customer"
        ? "in_progress"
        : ticket.status;

    await db
      .update(supportTicketsTable)
      .set({ status: newStatus as any, updatedAt: new Date() })
      .where(eq(supportTicketsTable.id, ticket.id));

    // Notify other party
    const notifyId = isAdmin ? ticket.userId : null;
    if (notifyId) {
      await sendTicketNotification(
        notifyId,
        "New Reply on Your Ticket",
        `Ticket ${ticket.ticketRef}: New message added`,
      );
    }

    const [senderInfo] = await db
      .select({ fullName: usersTable.fullName, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .limit(1);

    res.status(201).json({
      ...serializeMessage(msg),
      senderName: senderInfo?.fullName ?? "Unknown",
      senderRole: senderInfo?.role ?? null,
    });
  },
);

router.patch(
  "/support/tickets/:ref/status",
  requireAuth,
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const ref = req.params.ref as string;
    const { status } = req.body as { status: string };

    const validStatuses = ["open", "in_progress", "waiting_for_customer", "resolved", "closed"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const [ticket] = await db
      .select()
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.ticketRef, ref))
      .limit(1);

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const now = new Date();
    const update: Record<string, any> = {
      status,
      updatedAt: now,
    };
    if (status === "resolved") update.resolvedAt = now;
    if (status === "closed") update.closedAt = now;

    const [updated] = await db
      .update(supportTicketsTable)
      .set(update)
      .where(eq(supportTicketsTable.id, ticket.id))
      .returning();

    // Notify ticket owner
    if (status === "resolved" || status === "closed") {
      await sendTicketNotification(
        ticket.userId,
        `Ticket ${status === "resolved" ? "Resolved" : "Closed"}`,
        `Your ticket ${ticket.ticketRef} has been ${status}`,
      );
    }

    await logActivity(req, "ticket_status_changed", `Ticket ${ref} → ${status}`, user.id, user.role);
    res.json(serializeTicket(updated));
  },
);

router.patch(
  "/support/tickets/:ref/assign",
  requireAuth,
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const ref = req.params.ref as string;
    const { assignedTo } = req.body as { assignedTo: number | null };

    const [ticket] = await db
      .select()
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.ticketRef, ref))
      .limit(1);

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const [updated] = await db
      .update(supportTicketsTable)
      .set({ assignedTo: assignedTo ?? null, updatedAt: new Date() } as any)
      .where(eq(supportTicketsTable.id, ticket.id))
      .returning();

    res.json(serializeTicket(updated));
  },
);

router.patch(
  "/support/tickets/:ref/close",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const ref = req.params.ref as string;

    const [ticket] = await db
      .select()
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.ticketRef, ref))
      .limit(1);

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }
    if (ticket.userId !== user.id && user.role !== "admin" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const [updated] = await db
      .update(supportTicketsTable)
      .set({ status: "closed", closedAt: new Date(), updatedAt: new Date() })
      .where(eq(supportTicketsTable.id, ticket.id))
      .returning();

    res.json(serializeTicket(updated));
  },
);

router.delete(
  "/support/tickets/:ref",
  requireAuth,
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;
    const ref = req.params.ref as string;

    const [ticket] = await db
      .select()
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.ticketRef, ref))
      .limit(1);

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    await db
      .delete(ticketMessagesTable)
      .where(eq(ticketMessagesTable.ticketId, ticket.id));
    await db
      .delete(supportTicketsTable)
      .where(eq(supportTicketsTable.id, ticket.id));

    await logActivity(req, "ticket_deleted", `Ticket ${ref} deleted`, user.id, user.role);
    res.json({ success: true });
  },
);

router.patch(
  "/support/tickets/:ref/reopen",
  requireAuth,
  requireRole("super_admin"),
  async (req, res): Promise<void> => {
    const ref = req.params.ref as string;

    const [ticket] = await db
      .select()
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.ticketRef, ref))
      .limit(1);

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const [updated] = await db
      .update(supportTicketsTable)
      .set({ status: "open", closedAt: null, resolvedAt: null, updatedAt: new Date() } as any)
      .where(eq(supportTicketsTable.id, ticket.id))
      .returning();

    res.json(serializeTicket(updated));
  },
);

// ─── ANALYTICS (super_admin) ──────────────────────────────────────────────────

router.get(
  "/support/analytics",
  requireAuth,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    const [all, byStatus, byCategory, byPriority] = await Promise.all([
      db.select({ count: count() }).from(supportTicketsTable),
      db
        .select({ status: supportTicketsTable.status, count: count() })
        .from(supportTicketsTable)
        .groupBy(supportTicketsTable.status),
      db
        .select({ category: supportTicketsTable.category, count: count() })
        .from(supportTicketsTable)
        .groupBy(supportTicketsTable.category),
      db
        .select({ priority: supportTicketsTable.priority, count: count() })
        .from(supportTicketsTable)
        .groupBy(supportTicketsTable.priority),
    ]);

    const statusMap = Object.fromEntries(byStatus.map((r) => [r.status, r.count]));
    const open = statusMap["open"] ?? 0;
    const inProgress = statusMap["in_progress"] ?? 0;
    const waitingForCustomer = statusMap["waiting_for_customer"] ?? 0;
    const resolved = statusMap["resolved"] ?? 0;
    const closed = statusMap["closed"] ?? 0;

    res.json({
      total: all[0]?.count ?? 0,
      open,
      inProgress,
      waitingForCustomer,
      resolved,
      closed,
      byCategory: byCategory.map((r) => ({ category: r.category, count: r.count })),
      byPriority: byPriority.map((r) => ({ priority: r.priority, count: r.count })),
    });
  },
);

export default router;
