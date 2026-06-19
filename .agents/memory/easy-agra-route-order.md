---
name: Easy Agra Express route ordering
description: Static route segments must always be registered before dynamic segments in Express to avoid conflicts
---

Express matches routes in registration order. If `/rooms/:id` is registered before `/rooms/stats`, then a GET to `/rooms/stats` will match `:id` with value `"stats"` and fail.

**Rule:** Always register static sub-routes BEFORE dynamic ones:
```typescript
router.get("/rooms/stats", ...)  // FIRST
router.get("/rooms/:id", ...)    // AFTER
```

Same applies to hotels: `/hotels/stats` before `/hotels/:id`.

**Why:** This bug is silent — the stats endpoint returns a 404 or wrong data without an obvious error. The pattern must be enforced manually since Express does not warn about it.

**How to apply:** Any time a new sub-route is added to a resource with a `/:id` route, verify the static sub-route appears above `:id` in the file.
