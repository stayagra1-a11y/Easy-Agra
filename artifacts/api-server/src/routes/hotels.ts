import { Router } from "express";
import { db, hotelsTable, usersTable, hotelNearbyPlacesTable, hotelCommissionAgreementsTable } from "@workspace/db";
import { eq, and, ilike, sql, isNull, asc, desc } from "drizzle-orm";
import { logActivity, createNotification } from "../lib/auth";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

function serializeNearby(r: typeof hotelNearbyPlacesTable.$inferSelect) {
  return {
    ...r,
    distanceKm: r.distanceKm ? parseFloat(String(r.distanceKm)) : null,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

function serializeHotel(h: typeof hotelsTable.$inferSelect) {
  return {
    ...h,
    createdAt: h.createdAt.toISOString(),
    updatedAt: h.updatedAt.toISOString(),
    approvedAt: h.approvedAt?.toISOString() ?? null,
    deletedAt: h.deletedAt?.toISOString() ?? null,
  };
}

async function findHotel(id: number) {
  const [hotel] = await db.select().from(hotelsTable).where(eq(hotelsTable.id, id));
  return hotel;
}

function ownerGuard(hotel: typeof hotelsTable.$inferSelect, userId: number, role: string): boolean {
  if (role === "admin" || role === "super_admin") return true;
  return hotel.ownerId === userId;
}

// ──────────────────────────────────────────────────
// GET /hotels/stats — MUST be before /:id
// ──────────────────────────────────────────────────
router.get("/hotels/stats", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const baseCondition =
    cu.role === "hotel_owner"
      ? eq(hotelsTable.ownerId, cu.id)
      : undefined;

  const [row] = await db
    .select({
      totalHotels: sql<number>`count(*)::int`,
      draftHotels: sql<number>`sum(case when ${hotelsTable.status}='draft' then 1 else 0 end)::int`,
      pendingHotels: sql<number>`sum(case when ${hotelsTable.status}='pending' then 1 else 0 end)::int`,
      approvedHotels: sql<number>`sum(case when ${hotelsTable.status}='approved' then 1 else 0 end)::int`,
      rejectedHotels: sql<number>`sum(case when ${hotelsTable.status}='rejected' then 1 else 0 end)::int`,
      suspendedHotels: sql<number>`sum(case when ${hotelsTable.status}='suspended' then 1 else 0 end)::int`,
      deletedHotels: sql<number>`sum(case when ${hotelsTable.deletedAt} is not null then 1 else 0 end)::int`,
    })
    .from(hotelsTable)
    .where(baseCondition);

  res.json({
    totalHotels: row?.totalHotels ?? 0,
    draftHotels: row?.draftHotels ?? 0,
    pendingHotels: row?.pendingHotels ?? 0,
    approvedHotels: row?.approvedHotels ?? 0,
    rejectedHotels: row?.rejectedHotels ?? 0,
    suspendedHotels: row?.suspendedHotels ?? 0,
    deletedHotels: row?.deletedHotels ?? 0,
  });
});

// ──────────────────────────────────────────────────
// GET /hotels — list
// ──────────────────────────────────────────────────
router.get("/hotels", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const { status, search, city, page = "1", limit = "20", sort } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];

  if (cu.role === "hotel_owner") {
    conditions.push(eq(hotelsTable.ownerId, cu.id));
    conditions.push(isNull(hotelsTable.deletedAt));
  } else {
    conditions.push(isNull(hotelsTable.deletedAt));
  }

  if (status) conditions.push(eq(hotelsTable.status, status as any));
  if (search) conditions.push(ilike(hotelsTable.name, `%${search}%`));
  if (city) conditions.push(ilike(hotelsTable.city!, `%${city}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [hotels, countResult] = await Promise.all([
    db.select().from(hotelsTable).where(where)
      .orderBy(
        ...(sort === "top"
          ? [sql`${hotelsTable.starRating} DESC NULLS LAST`, desc(hotelsTable.createdAt)]
          : [hotelsTable.createdAt])
      ).limit(limitNum).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(hotelsTable).where(where),
  ]);

  res.json({
    hotels: hotels.map(serializeHotel),
    total: countResult[0]?.count ?? 0,
    page: pageNum,
    limit: limitNum,
  });
});

// ──────────────────────────────────────────────────
// POST /hotels — create
// ──────────────────────────────────────────────────
router.post("/hotels", requireRole("hotel_owner"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const {
    name, description, category, address, city, state, pincode, googleMapLink, landmark,
    contactPerson, contactMobile, contactEmail, website,
    checkInTime, checkOutTime, totalRooms, policies, cancellationPolicy,
    amenities, coverImage, galleryImages, categorizedPhotos,
  } = req.body;

  if (!name || !String(name).trim()) {
    res.status(400).json({ error: "Hotel name is required" });
    return;
  }

  const [hotel] = await db.insert(hotelsTable).values({
    ownerId: cu.id,
    name: String(name).trim(),
    description: description || null,
    category: category || "standard",
    address: address || null,
    city: city || null,
    state: state || null,
    pincode: pincode || null,
    googleMapLink: googleMapLink || null,
    landmark: landmark || null,
    contactPerson: contactPerson || null,
    contactMobile: contactMobile || null,
    contactEmail: contactEmail || null,
    website: website || null,
    checkInTime: checkInTime || null,
    checkOutTime: checkOutTime || null,
    totalRooms: totalRooms ? parseInt(String(totalRooms), 10) : null,
    policies: policies || null,
    cancellationPolicy: cancellationPolicy || null,
    amenities: Array.isArray(amenities) ? amenities : [],
    coverImage: coverImage || null,
    galleryImages: Array.isArray(galleryImages) ? galleryImages : [],
    categorizedPhotos: Array.isArray(categorizedPhotos) ? categorizedPhotos : [],
    status: "draft",
  }).returning();

  await logActivity(req, "hotel_created", `Hotel "${hotel.name}" created`, cu.id, cu.role);

  res.status(201).json(serializeHotel(hotel));
});

// ──────────────────────────────────────────────────
// GET /hotels/:id
// ──────────────────────────────────────────────────
router.get("/hotels/:id", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id as string, 10);
  const hotel = await findHotel(id);
  if (!hotel || hotel.deletedAt) { res.status(404).json({ error: "Hotel not found" }); return; }
  // Approved hotels are publicly viewable by any authenticated user
  const canView = hotel.status === "approved" || ownerGuard(hotel, cu.id, cu.role);
  if (!canView) { res.status(403).json({ error: "Access denied" }); return; }
  res.json(serializeHotel(hotel));
});

// ──────────────────────────────────────────────────
// PUT /hotels/:id — update (only owner, only draft/rejected)
// ──────────────────────────────────────────────────
router.put("/hotels/:id", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id as string, 10);
  const hotel = await findHotel(id);
  if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }
  if (!ownerGuard(hotel, cu.id, cu.role)) { res.status(403).json({ error: "Access denied" }); return; }

  const isOwnerEditingApproved = cu.role === "hotel_owner" && !["draft", "rejected"].includes(hotel.status);

  const {
    name, description, category, address, city, state, pincode, googleMapLink, landmark,
    contactPerson, contactMobile, contactEmail, website,
    checkInTime, checkOutTime, totalRooms, policies, cancellationPolicy,
    amenities, coverImage, galleryImages, categorizedPhotos,
    earlyCheckInEnabled, earlyCheckInTime, earlyCheckInPrice,
  } = req.body;

  const updates: Partial<typeof hotelsTable.$inferInsert> = {};

  if (isOwnerEditingApproved) {
    // Approved hotels: owners can only update photos/media
    if (coverImage !== undefined) updates.coverImage = coverImage || null;
    if (galleryImages !== undefined) updates.galleryImages = Array.isArray(galleryImages) ? galleryImages : [];
    if (categorizedPhotos !== undefined) updates.categorizedPhotos = Array.isArray(categorizedPhotos) ? categorizedPhotos : [];
  } else {
    // Draft / rejected hotels (owner) OR admin/super_admin: full update allowed
    if (name !== undefined) updates.name = String(name).trim();
    if (description !== undefined) updates.description = description || null;
    if (category !== undefined) updates.category = category;
    if (address !== undefined) updates.address = address || null;
    if (city !== undefined) updates.city = city || null;
    if (state !== undefined) updates.state = state || null;
    if (pincode !== undefined) updates.pincode = pincode || null;
    if (googleMapLink !== undefined) updates.googleMapLink = googleMapLink || null;
    if (landmark !== undefined) updates.landmark = landmark || null;
    if (contactPerson !== undefined) updates.contactPerson = contactPerson || null;
    if (contactMobile !== undefined) updates.contactMobile = contactMobile || null;
    if (contactEmail !== undefined) updates.contactEmail = contactEmail || null;
    if (website !== undefined) updates.website = website || null;
    if (checkInTime !== undefined) updates.checkInTime = checkInTime || null;
    if (checkOutTime !== undefined) updates.checkOutTime = checkOutTime || null;
    if (totalRooms !== undefined) updates.totalRooms = totalRooms ? parseInt(String(totalRooms), 10) : null;
    if (policies !== undefined) updates.policies = policies || null;
    if (cancellationPolicy !== undefined) updates.cancellationPolicy = cancellationPolicy || null;
    if (amenities !== undefined) updates.amenities = Array.isArray(amenities) ? amenities : [];
    if (coverImage !== undefined) updates.coverImage = coverImage || null;
    if (galleryImages !== undefined) updates.galleryImages = Array.isArray(galleryImages) ? galleryImages : [];
    if (categorizedPhotos !== undefined) updates.categorizedPhotos = Array.isArray(categorizedPhotos) ? categorizedPhotos : [];
    if (earlyCheckInEnabled !== undefined) updates.earlyCheckInEnabled = Boolean(earlyCheckInEnabled);
    if (earlyCheckInTime !== undefined) updates.earlyCheckInTime = earlyCheckInTime || null;
    if (earlyCheckInPrice !== undefined) updates.earlyCheckInPrice = earlyCheckInPrice != null ? String(parseFloat(String(earlyCheckInPrice)).toFixed(2)) : null;
  }

  const [updated] = await db.update(hotelsTable).set(updates).where(eq(hotelsTable.id, id)).returning();
  await logActivity(req, "hotel_updated", `Hotel "${updated.name}" updated`, cu.id, cu.role);
  res.json(serializeHotel(updated));
});

// ──────────────────────────────────────────────────
// DELETE /hotels/:id — soft delete
// ──────────────────────────────────────────────────
router.delete("/hotels/:id", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id as string, 10);
  const hotel = await findHotel(id);
  if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }
  if (!ownerGuard(hotel, cu.id, cu.role)) { res.status(403).json({ error: "Access denied" }); return; }
  if (hotel.deletedAt) { res.status(400).json({ error: "Hotel already deleted" }); return; }

  await db.update(hotelsTable).set({ deletedAt: new Date() }).where(eq(hotelsTable.id, id));
  await logActivity(req, "hotel_deleted", `Hotel "${hotel.name}" deleted`, cu.id, cu.role);
  res.json({ message: "Hotel deleted" });
});

// ──────────────────────────────────────────────────
// POST /hotels/:id/submit — submit for approval
// ──────────────────────────────────────────────────
router.post("/hotels/:id/submit", requireRole("hotel_owner"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id as string, 10);
  const hotel = await findHotel(id);
  if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }
  if (hotel.ownerId !== cu.id) { res.status(403).json({ error: "Access denied" }); return; }
  if (!["draft", "rejected"].includes(hotel.status)) {
    res.status(400).json({ error: "Hotel can only be submitted from draft or rejected state" });
    return;
  }

  // Check commission agreement
  const [agreement] = await db
    .select()
    .from(hotelCommissionAgreementsTable)
    .where(eq(hotelCommissionAgreementsTable.hotelId, id));

  if (!agreement || !agreement.agreed) {
    res.status(400).json({ error: "Commission agreement not accepted. Please agree to the 15% commission agreement before submitting." });
    return;
  }

  const [updated] = await db.update(hotelsTable)
    .set({ status: "pending", rejectionReason: null })
    .where(eq(hotelsTable.id, id)).returning();

  await logActivity(req, "hotel_submitted", `Hotel "${hotel.name}" submitted for approval`, cu.id, cu.role);
  res.json(serializeHotel(updated));
});

// ──────────────────────────────────────────────────
// POST /hotels/:id/approve — admin/super_admin
// ──────────────────────────────────────────────────
router.post("/hotels/:id/approve", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id as string, 10);
  const hotel = await findHotel(id);
  if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }

  const [updated] = await db.update(hotelsTable)
    .set({ status: "approved", rejectionReason: null, reviewedBy: cu.id, approvedAt: new Date() })
    .where(eq(hotelsTable.id, id)).returning();

  await logActivity(req, "hotel_approved", `Hotel "${hotel.name}" approved`, cu.id, cu.role);
  await createNotification(hotel.ownerId, "Hotel Approved ✓", `Your hotel "${hotel.name}" has been approved and is now publicly visible.`, "general");
  res.json(serializeHotel(updated));
});

// ──────────────────────────────────────────────────
// POST /hotels/:id/reject — admin/super_admin
// ──────────────────────────────────────────────────
router.post("/hotels/:id/reject", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id as string, 10);
  const { reason } = req.body;
  if (!reason || !String(reason).trim()) { res.status(400).json({ error: "Rejection reason is required" }); return; }

  const hotel = await findHotel(id);
  if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }

  const [updated] = await db.update(hotelsTable)
    .set({ status: "rejected", rejectionReason: String(reason).trim(), reviewedBy: cu.id })
    .where(eq(hotelsTable.id, id)).returning();

  await logActivity(req, "hotel_rejected", `Hotel "${hotel.name}" rejected`, cu.id, cu.role);
  await createNotification(hotel.ownerId, "Hotel Rejected", `Your hotel "${hotel.name}" was rejected. Reason: ${reason}`, "general");
  res.json(serializeHotel(updated));
});

// ──────────────────────────────────────────────────
// POST /hotels/:id/suspend — admin/super_admin
// ──────────────────────────────────────────────────
router.post("/hotels/:id/suspend", requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id as string, 10);
  const hotel = await findHotel(id);
  if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }

  const [updated] = await db.update(hotelsTable)
    .set({ status: "suspended", reviewedBy: cu.id })
    .where(eq(hotelsTable.id, id)).returning();

  await logActivity(req, "hotel_suspended", `Hotel "${hotel.name}" suspended`, cu.id, cu.role);
  await createNotification(hotel.ownerId, "Hotel Suspended", `Your hotel "${hotel.name}" has been suspended. Contact support for more information.`, "general");
  res.json(serializeHotel(updated));
});

// ──────────────────────────────────────────────────
// POST /hotels/:id/restore — super_admin only (restore soft-deleted)
// ──────────────────────────────────────────────────
// ──────────────────────────────────────────────────
// PATCH /hotels/:id/upi — update UPI settings (owner only, any status)
// ──────────────────────────────────────────────────
router.patch("/hotels/:id/upi", requireRole("hotel_owner"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id as string, 10);
  const hotel = await findHotel(id);
  if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }
  if (hotel.ownerId !== cu.id) { res.status(403).json({ error: "Access denied" }); return; }

  const { upiId, upiQrImage } = req.body;
  const [updated] = await db
    .update(hotelsTable)
    .set({
      upiId: upiId ? String(upiId).trim() : null,
      upiQrImage: upiQrImage || null,
    })
    .where(eq(hotelsTable.id, id))
    .returning();

  await logActivity(req, "hotel_updated", `Hotel "${updated.name}" UPI settings updated`, cu.id, cu.role);
  res.json(serializeHotel(updated));
});

// ── Nearby Places ──────────────────────────────────────────────────────────
// GET /hotels/:id/nearby
router.get("/hotels/:id/nearby", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const hotel = await findHotel(id);
  if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }
  const nearby = await db
    .select()
    .from(hotelNearbyPlacesTable)
    .where(eq(hotelNearbyPlacesTable.hotelId, id))
    .orderBy(asc(hotelNearbyPlacesTable.distanceKm));
  res.json({ nearby: nearby.map(serializeNearby) });
});

// POST /hotels/:id/nearby
router.post("/hotels/:id/nearby", requireRole("hotel_owner", "admin", "super_admin"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid hotel ID" }); return; }
  const hotel = await findHotel(id);
  if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }
  if (!ownerGuard(hotel, cu.id, cu.role)) { res.status(403).json({ error: "Is hotel ko edit karne ki permission nahi hai" }); return; }
  const { placeName, category, distanceKm, estimatedTimeMinutes } = req.body;
  if (!placeName?.trim()) { res.status(400).json({ error: "Jagah ka naam zaroori hai" }); return; }
  const validCategories = ["tourist_place", "railway_station", "airport", "bus_stand", "hospital", "market", "other"];
  const safeCategory = validCategories.includes(category) ? category : "tourist_place";
  const safeDistanceKm = distanceKm != null && !isNaN(parseFloat(distanceKm)) ? String(parseFloat(distanceKm)) : null;
  const safeTime = estimatedTimeMinutes != null && !isNaN(parseInt(estimatedTimeMinutes, 10)) ? parseInt(estimatedTimeMinutes, 10) : null;
  const [row] = await db.insert(hotelNearbyPlacesTable).values({
    hotelId: id,
    placeName: placeName.trim(),
    category: safeCategory as any,
    distanceKm: safeDistanceKm,
    estimatedTimeMinutes: safeTime,
  }).returning();
  res.status(201).json(serializeNearby(row));
});

// PUT /hotels/:id/nearby/:nearbyId
router.put("/hotels/:id/nearby/:nearbyId", requireRole("hotel_owner", "admin", "super_admin"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id as string, 10);
  const nearbyId = parseInt(req.params.nearbyId as string, 10);
  const hotel = await findHotel(id);
  if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }
  if (!ownerGuard(hotel, cu.id, cu.role)) { res.status(403).json({ error: "Access denied" }); return; }
  const { placeName, category, distanceKm, estimatedTimeMinutes } = req.body;
  const [row] = await db.update(hotelNearbyPlacesTable)
    .set({
      placeName: placeName?.trim(),
      category: category || undefined,
      distanceKm: distanceKm != null ? String(distanceKm) : null,
      estimatedTimeMinutes: estimatedTimeMinutes != null ? parseInt(estimatedTimeMinutes, 10) : null,
    })
    .where(and(eq(hotelNearbyPlacesTable.id, nearbyId), eq(hotelNearbyPlacesTable.hotelId, id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Nearby place not found" }); return; }
  res.json(serializeNearby(row));
});

// DELETE /hotels/:id/nearby/:nearbyId
router.delete("/hotels/:id/nearby/:nearbyId", requireRole("hotel_owner", "admin", "super_admin"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id as string, 10);
  const nearbyId = parseInt(req.params.nearbyId as string, 10);
  const hotel = await findHotel(id);
  if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }
  if (!ownerGuard(hotel, cu.id, cu.role)) { res.status(403).json({ error: "Access denied" }); return; }
  await db.delete(hotelNearbyPlacesTable)
    .where(and(eq(hotelNearbyPlacesTable.id, nearbyId), eq(hotelNearbyPlacesTable.hotelId, id)));
  res.json({ success: true });
});

router.post("/hotels/:id/restore", requireRole("super_admin"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id as string, 10);
  const [hotel] = await db.select().from(hotelsTable).where(eq(hotelsTable.id, id));
  if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }
  if (!hotel.deletedAt) { res.status(400).json({ error: "Hotel is not deleted" }); return; }

  const [updated] = await db.update(hotelsTable)
    .set({ deletedAt: null, status: "draft" })
    .where(eq(hotelsTable.id, id)).returning();

  await logActivity(req, "hotel_restored", `Hotel "${hotel.name}" restored`, cu.id, cu.role);
  res.json(serializeHotel(updated));
});

export default router;
