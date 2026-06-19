import { Router } from "express";
import { db, roomsTable, hotelsTable } from "@workspace/db";
import { eq, and, ilike, sql, isNull, isNotNull } from "drizzle-orm";
import { logActivity, createNotification } from "../lib/auth";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

type RoomRow = typeof roomsTable.$inferSelect;

function computeFinalPrice(basePrice: number, discountPct: number): number {
  return parseFloat((basePrice * (1 - discountPct / 100)).toFixed(2));
}

function computeAvailable(total: number, occupied: number, blocked: number, maintenance: number): number {
  return Math.max(0, total - occupied - blocked - maintenance);
}

function serializeRoom(r: RoomRow) {
  return {
    ...r,
    roomSize: r.roomSize != null ? parseFloat(r.roomSize as string) : null,
    basePrice: parseFloat(r.basePrice as string),
    weekendPrice: r.weekendPrice != null ? parseFloat(r.weekendPrice as string) : null,
    holidayPrice: r.holidayPrice != null ? parseFloat(r.holidayPrice as string) : null,
    discountPercentage: r.discountPercentage != null ? parseFloat(r.discountPercentage as string) : 0,
    extraGuestCharge: r.extraGuestCharge != null ? parseFloat(r.extraGuestCharge as string) : null,
    finalPrice: r.finalPrice != null ? parseFloat(r.finalPrice as string) : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    deletedAt: r.deletedAt?.toISOString() ?? null,
  };
}

async function findRoom(id: number) {
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, id));
  return room;
}

async function verifyHotelOwnership(hotelId: number, userId: number, role: string): Promise<boolean> {
  if (role === "admin" || role === "super_admin") return true;
  const [hotel] = await db.select().from(hotelsTable).where(eq(hotelsTable.id, hotelId));
  return hotel?.ownerId === userId;
}

function roomOwnerGuard(room: RoomRow, userId: number, role: string): boolean {
  if (role === "admin" || role === "super_admin") return true;
  return room.ownerId === userId;
}

// ──────────────────────────────────────────────────
// GET /rooms/stats — MUST be before /rooms/:id
// ──────────────────────────────────────────────────
router.get("/rooms/stats", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const { hotelId } = req.query as Record<string, string>;

  const conditions: any[] = [];
  if (cu.role === "hotel_owner") {
    conditions.push(eq(roomsTable.ownerId, cu.id));
  }
  if (hotelId) {
    conditions.push(eq(roomsTable.hotelId, parseInt(hotelId, 10)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [row] = await db
    .select({
      totalRooms: sql<number>`count(*)::int`,
      draftRooms: sql<number>`sum(case when ${roomsTable.status}='draft' then 1 else 0 end)::int`,
      activeRooms: sql<number>`sum(case when ${roomsTable.status}='active' then 1 else 0 end)::int`,
      inactiveRooms: sql<number>`sum(case when ${roomsTable.status}='inactive' then 1 else 0 end)::int`,
      maintenanceRooms: sql<number>`sum(case when ${roomsTable.status}='maintenance' then 1 else 0 end)::int`,
      deletedRooms: sql<number>`sum(case when ${roomsTable.deletedAt} is not null then 1 else 0 end)::int`,
      totalAvailable: sql<number>`coalesce(sum(${roomsTable.availableRooms}),0)::int`,
    })
    .from(roomsTable)
    .where(where);

  res.json({
    totalRooms: row?.totalRooms ?? 0,
    draftRooms: row?.draftRooms ?? 0,
    activeRooms: row?.activeRooms ?? 0,
    inactiveRooms: row?.inactiveRooms ?? 0,
    maintenanceRooms: row?.maintenanceRooms ?? 0,
    deletedRooms: row?.deletedRooms ?? 0,
    totalAvailable: row?.totalAvailable ?? 0,
  });
});

// ──────────────────────────────────────────────────
// GET /rooms — list
// ──────────────────────────────────────────────────
router.get("/rooms", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const { hotelId, status, search, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [isNull(roomsTable.deletedAt)];

  if (cu.role === "hotel_owner") {
    conditions.push(eq(roomsTable.ownerId, cu.id));
  }
  if (hotelId) conditions.push(eq(roomsTable.hotelId, parseInt(hotelId, 10)));
  if (status) conditions.push(eq(roomsTable.status, status as any));
  if (search) conditions.push(ilike(roomsTable.name, `%${search}%`));

  const where = and(...conditions);

  const [rooms, countResult] = await Promise.all([
    db.select().from(roomsTable).where(where)
      .orderBy(roomsTable.createdAt).limit(limitNum).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(roomsTable).where(where),
  ]);

  res.json({
    rooms: rooms.map(serializeRoom),
    total: countResult[0]?.count ?? 0,
    page: pageNum,
    limit: limitNum,
  });
});

// ──────────────────────────────────────────────────
// POST /rooms — create
// ──────────────────────────────────────────────────
router.post("/rooms", requireRole("hotel_owner", "admin", "super_admin"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const {
    hotelId, name, roomNumber, roomType, description,
    adultsCapacity, childrenCapacity, bedType, roomSize, roomSizeUnit,
    basePrice, weekendPrice, holidayPrice, discountPercentage, extraGuestCharge,
    amenities, coverImage, galleryImages,
    totalRooms, availableRooms, occupiedRooms, blockedRooms, underMaintenanceRooms,
  } = req.body;

  if (!hotelId) { res.status(400).json({ error: "hotelId is required" }); return; }
  if (!name || !String(name).trim()) { res.status(400).json({ error: "Room name is required" }); return; }
  if (basePrice === undefined || basePrice === null) { res.status(400).json({ error: "Base price is required" }); return; }

  const hotelIdNum = parseInt(String(hotelId), 10);
  const ok = await verifyHotelOwnership(hotelIdNum, cu.id, cu.role);
  if (!ok) { res.status(403).json({ error: "Access denied to this hotel" }); return; }

  const basePriceNum = parseFloat(String(basePrice));
  const discountPct = discountPercentage ? parseFloat(String(discountPercentage)) : 0;
  const finalPrice = computeFinalPrice(basePriceNum, discountPct);

  const totalNum = totalRooms ? parseInt(String(totalRooms), 10) : 1;
  const occupiedNum = occupiedRooms ? parseInt(String(occupiedRooms), 10) : 0;
  const blockedNum = blockedRooms ? parseInt(String(blockedRooms), 10) : 0;
  const maintenanceNum = underMaintenanceRooms ? parseInt(String(underMaintenanceRooms), 10) : 0;
  const computedAvailable = availableRooms !== undefined
    ? parseInt(String(availableRooms), 10)
    : computeAvailable(totalNum, occupiedNum, blockedNum, maintenanceNum);

  const [room] = await db.insert(roomsTable).values({
    hotelId: hotelIdNum,
    ownerId: cu.role === "hotel_owner" ? cu.id : (await db.select().from(hotelsTable).where(eq(hotelsTable.id, hotelIdNum)))[0]?.ownerId ?? cu.id,
    name: String(name).trim(),
    roomNumber: roomNumber ? String(roomNumber).trim() : null,
    roomType: roomType || "standard",
    description: description || null,
    adultsCapacity: adultsCapacity ? parseInt(String(adultsCapacity), 10) : 2,
    childrenCapacity: childrenCapacity ? parseInt(String(childrenCapacity), 10) : 0,
    bedType: bedType || "double",
    roomSize: roomSize ? String(roomSize) : null,
    roomSizeUnit: roomSizeUnit || "sqft",
    basePrice: String(basePriceNum),
    weekendPrice: weekendPrice ? String(parseFloat(String(weekendPrice))) : null,
    holidayPrice: holidayPrice ? String(parseFloat(String(holidayPrice))) : null,
    discountPercentage: String(discountPct),
    extraGuestCharge: extraGuestCharge ? String(parseFloat(String(extraGuestCharge))) : null,
    finalPrice: String(finalPrice),
    amenities: Array.isArray(amenities) ? amenities : [],
    coverImage: coverImage || null,
    galleryImages: Array.isArray(galleryImages) ? galleryImages : [],
    totalRooms: totalNum,
    availableRooms: computedAvailable,
    occupiedRooms: occupiedNum,
    blockedRooms: blockedNum,
    underMaintenanceRooms: maintenanceNum,
    status: "draft",
  }).returning();

  await logActivity(req, "room_created", `Room "${room.name}" created in hotel #${hotelIdNum}`, cu.id, cu.role);
  await createNotification(room.ownerId, "Room Added", `Room "${room.name}" has been added successfully.`, "general");

  res.status(201).json(serializeRoom(room));
});

// ──────────────────────────────────────────────────
// GET /rooms/:id
// ──────────────────────────────────────────────────
router.get("/rooms/:id", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id as string, 10);
  const room = await findRoom(id);
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  if (!roomOwnerGuard(room, cu.id, cu.role)) { res.status(403).json({ error: "Access denied" }); return; }
  res.json(serializeRoom(room));
});

// ──────────────────────────────────────────────────
// PUT /rooms/:id — update
// ──────────────────────────────────────────────────
router.put("/rooms/:id", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id as string, 10);
  const room = await findRoom(id);
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  if (!roomOwnerGuard(room, cu.id, cu.role)) { res.status(403).json({ error: "Access denied" }); return; }
  if (room.deletedAt) { res.status(400).json({ error: "Cannot edit a deleted room" }); return; }

  const {
    name, roomNumber, roomType, description,
    adultsCapacity, childrenCapacity, bedType, roomSize, roomSizeUnit,
    basePrice, weekendPrice, holidayPrice, discountPercentage, extraGuestCharge,
    amenities, coverImage, galleryImages,
    totalRooms, availableRooms, occupiedRooms, blockedRooms, underMaintenanceRooms,
  } = req.body;

  const updates: Partial<typeof roomsTable.$inferInsert> = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (roomNumber !== undefined) updates.roomNumber = roomNumber || null;
  if (roomType !== undefined) updates.roomType = roomType;
  if (description !== undefined) updates.description = description || null;
  if (adultsCapacity !== undefined) updates.adultsCapacity = parseInt(String(adultsCapacity), 10);
  if (childrenCapacity !== undefined) updates.childrenCapacity = parseInt(String(childrenCapacity), 10);
  if (bedType !== undefined) updates.bedType = bedType;
  if (roomSize !== undefined) updates.roomSize = roomSize ? String(roomSize) : null;
  if (roomSizeUnit !== undefined) updates.roomSizeUnit = roomSizeUnit;
  if (amenities !== undefined) updates.amenities = Array.isArray(amenities) ? amenities : [];
  if (coverImage !== undefined) updates.coverImage = coverImage || null;
  if (galleryImages !== undefined) updates.galleryImages = Array.isArray(galleryImages) ? galleryImages : [];

  // Pricing: recompute finalPrice if basePrice or discount changes
  const newBase = basePrice !== undefined ? parseFloat(String(basePrice)) : parseFloat(room.basePrice as string);
  const newDiscount = discountPercentage !== undefined ? parseFloat(String(discountPercentage)) : parseFloat((room.discountPercentage as string) ?? "0");
  if (basePrice !== undefined) updates.basePrice = String(newBase);
  if (discountPercentage !== undefined) updates.discountPercentage = String(newDiscount);
  updates.finalPrice = String(computeFinalPrice(newBase, newDiscount));
  if (weekendPrice !== undefined) updates.weekendPrice = weekendPrice ? String(parseFloat(String(weekendPrice))) : null;
  if (holidayPrice !== undefined) updates.holidayPrice = holidayPrice ? String(parseFloat(String(holidayPrice))) : null;
  if (extraGuestCharge !== undefined) updates.extraGuestCharge = extraGuestCharge ? String(parseFloat(String(extraGuestCharge))) : null;

  // Availability
  const newTotal = totalRooms !== undefined ? parseInt(String(totalRooms), 10) : room.totalRooms;
  const newOccupied = occupiedRooms !== undefined ? parseInt(String(occupiedRooms), 10) : room.occupiedRooms;
  const newBlocked = blockedRooms !== undefined ? parseInt(String(blockedRooms), 10) : room.blockedRooms;
  const newMaintenance = underMaintenanceRooms !== undefined ? parseInt(String(underMaintenanceRooms), 10) : room.underMaintenanceRooms;
  if (totalRooms !== undefined) updates.totalRooms = newTotal;
  if (occupiedRooms !== undefined) updates.occupiedRooms = newOccupied;
  if (blockedRooms !== undefined) updates.blockedRooms = newBlocked;
  if (underMaintenanceRooms !== undefined) updates.underMaintenanceRooms = newMaintenance;
  if (availableRooms !== undefined) {
    updates.availableRooms = parseInt(String(availableRooms), 10);
  } else if (totalRooms !== undefined || occupiedRooms !== undefined || blockedRooms !== undefined || underMaintenanceRooms !== undefined) {
    updates.availableRooms = computeAvailable(newTotal, newOccupied, newBlocked, newMaintenance);
  }

  const [updated] = await db.update(roomsTable).set(updates).where(eq(roomsTable.id, id)).returning();
  await logActivity(req, "room_updated", `Room "${updated.name}" updated`, cu.id, cu.role);
  res.json(serializeRoom(updated));
});

// ──────────────────────────────────────────────────
// DELETE /rooms/:id — soft delete
// ──────────────────────────────────────────────────
router.delete("/rooms/:id", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id as string, 10);
  const room = await findRoom(id);
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  if (!roomOwnerGuard(room, cu.id, cu.role)) { res.status(403).json({ error: "Access denied" }); return; }
  if (room.deletedAt) { res.status(400).json({ error: "Room already deleted" }); return; }

  await db.update(roomsTable).set({ deletedAt: new Date() }).where(eq(roomsTable.id, id));
  await logActivity(req, "room_deleted", `Room "${room.name}" deleted`, cu.id, cu.role);
  res.json({ message: "Room deleted" });
});

// ──────────────────────────────────────────────────
// POST /rooms/:id/restore — super_admin or owner
// ──────────────────────────────────────────────────
router.post("/rooms/:id/restore", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id as string, 10);
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, id));
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  if (!roomOwnerGuard(room, cu.id, cu.role)) { res.status(403).json({ error: "Access denied" }); return; }
  if (!room.deletedAt) { res.status(400).json({ error: "Room is not deleted" }); return; }

  const [updated] = await db.update(roomsTable)
    .set({ deletedAt: null, status: "draft" })
    .where(eq(roomsTable.id, id)).returning();

  await logActivity(req, "room_restored", `Room "${room.name}" restored`, cu.id, cu.role);
  res.json(serializeRoom(updated));
});

// ──────────────────────────────────────────────────
// POST /rooms/:id/activate
// ──────────────────────────────────────────────────
router.post("/rooms/:id/activate", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id as string, 10);
  const room = await findRoom(id);
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  if (!roomOwnerGuard(room, cu.id, cu.role)) { res.status(403).json({ error: "Access denied" }); return; }
  if (room.deletedAt) { res.status(400).json({ error: "Cannot activate a deleted room" }); return; }

  const [updated] = await db.update(roomsTable)
    .set({ status: "active" })
    .where(eq(roomsTable.id, id)).returning();

  await logActivity(req, "room_activated", `Room "${room.name}" activated`, cu.id, cu.role);
  await createNotification(room.ownerId, "Room Activated", `Room "${room.name}" is now active and available for booking.`, "general");
  res.json(serializeRoom(updated));
});

// ──────────────────────────────────────────────────
// POST /rooms/:id/deactivate
// ──────────────────────────────────────────────────
router.post("/rooms/:id/deactivate", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id as string, 10);
  const room = await findRoom(id);
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  if (!roomOwnerGuard(room, cu.id, cu.role)) { res.status(403).json({ error: "Access denied" }); return; }
  if (room.deletedAt) { res.status(400).json({ error: "Cannot deactivate a deleted room" }); return; }

  const [updated] = await db.update(roomsTable)
    .set({ status: "inactive" })
    .where(eq(roomsTable.id, id)).returning();

  await logActivity(req, "room_deactivated", `Room "${room.name}" deactivated`, cu.id, cu.role);
  res.json(serializeRoom(updated));
});

// ──────────────────────────────────────────────────
// POST /rooms/:id/maintenance
// ──────────────────────────────────────────────────
router.post("/rooms/:id/maintenance", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const id = parseInt(req.params.id as string, 10);
  const room = await findRoom(id);
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  if (!roomOwnerGuard(room, cu.id, cu.role)) { res.status(403).json({ error: "Access denied" }); return; }
  if (room.deletedAt) { res.status(400).json({ error: "Cannot update a deleted room" }); return; }

  const [updated] = await db.update(roomsTable)
    .set({ status: "maintenance" })
    .where(eq(roomsTable.id, id)).returning();

  await logActivity(req, "room_maintenance", `Room "${room.name}" set to maintenance`, cu.id, cu.role);
  res.json(serializeRoom(updated));
});

export default router;
