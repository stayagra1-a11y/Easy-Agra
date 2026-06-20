import { Router } from "express";
import {
  db,
  restaurantsTable,
  restaurantMenusTable,
  restaurantTablesTable,
  usersTable,
} from "@workspace/db";
import {
  eq,
  and,
  ilike,
  sql,
  or,
  desc,
  inArray,
  isNull,
} from "drizzle-orm";
import { logActivity, createNotification } from "../lib/auth";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

type RestaurantRow = typeof restaurantsTable.$inferSelect;
type MenuRow = typeof restaurantMenusTable.$inferSelect;
type TableRow = typeof restaurantTablesTable.$inferSelect;

function parseNum(v: any): number {
  if (v == null) return 0;
  return parseFloat(String(v));
}

function serializeRestaurant(r: RestaurantRow) {
  return {
    ...r,
    galleryPhotos: Array.isArray(r.galleryPhotos) ? r.galleryPhotos : [],
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
    deletedAt: r.deletedAt instanceof Date ? r.deletedAt.toISOString() : (r.deletedAt ?? null),
  };
}

function serializeMenuItem(m: MenuRow) {
  return {
    ...m,
    price: parseNum(m.price),
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
    updatedAt: m.updatedAt instanceof Date ? m.updatedAt.toISOString() : m.updatedAt,
  };
}

function serializeTable(t: TableRow) {
  return {
    ...t,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
  };
}

async function findRestaurant(id: number) {
  const [r] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, id));
  return r;
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
  await Promise.all(admins.map((a) => createNotification(a.id, title, message, "general")));
}

// ────────────────────────────────────────────────────────────────────────
// GET /restaurants/my  —  BEFORE /restaurants/:id
// ────────────────────────────────────────────────────────────────────────
router.get(
  "/restaurants/my",
  requireRole("restaurant_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const rows = await db
      .select()
      .from(restaurantsTable)
      .where(
        and(
          eq(restaurantsTable.ownerId, cu.id),
          isNull(restaurantsTable.deletedAt),
        ),
      )
      .orderBy(desc(restaurantsTable.createdAt));
    res.json(rows.map(serializeRestaurant));
  },
);

// ────────────────────────────────────────────────────────────────────────
// GET /restaurants  — public browse
// ────────────────────────────────────────────────────────────────────────
router.get("/restaurants", async (req, res): Promise<void> => {
  const { search, city, cuisine, page = "1", limit = "12" } = req.query as any;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, parseInt(limit, 10));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [isNull(restaurantsTable.deletedAt), eq(restaurantsTable.status, "active")];
  if (search) conditions.push(ilike(restaurantsTable.name, `%${search}%`));
  if (city) conditions.push(ilike(restaurantsTable.city, `%${city}%`));
  if (cuisine) conditions.push(ilike(restaurantsTable.cuisineType, `%${cuisine}%`));

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(restaurantsTable)
    .where(and(...conditions));

  const rows = await db
    .select()
    .from(restaurantsTable)
    .where(and(...conditions))
    .orderBy(desc(restaurantsTable.createdAt))
    .limit(limitNum)
    .offset(offset);

  res.json({
    restaurants: rows.map(serializeRestaurant),
    total: countRow?.total ?? 0,
    page: pageNum,
    limit: limitNum,
  });
});

// ────────────────────────────────────────────────────────────────────────
// POST /restaurants — create
// ────────────────────────────────────────────────────────────────────────
router.post(
  "/restaurants",
  requireRole("restaurant_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const {
      name, description, address, city, state,
      contactNumber, contactEmail, openingTime, closingTime,
      cuisineType, seatingCapacity, coverPhoto, galleryPhotos,
    } = req.body;

    if (!name?.trim()) { res.status(400).json({ error: "Restaurant name is required" }); return; }

    const [r] = await db
      .insert(restaurantsTable)
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
        cuisineType: cuisineType?.trim() ?? null,
        seatingCapacity: seatingCapacity ? parseInt(seatingCapacity, 10) : null,
        coverPhoto: coverPhoto ?? null,
        galleryPhotos: Array.isArray(galleryPhotos) ? galleryPhotos : [],
        status: "active",
      })
      .returning();

    await logActivity(req, "restaurant_created", `Restaurant ${r.name} created`, cu.id, cu.role);
    await notifyAdmins("New Restaurant Added", `${cu.fullName} added restaurant: ${r.name}`);

    res.status(201).json(serializeRestaurant(r));
  },
);

// ────────────────────────────────────────────────────────────────────────
// GET /restaurants/:id — public detail
// ────────────────────────────────────────────────────────────────────────
router.get("/restaurants/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const r = await findRestaurant(id);
  if (!r || r.deletedAt) { res.status(404).json({ error: "Restaurant not found" }); return; }

  res.json(serializeRestaurant(r));
});

// ────────────────────────────────────────────────────────────────────────
// PUT /restaurants/:id — update
// ────────────────────────────────────────────────────────────────────────
router.put(
  "/restaurants/:id",
  requireRole("restaurant_owner", "admin", "super_admin"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const r = await findRestaurant(id);
    if (!r || r.deletedAt) { res.status(404).json({ error: "Restaurant not found" }); return; }
    if (cu.role === "restaurant_owner" && r.ownerId !== cu.id) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const {
      name, description, address, city, state,
      contactNumber, contactEmail, openingTime, closingTime,
      cuisineType, seatingCapacity, coverPhoto, galleryPhotos,
    } = req.body;

    const [updated] = await db
      .update(restaurantsTable)
      .set({
        name: name?.trim() ?? r.name,
        description: description?.trim() ?? r.description,
        address: address?.trim() ?? r.address,
        city: city?.trim() ?? r.city,
        state: state?.trim() ?? r.state,
        contactNumber: contactNumber?.trim() ?? r.contactNumber,
        contactEmail: contactEmail?.trim() ?? r.contactEmail,
        openingTime: openingTime?.trim() ?? r.openingTime,
        closingTime: closingTime?.trim() ?? r.closingTime,
        cuisineType: cuisineType?.trim() ?? r.cuisineType,
        seatingCapacity: seatingCapacity != null ? parseInt(seatingCapacity, 10) : r.seatingCapacity,
        coverPhoto: coverPhoto !== undefined ? coverPhoto : r.coverPhoto,
        galleryPhotos: Array.isArray(galleryPhotos) ? galleryPhotos : r.galleryPhotos,
      })
      .where(eq(restaurantsTable.id, id))
      .returning();

    await logActivity(req, "restaurant_updated", `Restaurant ${updated.name} updated`, cu.id, cu.role);
    res.json(serializeRestaurant(updated));
  },
);

// ────────────────────────────────────────────────────────────────────────
// DELETE /restaurants/:id — soft delete
// ────────────────────────────────────────────────────────────────────────
router.delete(
  "/restaurants/:id",
  requireRole("restaurant_owner", "admin", "super_admin"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const r = await findRestaurant(id);
    if (!r || r.deletedAt) { res.status(404).json({ error: "Restaurant not found" }); return; }
    if (cu.role === "restaurant_owner" && r.ownerId !== cu.id) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    await db
      .update(restaurantsTable)
      .set({ deletedAt: new Date(), status: "deleted" })
      .where(eq(restaurantsTable.id, id));

    await logActivity(req, "restaurant_deleted", `Restaurant ${r.name} deleted`, cu.id, cu.role);
    res.json({ success: true });
  },
);

// ────────────────────────────────────────────────────────────────────────
// GET /restaurants/:id/menu
// ────────────────────────────────────────────────────────────────────────
router.get("/restaurants/:id/menu", async (req, res): Promise<void> => {
  const restaurantId = parseInt(req.params.id as string, 10);
  if (isNaN(restaurantId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const items = await db
    .select()
    .from(restaurantMenusTable)
    .where(eq(restaurantMenusTable.restaurantId, restaurantId))
    .orderBy(restaurantMenusTable.category, restaurantMenusTable.name);

  res.json(items.map(serializeMenuItem));
});

// ────────────────────────────────────────────────────────────────────────
// POST /restaurants/:id/menu — add menu item
// ────────────────────────────────────────────────────────────────────────
router.post(
  "/restaurants/:id/menu",
  requireRole("restaurant_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const restaurantId = parseInt(req.params.id as string, 10);
    if (isNaN(restaurantId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const r = await findRestaurant(restaurantId);
    if (!r || r.deletedAt) { res.status(404).json({ error: "Restaurant not found" }); return; }
    if (r.ownerId !== cu.id) { res.status(403).json({ error: "Forbidden" }); return; }

    const { name, category, description, price, itemPhoto, isVeg = true, isAvailable = true } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: "Item name required" }); return; }
    if (!price || isNaN(parseFloat(price))) { res.status(400).json({ error: "Valid price required" }); return; }

    const validCategories = ["starters", "main_course", "fast_food", "desserts", "beverages"] as const;
    const cat = validCategories.includes(category) ? category : "main_course";

    const [item] = await db
      .insert(restaurantMenusTable)
      .values({
        restaurantId,
        name: name.trim(),
        category: cat,
        description: description?.trim() ?? null,
        price: String(parseFloat(price)),
        itemPhoto: itemPhoto ?? null,
        isVeg: Boolean(isVeg),
        isAvailable: Boolean(isAvailable),
      })
      .returning();

    res.status(201).json(serializeMenuItem(item));
  },
);

// ────────────────────────────────────────────────────────────────────────
// PUT /menu-items/:id — update menu item
// ────────────────────────────────────────────────────────────────────────
router.put(
  "/menu-items/:id",
  requireRole("restaurant_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [item] = await db.select().from(restaurantMenusTable).where(eq(restaurantMenusTable.id, id));
    if (!item) { res.status(404).json({ error: "Menu item not found" }); return; }

    const r = await findRestaurant(item.restaurantId);
    if (!r || r.ownerId !== cu.id) { res.status(403).json({ error: "Forbidden" }); return; }

    const { name, category, description, price, itemPhoto, isVeg, isAvailable } = req.body;
    const validCategories = ["starters", "main_course", "fast_food", "desserts", "beverages"] as const;
    const cat = category && validCategories.includes(category) ? category : item.category;

    const [updated] = await db
      .update(restaurantMenusTable)
      .set({
        name: name?.trim() ?? item.name,
        category: cat,
        description: description?.trim() ?? item.description,
        price: price != null ? String(parseFloat(price)) : item.price,
        itemPhoto: itemPhoto !== undefined ? itemPhoto : item.itemPhoto,
        isVeg: isVeg !== undefined ? Boolean(isVeg) : item.isVeg,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : item.isAvailable,
      })
      .where(eq(restaurantMenusTable.id, id))
      .returning();

    res.json(serializeMenuItem(updated));
  },
);

// ────────────────────────────────────────────────────────────────────────
// DELETE /menu-items/:id — remove menu item
// ────────────────────────────────────────────────────────────────────────
router.delete(
  "/menu-items/:id",
  requireRole("restaurant_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [item] = await db.select().from(restaurantMenusTable).where(eq(restaurantMenusTable.id, id));
    if (!item) { res.status(404).json({ error: "Menu item not found" }); return; }

    const r = await findRestaurant(item.restaurantId);
    if (!r || r.ownerId !== cu.id) { res.status(403).json({ error: "Forbidden" }); return; }

    await db.delete(restaurantMenusTable).where(eq(restaurantMenusTable.id, id));
    res.json({ success: true });
  },
);

// ────────────────────────────────────────────────────────────────────────
// GET /restaurants/:id/tables
// ────────────────────────────────────────────────────────────────────────
router.get(
  "/restaurants/:id/tables",
  requireAuth,
  async (req, res): Promise<void> => {
    const restaurantId = parseInt(req.params.id as string, 10);
    if (isNaN(restaurantId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const tables = await db
      .select()
      .from(restaurantTablesTable)
      .where(eq(restaurantTablesTable.restaurantId, restaurantId))
      .orderBy(restaurantTablesTable.tableNumber);

    res.json(tables.map(serializeTable));
  },
);

// ────────────────────────────────────────────────────────────────────────
// POST /restaurants/:id/tables — add table
// ────────────────────────────────────────────────────────────────────────
router.post(
  "/restaurants/:id/tables",
  requireRole("restaurant_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const restaurantId = parseInt(req.params.id as string, 10);
    if (isNaN(restaurantId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const r = await findRestaurant(restaurantId);
    if (!r || r.deletedAt) { res.status(404).json({ error: "Restaurant not found" }); return; }
    if (r.ownerId !== cu.id) { res.status(403).json({ error: "Forbidden" }); return; }

    const { tableNumber, capacity = 2, status = "available" } = req.body;
    if (!tableNumber?.trim()) { res.status(400).json({ error: "Table number required" }); return; }

    const validStatuses = ["available", "reserved", "occupied"] as const;
    const tStatus = validStatuses.includes(status) ? status : "available";

    const [t] = await db
      .insert(restaurantTablesTable)
      .values({
        restaurantId,
        tableNumber: tableNumber.trim(),
        capacity: parseInt(String(capacity), 10) || 2,
        status: tStatus,
      })
      .returning();

    res.status(201).json(serializeTable(t));
  },
);

// ────────────────────────────────────────────────────────────────────────
// PUT /tables/:id — update table
// ────────────────────────────────────────────────────────────────────────
router.put(
  "/tables/:id",
  requireRole("restaurant_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [t] = await db.select().from(restaurantTablesTable).where(eq(restaurantTablesTable.id, id));
    if (!t) { res.status(404).json({ error: "Table not found" }); return; }

    const r = await findRestaurant(t.restaurantId);
    if (!r || r.ownerId !== cu.id) { res.status(403).json({ error: "Forbidden" }); return; }

    const { tableNumber, capacity, status } = req.body;
    const validStatuses = ["available", "reserved", "occupied"] as const;
    const tStatus = status && validStatuses.includes(status) ? status : t.status;

    const [updated] = await db
      .update(restaurantTablesTable)
      .set({
        tableNumber: tableNumber?.trim() ?? t.tableNumber,
        capacity: capacity != null ? parseInt(String(capacity), 10) : t.capacity,
        status: tStatus,
      })
      .where(eq(restaurantTablesTable.id, id))
      .returning();

    res.json(serializeTable(updated));
  },
);

// ────────────────────────────────────────────────────────────────────────
// DELETE /tables/:id — remove table
// ────────────────────────────────────────────────────────────────────────
router.delete(
  "/tables/:id",
  requireRole("restaurant_owner"),
  async (req, res): Promise<void> => {
    const cu = (req as any).currentUser;
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [t] = await db.select().from(restaurantTablesTable).where(eq(restaurantTablesTable.id, id));
    if (!t) { res.status(404).json({ error: "Table not found" }); return; }

    const r = await findRestaurant(t.restaurantId);
    if (!r || r.ownerId !== cu.id) { res.status(403).json({ error: "Forbidden" }); return; }

    await db.delete(restaurantTablesTable).where(eq(restaurantTablesTable.id, id));
    res.json({ success: true });
  },
);

export default router;
