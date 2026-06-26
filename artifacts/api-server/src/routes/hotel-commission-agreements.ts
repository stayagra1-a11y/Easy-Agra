import { Router } from "express";
import { db, hotelCommissionAgreementsTable, hotelsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

// ──────────────────────────────────────────────────
// GET /hotel-commission-agreements/:hotelId — get agreement
// ──────────────────────────────────────────────────
router.get("/hotel-commission-agreements/:hotelId", requireAuth, async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const hotelId = parseInt(req.params.hotelId as string, 10);

  const [hotel] = await db.select().from(hotelsTable).where(eq(hotelsTable.id, hotelId));
  if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }

  // Only owner or admin can see
  if (cu.role !== "admin" && cu.role !== "super_admin" && hotel.ownerId !== cu.id) {
    res.status(403).json({ error: "Access denied" }); return;
  }

  const [agreement] = await db
    .select()
    .from(hotelCommissionAgreementsTable)
    .where(eq(hotelCommissionAgreementsTable.hotelId, hotelId));

  if (!agreement) {
    // Return a default agreement so the frontend can show terms without error
    res.status(200).json({
      exists: false,
      hotelId,
      commissionRate: 15,
      agreed: false,
      agreementText: null,
      agreedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  res.json({
    ...agreement,
    commissionRate: agreement.commissionRate ? parseFloat(String(agreement.commissionRate)) : 15,
    createdAt: agreement.createdAt.toISOString(),
    updatedAt: agreement.updatedAt.toISOString(),
    agreedAt: agreement.agreedAt?.toISOString() ?? null,
  });
});

// ──────────────────────────────────────────────────
// POST /hotel-commission-agreements — create agreement
// ──────────────────────────────────────────────────
router.post("/hotel-commission-agreements", requireRole("hotel_owner"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const { hotelId, commissionRate = 15, agreementText } = req.body;

  if (!hotelId) { res.status(400).json({ error: "hotelId is required" }); return; }

  const [hotel] = await db.select().from(hotelsTable).where(eq(hotelsTable.id, hotelId));
  if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }
  if (hotel.ownerId !== cu.id) { res.status(403).json({ error: "Access denied" }); return; }

  // Check if agreement already exists
  const [existing] = await db
    .select()
    .from(hotelCommissionAgreementsTable)
    .where(eq(hotelCommissionAgreementsTable.hotelId, hotelId));

  if (existing) {
    res.status(400).json({ error: "Agreement already exists for this hotel" });
    return;
  }

  const [agreement] = await db.insert(hotelCommissionAgreementsTable).values({
    hotelId,
    ownerId: cu.id,
    commissionRate: String(commissionRate),
    agreementText: agreementText || null,
    agreed: false,
  }).returning();

  res.status(201).json({
    ...agreement,
    commissionRate: agreement.commissionRate ? parseFloat(String(agreement.commissionRate)) : 15,
    createdAt: agreement.createdAt.toISOString(),
    updatedAt: agreement.updatedAt.toISOString(),
  });
});

// ──────────────────────────────────────────────────
// POST /hotel-commission-agreements/:hotelId/agree — owner agrees
// ──────────────────────────────────────────────────
router.post("/hotel-commission-agreements/:hotelId/agree", requireRole("hotel_owner"), async (req, res): Promise<void> => {
  const cu = (req as any).currentUser;
  const hotelId = parseInt(req.params.hotelId as string, 10);

  const [hotel] = await db.select().from(hotelsTable).where(eq(hotelsTable.id, hotelId));
  if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }
  if (hotel.ownerId !== cu.id) { res.status(403).json({ error: "Access denied" }); return; }

  const [agreement] = await db
    .select()
    .from(hotelCommissionAgreementsTable)
    .where(eq(hotelCommissionAgreementsTable.hotelId, hotelId));

  if (!agreement) {
    res.status(404).json({ error: "Agreement not found. Please create one first." });
    return;
  }

  const [updated] = await db
    .update(hotelCommissionAgreementsTable)
    .set({ agreed: true, agreedAt: new Date() })
    .where(eq(hotelCommissionAgreementsTable.id, agreement.id))
    .returning();

  res.json({
    ...updated,
    commissionRate: updated.commissionRate ? parseFloat(String(updated.commissionRate)) : 15,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    agreedAt: updated.agreedAt?.toISOString() ?? null,
  });
});

export default router;
