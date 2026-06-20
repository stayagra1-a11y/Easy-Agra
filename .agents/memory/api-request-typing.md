---
name: apiRequest typing
description: The frontend api-request.ts utility and how to correctly pass a body
---

## Location
`artifacts/easy-agra/src/lib/api-request.ts`

## Correct usage
Pass `body` as a plain object — the function serializes it automatically:

```ts
await apiRequest("/some-endpoint", {
  method: "POST",
  body: { key: "value", count: 42 },  // plain object, NOT JSON.stringify'd
});
```

## How it works
The function type is `Omit<RequestInit, "body"> & { body?: unknown }`. It calls `JSON.stringify(body)` internally before passing to `fetch`.

**Why extended:** The original function used `RequestInit` directly, which types `body` as `BodyInit | null | undefined`. This caused TS errors when passing plain objects from page components. The extension accepts `unknown` and handles serialization internally.

## Query conditional pattern
For conditional queries using generated hooks (e.g. `useGetTouristPlace`), the `query` option requires `queryKey` in its type. Bypass with `as any`:

```ts
const { data } = useGetTouristPlace(id!, { query: { enabled: !!id } as any });
```

This is the established pattern in the codebase (see `make-reservation.tsx`, `hotel-form.tsx`).
