---
name: Orval duplicate export fix
description: How to avoid Orval generating duplicate TypeScript exports for inline requestBody schemas
---

## The problem
When an OpenAPI endpoint uses an inline `requestBody` schema (not a `$ref`), Orval generates the type in two places:
1. Inside `lib/api-client-react/src/generated/api.ts` as `XxxBody`
2. As a separate file `lib/api-zod/src/generated/types/xxxBody.ts`

Both files export the same name, causing a TypeScript error when the barrel `index.ts` re-exports both.

## The fix
Always use a named `$ref` for requestBody schemas:

```yaml
requestBody:
  content:
    application/json:
      schema:
        $ref: "#/components/schemas/MyNamedInput"  # ← named ref, NOT inline
```

And define the schema in `components/schemas`:
```yaml
components:
  schemas:
    MyNamedInput:
      type: object
      properties:
        imageIds:
          type: array
          items: { type: integer }
      required: [imageIds]
```

**Why:** Orval only generates the type in the `types/` folder when it's a named schema, not in `api.ts` as well. This prevents the duplicate export.

**How to apply:** Any time you add a new POST/PUT endpoint with a request body in the OpenAPI spec, use a `$ref` to a named schema instead of an inline object definition.
