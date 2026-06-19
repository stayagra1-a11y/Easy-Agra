---
name: Easy Agra useGetMyOwnerRequest queryKey
description: How to suppress 401 retry without TS errors in useGetMyOwnerRequest
---

## Problem
`useGetMyOwnerRequest({ query: { retry: false } })` causes TS error: `queryKey` is required in `UseQueryOptions`.

## Fix
Pass an inline queryKey alongside retry:
```ts
useGetMyOwnerRequest({ query: { retry: false, queryKey: ["getMyOwnerRequest"] } })
```

**Why:** The generated hook's UseQueryOptions requires queryKey when passing a query options object; the default is provided by `getGetMyOwnerRequestQueryKey()` but overriding the object requires providing it explicitly.
