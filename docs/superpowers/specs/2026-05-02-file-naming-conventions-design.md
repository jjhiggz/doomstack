# File Naming Conventions & API Layer Structure

## Problem

Searching for "todos" in fuzzy finder returns 5 files named `todos.ts` across different packages with no way to distinguish them by name alone. The folder-based organization (`routes/`, `services/`, `middleware/`, `db/`) creates nesting that obscures what a file does and what domain it belongs to.

## Decision

Adopt a `<domain>.<role>.ts` suffix convention across the entire monorepo. File names encode both the domain (what) and the role (how), making every file globally identifiable from its name alone.

Start flat — all source files as siblings in `src/`. When a domain grows beyond ~10 domains (30+ files), introduce one level of domain grouping by moving files into `<domain>/` folders. The suffix convention makes this a pure `mv` with no renames.

## Implementation Scope

This spec defines the suffix glossary for the whole monorepo but only renames files in the **API layer**: `packages/shared/` and `apps/backend/`. Frontend (`apps/web/`) and testing (`testing/seeders/`) are follow-up work.

## Suffix Glossary

| Suffix | What's inside | Naming prefix inside | Example |
|--------|--------------|---------------------|---------|
| `.schema.ts` | Zod schemas, inferred types, error classes | `S_`, `I_`, `SIn_D_`, `SOut_D_`, `E_` | `todos.schema.ts` |
| `.stub.ts` | `makeStub` test data generators | `ST_` | `todos.stub.ts` |
| `.table.ts` | Drizzle table definitions, row types | `T_`, `Row_`, `RowInsert_` | `todos.table.ts` |
| `.routes.ts` | oRPC procedure definitions | `D_` | `todos.routes.ts` |
| `.service.ts` | Effect service tag + layer | `Svc_`, `L_` | `todos.service.ts` |
| `.middleware.ts` | Middleware functions | `MW_` | `auth.middleware.ts` |
| `.config.ts` | Configuration setup (auth, drizzle, etc.) | — | `auth.config.ts` |
| `.queries.ts` | TanStack Query options + mutation hooks | `QO_`, `use*` | `todos.queries.ts` |
| `.page.tsx` | Route page components | `C_Page*` | `todos.page.tsx` |
| `.factory.ts` | Seeder DB insertion functions | `F_` | `todos.factory.ts` |
| `.test.ts` | Tests (matches the file it tests) | — | `todos.service.test.ts` |

### Files that don't get suffixed

Singleton infrastructure files that have no domain collision keep their current names:

- `index.ts` — package/app entrypoint (only one per package)
- `router.ts` — oRPC router composition (only one per app)
- `runtime.ts` — Effect runtime + layers (only one per app)
- `utils.ts` — generic utilities

### Stub vs Factory boundary

Stubs (`.stub.ts`) live in `packages/shared` with zero backend dependencies — pure Zod, usable in unit tests, component stories, frontend mocks. Factories (`.factory.ts`) live in `testing/seeders` and import drizzle, better-auth, and DB schemas. This keeps the shared package free of heavy backend deps.

## API Layer: Before → After

### `packages/shared/`

| Before | After |
|--------|-------|
| `src/todos.ts` | `src/todos.schema.ts` |
| `src/todos.stub.ts` | `src/todos.stub.ts` (no change) |
| `src/auth.ts` | `src/auth.schema.ts` |
| `src/utils/stub-builder.ts` | `src/utils/stub-builder.ts` (no change) |

Package exports update:

```json
{
  "./todos": "./src/todos.schema.ts",
  "./todos.stub": "./src/todos.stub.ts",
  "./auth": "./src/auth.schema.ts",
  "./utils/stub-builder": "./src/utils/stub-builder.ts"
}
```

Note: export paths (`@repo/shared/todos`) stay the same so consumers don't need to change. Only the file the export points to changes.

### `apps/backend/`

| Before | After |
|--------|-------|
| `auth-schema.ts` (root) | `src/auth.table.ts` |
| `src/db/schema.ts` | `src/todos.table.ts` |
| `src/db/index.ts` | `src/db.service.ts` |
| `src/auth.ts` | `src/auth.config.ts` |
| `src/middleware/auth.ts` | `src/auth.middleware.ts` |
| `src/routes/todos.ts` | `src/todos.routes.ts` |
| `src/services/todos-repo.ts` | `src/todos.service.ts` |
| `src/__tests__/todos-repo.test.ts` | `src/__tests__/todos.service.test.ts` |
| `src/index.ts` | `src/index.ts` (no change) |
| `src/router.ts` | `src/router.ts` (no change) |
| `src/runtime.ts` | `src/runtime.ts` (no change) |

The `db/`, `middleware/`, `routes/`, `services/` folders are removed. All files become flat siblings under `src/`.

### Import updates

All internal imports within `apps/backend/src/` change from nested paths to flat sibling imports:

```ts
// Before
import { Svc_Database } from "../db";
import { T_todos } from "../db/schema";
import { MW_authed } from "../middleware/auth";
import { Svc_TodosRepo } from "../services/todos-repo";

// After
import { Svc_Database } from "./db.service";
import { T_todos } from "./todos.table";
import { MW_authed } from "./auth.middleware";
import { Svc_TodosRepo } from "./todos.service";
```

The `auth-schema.ts` import in `auth.config.ts` changes from `../auth-schema` to `./auth.table`.

### CLAUDE.md updates

Update `apps/backend/CLAUDE.md` architecture table:

```markdown
| Layer      | File suffix    | Purpose                                                       |
| ---------- | -------------- | ------------------------------------------------------------- |
| Procedures | `*.routes.ts`  | oRPC entry points — parse input, call services, return output |
| Services   | `*.service.ts` | Business logic as Effect services with `Context.Tag`          |
| Database   | `*.table.ts`   | Drizzle table definitions                                    |
| Middleware  | `*.middleware.ts` | Request middleware (auth, etc.)                            |
| Config     | `*.config.ts`  | External service configuration (auth, etc.)                   |
```

## Future work (not in this implementation)

- Rename `apps/web/` files: `todos.queries.ts`, `todos.page.tsx`
- Rename `testing/seeders/` files: `todos.factory.ts`, `users.factory.ts`
- Add `ST_` prefix to the naming prefixes table in root `CLAUDE.md`
