import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, usersTable, platformSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logActivity, safeUser, createNotification } from "../lib/auth";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const { fullName, email, mobile, password, city, state } = req.body;
  if (!fullName || !email || !mobile || !password) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(usersTable)
    .values({
      fullName,
      email: email.toLowerCase(),
      mobile,
      passwordHash,
      city: city || null,
      state: state || null,
      role: "customer",
      status: "active",
    })
    .returning();

  await createNotification(
    user.id,
    "Welcome to Easy Agra!",
    `Hi ${user.fullName}, welcome to Easy Agra! Explore hotels, restaurants, spas, and iconic tourist places in Agra.`,
    "welcome",
  );

  req.session.userId = user.id;
  await logActivity(
    req,
    "user_registered",
    `New user registered: ${user.email}`,
    user.id,
    user.role,
  );

  res.status(201).json({ user: safeUser(user), message: "Registration successful" });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password, rememberMe } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (user.status === "banned") {
    res.status(403).json({ error: "Your account has been permanently banned. Contact support." });
    return;
  }
  if (user.status === "suspended") {
    res.status(403).json({ error: "Your account has been suspended. Contact support." });
    return;
  }
  if (user.status === "rejected") {
    res.status(403).json({ error: "Your account has been rejected." });
    return;
  }

  // Check maintenance mode
  const [settings] = await db.select().from(platformSettingsTable).limit(1);
  if (settings?.maintenanceMode && user.role !== "super_admin") {
    res.status(403).json({ error: "Platform is under maintenance. Please try again later." });
    return;
  }

  req.session.userId = user.id;
  req.session.rememberMe = !!rememberMe;

  if (rememberMe) {
    req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  }

  await logActivity(req, "user_login", `User logged in: ${user.email}`, user.id, user.role);

  res.json({ user: safeUser(user), message: "Login successful" });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId;
  const user = (req as any).currentUser;
  await logActivity(req, "user_logout", `User logged out: ${user.email}`, userId, user.role);

  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully" });
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).currentUser;
  res.json(safeUser(user));
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));

  // Always return success to prevent email enumeration
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db
      .update(usersTable)
      .set({ resetToken: token, resetTokenExpiry: expiry })
      .where(eq(usersTable.id, user.id));

    // In production, send email. For now, log the token.
    req.log.info({ token, email }, "Password reset token generated");
  }

  res.json({ message: "If an account exists with this email, you will receive a password reset link." });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, password } = req.body;
  if (!token || !password) {
    res.status(400).json({ error: "Token and new password are required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.resetToken, token));

  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db
    .update(usersTable)
    .set({ passwordHash, resetToken: null, resetTokenExpiry: null })
    .where(eq(usersTable.id, user.id));

  await logActivity(req, "password_reset", `Password reset for: ${user.email}`, user.id, user.role);

  res.json({ message: "Password reset successful. You can now log in." });
});

export default router;
