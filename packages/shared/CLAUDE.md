# Shared Package Rules (@repo/shared)

## This package defines the contract between frontend and backend.

- **Schemas** (`S_*`) are the single source of truth — types are always derived, never manually written
- **Errors** (`E_*`) use `ORPCTaggedError` from `effect-orpc`
- **Types** (`I_*`) are inferred from schemas via `z.infer<typeof S_*>`
- **Endpoint schemas** (`SIn_D_*` / `SOut_D_*`) compose from base schemas — never redefine fields

## Exports

This package uses per-module exports (no barrel file):

```json
"exports": {
  "./todos": "./src/todos.schema.ts",
  "./todos.stub": "./src/todos.stub.ts",
  "./auth": "./src/auth.schema.ts",
  "./utils/stub-builder": "./src/utils/stub-builder.ts"
}
```

Files use `<domain>.<role>.ts` suffix convention: `*.schema.ts` for schemas, `*.stub.ts` for test stubs. When adding a new domain, create a new source file and add a corresponding export entry.
