---
name: Spa 7B patterns
description: Key decisions and gotchas for the spa services + appointments system built in Part 7B
---

## Route ordering (CRITICAL)
Static segments MUST come before `/:id` in Express. In spa-appointments.ts:
`/spa-appointments/my` and `/spa-appointments/owner` MUST be registered before `/spa-appointments/:id`.
Same applies to `/spas/browse`, `/spas/my`, `/spas/stats` — all before `/spas/:id`.

## Orval codegen: mutations without requestBody
Spec paths that only declare path params (no `requestBody`) generate mutations with type `{ id: number }` only.
This affects: `updateSpaService`, `rejectSpaAppointment`, `completeSpaAppointment`, `cancelSpaAppointment`.
**Fix used**: use `apiRequest` directly for these calls instead of the generated mutation hook.
Do NOT pass `data` to these mutations — TypeScript will reject it.

## Drizzle numeric() fields
`numeric()` columns (e.g. `price`, `amount`) return as strings from Drizzle.
Always `parseFloat(String(v))` when serializing to JSON.

## Generated Spa type vs DB
The OpenAPI `Spa` schema uses `contactNumber`/`contactEmail` (not `phone`/`website`).
Fields like `rating`, `reviewCount`, `priceRange` are in the DB but not in the spec — cast with `(spa as any)` in frontend.

## Public browse endpoint
`GET /spas/browse` is NOT in the OpenAPI spec (added directly to spas.ts).
Customer browse page uses `useQuery + apiRequest` directly (no generated hook).

## apiRequest typing
`apiRequest` returns `any` — no generic type arg supported.
Use `queryFn: (): Promise<MyType> => apiRequest(url)` for typed useQuery.

## Appointment ref format
`EAA-XXXXXX` (6 alphanumeric chars). Generated in `generateRef()` in spa-appointments.ts.

## Service categories enum
`full_body_massage | head_massage | foot_massage | aromatherapy | facial | beauty_treatment | couples_therapy | wellness_package`

## Navigation additions (Part 7B)
- Customer bottom nav: added "Spas" tab (Sparkles icon) → /spas (between Dine and Reviews, 7 items total)
- Spa owner bottom nav: added "Appts" tab (CalendarCheck icon) → /spa-owner/appointments
- Customer home quick links: Restaurants + Spas now have real hrefs (not "coming soon")
- Spa owner spas list: added "Services" button → /spa-owner/spas/:id/services

## Routes added (Part 7B)
Spa owner: /spa-owner/spas/:id/services, /spa-owner/appointments
Customer: /spas, /spas/:id, /spas/:id/book, /my-spa-appointments

## SpaStats schema (updated)
Now includes: totalAppointments, pendingAppointments, monthlyRevenue
Dashboard shows 6 stat cards + monthly revenue card.
