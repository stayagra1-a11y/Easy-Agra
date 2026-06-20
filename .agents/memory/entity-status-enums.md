---
name: Entity status enum values
description: The exact status enum values for hotels, restaurants, spas in the Easy Agra DB
---

Hotels and Spas use `"approved"` (not "active") as their live/visible status.
- `hotelStatusEnum`: "draft" | "pending" | "approved" | "rejected" | "suspended"
- `spaStatusEnum`: "draft" | "pending" | "approved" | "rejected" | "suspended"
- `restaurantStatusEnum`: uses "active" as the live status (default)
- `hotelCategoryEnum`: "budget" | "standard" | "premium" | "luxury" (matches trip budgetCategory)

**Why:** These were discovered via typecheck errors when using `eq(hotelsTable.status, "active")` — hotels/spas never had an "active" value; "approved" is the correct approved/visible status.

**How to apply:** Any query filtering for publicly visible hotels or spas must use `eq(hotelsTable.status, "approved")` / `eq(spasTable.status, "approved")`. Restaurants use `eq(restaurantsTable.status, "active")`.
