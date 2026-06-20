---
name: Auth system
description: Email verification + Google OAuth architecture, env vars, graceful fallback, and DB schema notes
---

# Auth System

## Email Verification
- Controlled by `GMAIL_USER` + `GMAIL_APP_PASSWORD` env secrets
- If either is missing, new registrations are **auto-verified** (emailVerified defaults true) — no email sent
- If both set, register returns `{ requiresVerification: true }` instead of `{ user }`, and frontend shows "check your email" screen
- Token expires 24h; resend endpoint: `POST /api/auth/resend-verification`
- Verify endpoint: `GET /api/auth/verify-email?token=xxx` — also logs user in on success
- Login rejects unverified users with `{ requiresVerification: true, email }` so frontend can show resend banner

## Google OAuth
- Controlled by `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` env secrets
- If missing, `/api/auth/google` returns 503 — Google button still visible but gracefully errors
- Callback URL pattern: `https://[domain]/api/auth/google/callback`
- No passport.js — pure fetch-based flow (exchange code → get userinfo → find/create user)
- CSRF state stored in `req.session.oauthState`
- Google users have `passwordHash = null`; password-change endpoint guards against null passwordHash

## DB Schema (users table)
- `email_verified` boolean NOT NULL DEFAULT TRUE (existing rows stay verified)
- `email_verification_token` text nullable
- `email_verification_expiry` timestamptz nullable
- `google_id` text nullable UNIQUE
- `password_hash` is now nullable (Google-only users have no password)

**Why DEFAULT TRUE:** existing demo/admin accounts were created before verification existed; defaulting false would lock them out after migration.
