# Threat Model

## Project Overview

Easy Agra is a publicly deployed tourism and booking platform for Agra, India. It serves a React/Vite PWA from `artifacts/easy-agra` and an Express 5 API from `artifacts/api-server`, backed by PostgreSQL through Drizzle in `lib/db`. The main production users are customers, hotel owners, restaurant owners, spa owners, admins, and super admins.

This scan assumes production requests terminate over platform-managed TLS, `NODE_ENV` is `production`, and mockup/dev tooling is not deployed. Because deployment visibility is public, all production API and frontend routes should be treated as internet reachable.

## Assets

- **User accounts and sessions** — customer, owner, admin, and super admin accounts; session cookies; OAuth login state; password reset and verification tokens. Compromise enables impersonation and privilege abuse.
- **Booking and business records** — hotels, rooms, restaurants, spas, trips, reservations, bookings, reviews, refunds, commissions, payouts, and support tickets. These drive money movement and contain user and business data.
- **Personal data** — names, emails, mobile numbers, profile photos, account status, support content, and itinerary/travel preferences.
- **Operational control surfaces** — admin and super admin APIs that approve owners, suspend businesses, change user roles, issue refunds, manage payouts, and configure platform behavior.
- **Application secrets** — database credentials, session secret, Google OAuth secrets, email credentials, and VAPID keys.

## Trust Boundaries

- **Browser to API** — all client input is untrusted. Every protected route must authenticate and authorize on the server.
- **API to PostgreSQL** — the API has broad authority over business and identity data. Injection or broken authorization here exposes the full application dataset.
- **Authenticated user to other authenticated users** — customers and owners must not read or mutate each other’s records by changing object IDs.
- **Owner to admin/super_admin** — owner workflows manage business objects but must not access platform-wide or other-owner administrative functions.
- **API to external services** — Google OAuth, email delivery, and web push rely on secrets and remote callbacks that must be validated and narrowly scoped.
- **Browser to third-party storage/services** — any browser-direct integrations such as Cloudinary uploads are internet reachable and must not grant outsiders storage, bandwidth, or hosting capability without server-side authorization or tightly scoped unsigned presets.
- **Production to dev-only tooling** — `artifacts/mockup-sandbox`, `scripts`, and API-spec generation are out of scope unless production reachability is demonstrated.

## Scan Anchors

- Production API bootstrap: `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/index.ts`
- Authentication and identity: `artifacts/api-server/src/routes/auth.ts`, `artifacts/api-server/src/routes/google-auth.ts`, `artifacts/api-server/src/middlewares/requireAuth.ts`, `artifacts/api-server/src/routes/users.ts`
- High-risk business APIs: `artifacts/api-server/src/routes/bookings.ts`, `hotels.ts`, `rooms.ts`, `reservations.ts`, `restaurants.ts`, `spas.ts`, `spa-services.ts`, `support-tickets.ts`, `reports.ts`, `refunds.ts`, `payouts.ts`, `security.ts`
- Client-side third-party upload path: `artifacts/easy-agra/src/lib/cloudinary.ts`, plus any page that directly posts to Cloudinary from the browser
- Public/authenticated boundaries: public auth flows and informational pages vs authenticated customer/owner/admin dashboards
- Usually dev-only: `artifacts/mockup-sandbox/`, `scripts/`, `lib/api-spec/`

## Threat Categories

### Spoofing

The application uses server-side sessions plus optional Google OAuth. The API must reject unauthenticated requests, bind sessions to an unpredictable production secret, and prevent attackers from forging or replaying authentication state. Password reset and OAuth callback flows must not allow account takeover through predictable secrets, unvalidated callback state, or cross-account linking.

### Tampering

Customers and owners can submit and update large amounts of business data, bookings, reviews, support content, and profile data. Server-side code must validate and constrain user input, and object updates must verify both role and ownership so users cannot modify other users’ records by changing IDs.

### Information Disclosure

The system stores user identity data, itinerary information, support conversations, payouts, and business performance data. API responses, logs, and admin reporting endpoints must avoid leaking sensitive fields to the wrong role. Error handling and logging must not expose secrets or password-reset material.

### Denial of Service

Public login, registration, verification, and password-reset endpoints are reachable from the internet. They must resist credential stuffing and email-reset abuse, and expensive business-reporting or notification flows should not be triggerable by unauthenticated users.

### Elevation of Privilege

This codebase has several role tiers and many ID-based routes. The core guarantee is that every read or write on user, booking, room, hotel, restaurant, spa, payout, refund, report, and support objects must enforce object-level authorization in addition to route-level authentication. Admin and super admin operations must remain server-enforced and unreachable to customers or owners through parameter tampering or insecure default configuration.
