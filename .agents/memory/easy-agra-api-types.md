---
name: Easy Agra API type quirks
description: Non-obvious type shapes in the generated api-client-react for Easy Agra
---

## DashboardStats
- Returned directly from `useGetDashboardStats()` — no `.stats` wrapper
- Fields: `totalUsers`, `activeUsers`, `pendingUsers`, `suspendedUsers`, `totalOwnerRequests`, `pendingOwnerRequests`, `totalAdmins`
- No `approvedOwnerRequests`, `rejectedOwnerRequests`, or `usersByRole` — use `useGetRoleBreakdown()` for role counts

**Why:** Generated from OpenAPI spec; the API returns the object directly.

## OwnerRequestRejectInput
- Has field `reason`, not `rejectionReason`

## Void mutations
- `useLogout().mutateAsync()` — takes void, call with no args (not `{}`)
- `useMarkAllNotificationsRead().mutateAsync()` — same, void

## ListActivityLogsParams
- Fields: `userId`, `actionType`, `page`, `limit` — no `search` field

## PlatformSettings
- Has `maintenanceMode` (boolean), not `maintenanceMessage`
- PlatformSettingsUpdate fields: `appName`, `logo`, `contactEmail`, `supportEmail`, `termsAndConditions`, `privacyPolicy`, `maintenanceMode`

## Enum casts
- `UserStatusUpdateStatus` and `UserRoleUpdateRole` are const enums — cast string values with `as UserStatusUpdateStatus` / `as UserRoleUpdateRole`

## User type import
- Import `User` from `@workspace/api-client-react` (barrel), not from the deep path `src/generated/api.schemas`
