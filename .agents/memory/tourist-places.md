---
name: Tourist Places system
description: Key decisions and gotchas for the tourist places module (T001-T007)
---

## Route registration order (CRITICAL)
Express 5 matches routes first-come-first-served. Static segments MUST be registered before `/:id`:
- `/tourist-places/seed` → before `/:id`
- `/tourist-places/images/:imageId` → before `/:id`
- `/tourist-places/tips/:tipId` → before `/:id`
- `/tourist-places/distances/:distId` → before `/:id`

**Why:** Express would interpret `seed`, `images`, `tips`, `distances` as the `:id` param otherwise, causing 404s or wrong handler execution.

## Numeric column serialization
Drizzle ORM returns `numeric()` column values as strings. Always `parseFloat(String(value))` when serializing to JSON.

**Why:** The OpenAPI spec declares these as `number` type. Returning strings causes type mismatches and breaks client-side math.

## Express 5 req.params typing
`req.params.id` is typed as `string | string[]` in Express 5 TypeScript types. Always cast: `req.params.id as string` before passing to `parseInt`.

## Seeding approach
The seed data lives in both:
- `artifacts/api-server/src/routes/tourist-places.ts` as `getSeedData()` (used by `POST /tourist-places/seed` for super_admin UI button)
- `scripts/src/seed-tourist-places.ts` (for direct DB seeding when proxy auth is unavailable)

**Why:** curl sessions through the shared proxy don't reliably propagate HttpOnly session cookies, so the `/seed` API endpoint can't be called from shell scripts. The scripts package approach bypasses the proxy entirely.

## Scripts package @workspace/db dependency
`@workspace/scripts` has `@workspace/db` added. However, scripts CANNOT import drizzle-orm operators (`eq`, `isNull`, etc.) directly — drizzle-orm is not a direct dependency of scripts. Only use `@workspace/db` exports (tables, `db`). Do any filtering in JavaScript, not in Drizzle queries.

## Tourist place slugs (actual values in DB)
- Akbar's Tomb: `akbar-tomb-sikandra` (NOT `sikandra`)
- All 28 inter-place connections seeded in `tourist_place_connections` table
- Connection seed script: `scripts/src/seed-connections.ts`

## Part 8B new tables
- `tourist_place_favorites` (userId, placeId, unique) — customer wishlist
- `tourist_place_connections` (fromPlaceId, toPlaceId, distanceKm, estimatedTimeMinutes, unique pair) — inter-place distances

## New static routes (must stay before /:id)
- `/tourist-places/my-favorites` — GET, requireAuth
- `/tourist-places/connections` — GET, public
- `/tourist-places/seed-connections` — POST, super_admin

## Nearby recommendations
Hotels, restaurants, spas have NO lat/lng. Nearby shows top-4 of each type from DB (no geo filtering). Empty until owner data is added. This is expected behavior.

## Image cover detection
The `coverImageUrl` field is derived at query time — find the first image where `imageType === 'cover' || isFeatured === true`. It is NOT stored as a separate column.
