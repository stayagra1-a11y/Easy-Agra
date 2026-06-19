---
name: Easy Agra Orval enum casting
description: How to handle Orval-generated per-schema enum types when reusing payloads across create and update mutations
---

Orval generates separate enum union types for each schema that uses an enum field. For example:
- `RoomInputRoomType` for the create mutation
- `RoomUpdateRoomType` for the update mutation

These are structurally identical but TypeScript treats them as distinct. When building a shared payload object and then using it in both create and update mutations:

**Fix:** Cast in the update branch using double cast:
```typescript
const updatePayload = {
  ...payload,
  roomType: payload.roomType as unknown as RoomUpdateRoomType,
  bedType: payload.bedType as unknown as RoomUpdateBedType,
};
```

**Why:** Orval does not unify enum types across schemas, so even though the values are the same strings, the types are different. Trying to assign `RoomInputRoomType` to a field expecting `RoomUpdateRoomType` fails at compile time.

**How to apply:** Whenever a form submits to both `useCreateX` and `useUpdateX`, build the base payload with `InputEnumType` casts, then re-cast to `UpdateEnumType` in the update branch.
