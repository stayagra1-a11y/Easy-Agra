import { Router } from "express";
import { db, platformSettingsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { logActivity } from "../lib/auth";

const router = Router();

router.get("/platform-settings", requireAuth, async (req, res): Promise<void> => {
  let [settings] = await db.select().from(platformSettingsTable).limit(1);

  if (!settings) {
    // Create default settings
    const inserted = await db.insert(platformSettingsTable).values({}).returning();
    settings = inserted[0];
  }

  res.json({
    ...settings,
    updatedAt: settings.updatedAt.toISOString(),
  });
});

router.patch("/platform-settings", requireRole("super_admin"), async (req, res): Promise<void> => {
  const currentUser = (req as any).currentUser;
  const { appName, logo, contactEmail, supportEmail, termsAndConditions, privacyPolicy, maintenanceMode } = req.body;

  const updates: Record<string, any> = {};
  if (appName !== undefined) updates.appName = appName;
  if (logo !== undefined) updates.logo = logo;
  if (contactEmail !== undefined) updates.contactEmail = contactEmail;
  if (supportEmail !== undefined) updates.supportEmail = supportEmail;
  if (termsAndConditions !== undefined) updates.termsAndConditions = termsAndConditions;
  if (privacyPolicy !== undefined) updates.privacyPolicy = privacyPolicy;
  if (maintenanceMode !== undefined) updates.maintenanceMode = maintenanceMode;

  let [existing] = await db.select().from(platformSettingsTable).limit(1);
  if (!existing) {
    const inserted = await db.insert(platformSettingsTable).values(updates).returning();
    existing = inserted[0];
  }

  const [updated] = await db
    .update(platformSettingsTable)
    .set(updates)
    .returning();

  await logActivity(req, "settings_updated", "Platform settings updated", currentUser.id, currentUser.role);

  res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
});

export default router;
