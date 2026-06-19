---
name: Orval zod+schemas naming conflict
description: How to fix "already exported" conflicts when Orval generates duplicate type names across api.ts and types/ folder
---

## Rule
When an endpoint has **both** a path param AND query params, Orval generates `{OperationId}Params` in BOTH `generated/api.ts` (Zod schema) AND `generated/types/` (TS type), causing a TS2308 "already exported" conflict in the barrel `index.ts`.

## Why
`mode: "split"` with `client: "zod"` always generates a `types/` folder AND Zod schemas in `api.ts`. When Orval creates the barrel `index.ts`, it exports from both. If both files export the same name, it fails. Orval REGENERATES `index.ts` on every codegen run — manual edits are overwritten.

## How to fix
Remove query params from the OpenAPI spec for any endpoint that also has a path param. The filtering/pagination for that endpoint can be provided by a sibling endpoint (e.g. `GET /reviews?hotelId=X`) that has ONLY query params and no path param.

**Do NOT remove `schemas` from the Orval config** — without it, Orval still generates `index.ts` pointing to `./generated/types` but creates no types folder, causing TS2307 "cannot find module".

## Applied
`/reviews/hotel/{hotelId}` — removed sort/rating/page/limit query params from spec; clients use `GET /reviews?hotelId=X` for filtered access instead.
