import { Router } from "express";
import crypto from "crypto";
import { db, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { logActivity, safeUser, createNotification } from "../lib/auth";

const router = Router();

function getAppUrl(req: any): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) return `https://${domains.split(",")[0]}`;
  return `${req.protocol}://${req.get("host")}`;
}

// ── Step 1: Redirect to Google ────────────────────────────────────────────────
router.get("/auth/google", (req, res): void => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(503).json({ error: "Google login not configured" });
    return;
  }
  const appUrl = getAppUrl(req);
  const redirectUri = `${appUrl}/api/auth/google/callback`;
  const state = crypto.randomBytes(16).toString("hex");
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "select_account",
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// ── Step 2: Google Callback ───────────────────────────────────────────────────
router.get("/auth/google/callback", async (req, res): Promise<void> => {
  const { code, state, error } = req.query as Record<string, string>;
  const appUrl = getAppUrl(req);

  if (error || !code) {
    res.redirect(`${appUrl}/login?error=google_cancelled`);
    return;
  }

  if (state !== req.session.oauthState) {
    res.redirect(`${appUrl}/login?error=invalid_state`);
    return;
  }
  delete req.session.oauthState;

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
    });
    const tokens = await tokenRes.json() as any;
    if (!tokens.access_token) throw new Error("No access token");

    // Get user info from Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json() as any;

    if (!profile.email) throw new Error("No email from Google");

    // Find or create user
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.googleId, profile.id), eq(usersTable.email, profile.email.toLowerCase())));

    let user;
    if (existing) {
      // Link Google ID if not already linked
      if (!existing.googleId) {
        await db.update(usersTable).set({ googleId: profile.id, emailVerified: true }).where(eq(usersTable.id, existing.id));
      }
      user = { ...existing, googleId: profile.id, emailVerified: true };
    } else {
      // Create new account
      const [created] = await db.insert(usersTable).values({
        fullName: profile.name || profile.email.split("@")[0],
        email: profile.email.toLowerCase(),
        mobile: "0000000000",
        passwordHash: null,
        role: "customer",
        status: "active",
        emailVerified: true,
        googleId: profile.id,
        profilePhoto: profile.picture || null,
      }).returning();
      user = created;
      await createNotification(user.id, "Welcome to Easy Agra!", `Hi ${user.fullName}, welcome to Easy Agra! 🏛️`, "welcome");
    }

    if (user.status === "banned" || user.status === "suspended") {
      res.redirect(`${appUrl}/login?error=account_suspended`);
      return;
    }

    req.session.userId = user.id;
    await logActivity(req, "user_login", `Google login: ${user.email}`, user.id, user.role);

    res.redirect(`${appUrl}/`);
  } catch (err: any) {
    req.log.error({ err }, "Google OAuth error");
    res.redirect(`${appUrl}/login?error=google_failed`);
  }
});

export default router;
