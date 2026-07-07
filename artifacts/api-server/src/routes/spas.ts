import { Router } from "express";
import { db, spasTable, usersTable, spaAppointmentsTable } from "@workspace/db";
import {
  eq,
  and,
  ilike,
  sql,
  desc,
  inArray,
  isNull,
  isNotNull,
  or,
} from "drizzle-orm";
import { logActivity, createNotification } from "../lib/auth";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

type SpaRow = typeof spasTable.$inferSelect;

function serializeSpa(r: SpaRow, owner?: { fullName: string; email: string }) {
  return {
    ...r,
    galleryPhotos: Array.isArray(r.galleryPhotos) ? r.galleryPhotos : [],
    facilities: Array.isArray(r.facilities) ? r.facilities : [],
    ownerName: owner?.fullName ?? null,
    ownerEmail: owner?.email ?? null,
    createdAt:
      r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt:
      r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
    deletedAt:
      r.deletedAt instanceof Date
        ? r.deletedAt.toISOString()
        : (r.deletedAt ?? null),
  };
}

async function findSpa(id: number) {
  const [s] = await db
    .select()
    .from(spasTable)
    .where(eq(spasTable.id, id));
  return s;
}

async function notifyAdmins(title: string, message: string): Promise<void> {
  const admins = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(
      and(
        inArray(usersTable.role, ["admin", "super_admin"]),
        eq(usersTable.status, "active"),
      ),
    );
  await Promise.all(
    admins.map((a) => createNotification(a.id, title, message, "general")),
  );
}

// ────────────────────────────────────────────────────────────────────────
// GET /spas/my  —  BEFORE /spas/:id
// ────────────────────────────────────────────────────────────────────────
router.get(
  "/spas/my",
  requireRole("spa_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const rows = await db
      .select()
      .from(spasTable)
      .where(
        and(eq(spasTable.ownerId, cu.id), isNull(spasTable.deletedAt)),
      )
      .orderBy(desc(spasTable.createdAt));
    res.json(rows.map((r) => serializeSpa(r)));
  },
);

// ────────────────────────────────────────────────────────────────────────
// GET /spas/stats  —  BEFORE /spas/:id
// ────────────────────────────────────────────────────────────────────────
router.get(
  "/spas/stats",
  requireRole("spa_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;

    const rows = await db
      .select({ status: spasTable.status })
      .from(spasTable)
      .where(
        and(eq(spasTable.ownerId, cu.id), isNull(spasTable.deletedAt)),
      );

    const total = rows.length;
    const active = rows.filter((r) => r.status === "approved").length;
    const pending = rows.filter((r) => r.status === "pending").length;
    const draft = rows.filter((r) => r.status === "draft").length;

    const [apptStats] = await db
      .select({
        totalAppointments: sql<number>`count(*)::int`,
        pendingAppointments: sql<number>`sum(case when ${spaAppointmentsTable.status} = 'pending' then 1 else 0 end)::int`,
        monthlyRevenue: sql<number>`coalesce(sum(case when ${spaAppointmentsTable.status} = 'completed' and date_trunc('month', ${spaAppointmentsTable.completedAt}) = date_trunc('month', now()) then ${spaAppointmentsTable.amount}::numeric else 0 end), 0)::float`,
      })
      .from(spaAppointmentsTable)
      .where(eq(spaAppointmentsTable.ownerId, cu.id));

    res.json({
      totalSpas: total,
      activeSpas: active,
      pendingSpas: pending,
      draftSpas: draft,
      totalAppointments: apptStats?.totalAppointments ?? 0,
      pendingAppointments: apptStats?.pendingAppointments ?? 0,
      monthlyRevenue: parseFloat(String(apptStats?.monthlyRevenue ?? 0)),
    });
  },
);

// ────────────────────────────────────────────────────────────────────────
// GET /spas/browse  — public (customers), approved only, BEFORE /spas/:id
// ────────────────────────────────────────────────────────────────────────
router.get("/spas/browse", async (req, res): Promise<void> => {
  const { search, city, page = "1", limit = "20" } = req.query as any;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, parseInt(limit, 10));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [
    eq(spasTable.status, "approved"),
    isNull(spasTable.deletedAt),
  ];
  if (search) conditions.push(ilike(spasTable.name, `%${search}%`));
  if (city) conditions.push(ilike(spasTable.city, `%${city}%`));

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(spasTable)
    .where(and(...conditions));

  const spas = await db
    .select()
    .from(spasTable)
    .where(and(...conditions))
    .orderBy(spasTable.name)
    .limit(limitNum)
    .offset(offset);

  res.json({ spas: spas.map((s) => serializeSpa(s)), total, page: pageNum, limit: limitNum });
});

// ────────────────────────────────────────────────────────────────────────
// GET /spas  — admin list all
// ────────────────────────────────────────────────────────────────────────
router.get(
  "/spas",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const {
      search,
      status,
      city,
      page = "1",
      limit = "20",
    } = req.query as any;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, parseInt(limit, 10));
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [isNull(spasTable.deletedAt)];
    if (search) {
      conditions.push(
        or(
          ilike(spasTable.name, `%${search}%`),
          ilike(spasTable.city, `%${search}%`),
        )!,
      );
    }
    if (status) conditions.push(eq(spasTable.status, status as any));
    if (city) conditions.push(ilike(spasTable.city, `%${city}%`));

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(spasTable)
      .where(and(...conditions));

    const rows = await db
      .select({
        spa: spasTable,
        ownerName: usersTable.fullName,
        ownerEmail: usersTable.email,
      })
      .from(spasTable)
      .leftJoin(usersTable, eq(spasTable.ownerId, usersTable.id))
      .where(and(...conditions))
      .orderBy(desc(spasTable.createdAt))
      .limit(limitNum)
      .offset(offset);

    res.json({
      spas: rows.map((r) =>
        serializeSpa(r.spa, {
          fullName: r.ownerName ?? "",
          email: r.ownerEmail ?? "",
        }),
      ),
      total: countRow?.total ?? 0,
      page: pageNum,
      limit: limitNum,
    });
  },
);

// ────────────────────────────────────────────────────────────────────────
// POST /spas — create
// ────────────────────────────────────────────────────────────────────────
router.post(
  "/spas",
  requireRole("spa_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const {
      name,
      description,
      address,
      city,
      state,
      contactNumber,
      contactEmail,
      openingTime,
      closingTime,
      coverPhoto,
      galleryPhotos,
      facilities,
      googleMapLink,
    } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ error: "Spa name is required" });
      return;
    }

    const [s] = await db
      .insert(spasTable)
      .values({
        ownerId: cu.id,
        name: name.trim(),
        description: description?.trim() ?? null,
        address: address?.trim() ?? null,
        city: city?.trim() ?? null,
        state: state?.trim() ?? null,
        contactNumber: contactNumber?.trim() ?? null,
        contactEmail: contactEmail?.trim() ?? null,
        openingTime: openingTime?.trim() ?? null,
        closingTime: closingTime?.trim() ?? null,
        coverPhoto: coverPhoto ?? null,
        galleryPhotos: Array.isArray(galleryPhotos) ? galleryPhotos : [],
        facilities: Array.isArray(facilities) ? facilities : [],
        googleMapLink: googleMapLink?.trim() ?? null,
        status: "draft",
      })
      .returning();

    await logActivity(req, "spa_created", `Spa ${s.name} created`, cu.id, cu.role);
    await notifyAdmins("New Spa Added", `${cu.fullName} added spa: ${s.name}`);
    await createNotification(
      cu.id,
      "Spa Created",
      `Your spa "${s.name}" has been created as a draft. Submit it for admin approval.`,
      "general",
    );

    res.status(201).json(serializeSpa(s));
  },
);

// ────────────────────────────────────────────────────────────────────────
// GET /spas/:id — detail (auth required)
// ────────────────────────────────────────────────────────────────────────
router.get("/spas/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const cu = (req as any).currentUser;
  const s = await findSpa(id);
  if (!s || s.deletedAt) {
    res.status(404).json({ error: "Spa not found" });
    return;
  }

  // Spa owners can only see their own spas
  if (cu.role === "spa_owner" && s.ownerId !== cu.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [owner] = await db
    .select({ fullName: usersTable.fullName, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, s.ownerId));

  res.json(serializeSpa(s, owner));
});

// ────────────────────────────────────────────────────────────────────────
// PUT /spas/:id — update
// ────────────────────────────────────────────────────────────────────────
router.put(
  "/spas/:id",
  requireRole("spa_owner", "admin", "super_admin"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const s = await findSpa(id);
    if (!s || s.deletedAt) {
      res.status(404).json({ error: "Spa not found" });
      return;
    }
    if (cu.role === "spa_owner" && s.ownerId !== cu.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const {
      name,
      description,
      address,
      city,
      state,
      contactNumber,
      contactEmail,
      openingTime,
      closingTime,
      coverPhoto,
      galleryPhotos,
      facilities,
      googleMapLink,
    } = req.body;

    const [updated] = await db
      .update(spasTable)
      .set({
        name: name?.trim() ?? s.name,
        description: description?.trim() ?? s.description,
        address: address?.trim() ?? s.address,
        city: city?.trim() ?? s.city,
        state: state?.trim() ?? s.state,
        contactNumber: contactNumber?.trim() ?? s.contactNumber,
        contactEmail: contactEmail?.trim() ?? s.contactEmail,
        openingTime: openingTime?.trim() ?? s.openingTime,
        closingTime: closingTime?.trim() ?? s.closingTime,
        coverPhoto: coverPhoto !== undefined ? coverPhoto : s.coverPhoto,
        galleryPhotos: Array.isArray(galleryPhotos)
          ? galleryPhotos
          : s.galleryPhotos,
        facilities: Array.isArray(facilities) ? facilities : s.facilities,
        googleMapLink: googleMapLink !== undefined ? (googleMapLink?.trim() || null) : s.googleMapLink,
      })
      .where(eq(spasTable.id, id))
      .returning();

    await logActivity(req, "spa_updated", `Spa ${updated.name} updated`, cu.id, cu.role);
    res.json(serializeSpa(updated));
  },
);

// ────────────────────────────────────────────────────────────────────────
// DELETE /spas/:id — soft delete
// ────────────────────────────────────────────────────────────────────────
router.delete(
  "/spas/:id",
  requireRole("spa_owner", "admin", "super_admin"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const s = await findSpa(id);
    if (!s || s.deletedAt) {
      res.status(404).json({ error: "Spa not found" });
      return;
    }
    if (cu.role === "spa_owner" && s.ownerId !== cu.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await db
      .update(spasTable)
      .set({ deletedAt: new Date() })
      .where(eq(spasTable.id, id));

    await logActivity(req, "spa_deleted", `Spa ${s.name} deleted`, cu.id, cu.role);
    res.json({ success: true });
  },
);

// ────────────────────────────────────────────────────────────────────────
// POST /spas/:id/restore — restore deleted spa
// ────────────────────────────────────────────────────────────────────────
router.post(
  "/spas/:id/restore",
  requireRole("spa_owner", "admin", "super_admin"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const s = await findSpa(id);
    if (!s) {
      res.status(404).json({ error: "Spa not found" });
      return;
    }
    if (!s.deletedAt) {
      res.status(400).json({ error: "Spa is not deleted" });
      return;
    }
    if (cu.role === "spa_owner" && s.ownerId !== cu.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [restored] = await db
      .update(spasTable)
      .set({ deletedAt: null, status: "draft" })
      .where(eq(spasTable.id, id))
      .returning();

    await logActivity(req, "spa_restored", `Spa ${s.name} restored`, cu.id, cu.role);
    res.json(serializeSpa(restored));
  },
);

// ────────────────────────────────────────────────────────────────────────
// PUT /spas/:id/status — admin approval workflow
// ────────────────────────────────────────────────────────────────────────
router.put(
  "/spas/:id/status",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const s = await findSpa(id);
    if (!s || s.deletedAt) {
      res.status(404).json({ error: "Spa not found" });
      return;
    }

    const { status, rejectionReason } = req.body;
    const validStatuses = [
      "draft",
      "pending",
      "approved",
      "rejected",
      "suspended",
    ] as const;
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const [updated] = await db
      .update(spasTable)
      .set({
        status,
        rejectionReason:
          status === "rejected"
            ? (rejectionReason?.trim() ?? null)
            : s.rejectionReason,
      })
      .where(eq(spasTable.id, id))
      .returning();

    await logActivity(
      req,
      "spa_status_updated",
      `Spa ${s.name} status changed to ${status}`,
      cu.id,
      cu.role,
    );

    // Notify owner
    const notifMap: Record<string, [string, string]> = {
      approved: [
        "Spa Approved! 🎉",
        `Your spa "${s.name}" has been approved and is now visible to customers.`,
      ],
      rejected: [
        "Spa Rejected",
        `Your spa "${s.name}" was rejected. Reason: ${rejectionReason ?? "No reason provided"}.`,
      ],
      suspended: [
        "Spa Suspended",
        `Your spa "${s.name}" has been suspended. Please contact support.`,
      ],
    };
    const notif = notifMap[status];
    if (notif) {
      await createNotification(s.ownerId, notif[0], notif[1], "general");
    }

    res.json(serializeSpa(updated));
  },
);

// ────────────────────────────────────────────────────────────────────────
// PUT /spas/:id/submit — owner submits for approval
// ────────────────────────────────────────────────────────────────────────
router.put(
  "/spas/:id/submit",
  requireRole("spa_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const s = await findSpa(id);
    if (!s || s.deletedAt) {
      res.status(404).json({ error: "Spa not found" });
      return;
    }
    if (s.ownerId !== cu.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (!["draft", "rejected"].includes(s.status)) {
      res.status(400).json({ error: "Only draft or rejected spas can be submitted" });
      return;
    }

    const [updated] = await db
      .update(spasTable)
      .set({ status: "pending", rejectionReason: null })
      .where(eq(spasTable.id, id))
      .returning();

    await notifyAdmins(
      "Spa Awaiting Approval",
      `${cu.fullName} submitted spa "${s.name}" for approval.`,
    );
    await createNotification(
      cu.id,
      "Spa Submitted",
      `Your spa "${s.name}" has been submitted for admin review.`,
      "general",
    );

    await logActivity(req, "spa_submitted", `Spa ${s.name} submitted for approval`, cu.id, cu.role);
    res.json(serializeSpa(updated));
  },
);

// ──────────────────────────────────────────────────
// PATCH /spas/:id/upi — update UPI settings (owner only, any status)
// ──────────────────────────────────────────────────
router.patch(
  "/spas/:id/upi",
  requireRole("spa_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);

    const [spa] = await db.select().from(spasTable).where(eq(spasTable.id, id));
    if (!spa) { res.status(404).json({ error: "Spa not found" }); return; }
    if (spa.ownerId !== cu.id) { res.status(403).json({ error: "Access denied" }); return; }

    const { upiId, upiQrImage } = req.body;
    const [updated] = await db
      .update(spasTable)
      .set({
        upiId: upiId ? String(upiId).trim() : null,
        upiQrImage: upiQrImage || null,
      })
      .where(eq(spasTable.id, id))
      .returning();

    res.json(updated);
  },
);

export default router;
