# Backend Folder Structure Reorganization

## Problem

All backend source files are flat in `apps/backend/src/`. As more domains are added, this becomes hard to navigate. Table definitions, routes, services, and filters for different domains are intermixed.

## Design

### New Structure

```
apps/backend/src/
├── tables/
│   ├── todos.table.ts
│   └── auth.table.ts
├── todos/
│   ├── todos.routes.ts        (exports R_todos)
│   ├── todos.service.ts
│   ├── todos.filter.ts
│   ├── todos.typetest.ts
│   └── todos.service.test.ts  (colocated, moved from __tests__/)
├── auth/
│   ├── auth.config.ts
│   └── auth.middleware.ts
├── utils/
│   └── type-testing.ts
├── index.ts
├── router.ts
├── runtime.ts
└── db.service.ts
```

### Principles

- **Tables in one folder** — all Drizzle table definitions live in `tables/`, not mixed into domain folders
- **Domain folders** — each domain (todos, auth) groups its routes, service, filters, type tests, and tests together
- **Infrastructure at top level** — `index.ts`, `router.ts`, `runtime.ts`, `db.service.ts` are bootstrap/infrastructure and stay at the root of `src/`
- **Colocated tests** — test files move from `__tests__/` into their domain folder, next to the code they test
- **Router convention** — each domain exports `R_<domain>` from its routes file (e.g. `R_todos` from `todos/todos.routes.ts`)

### File Moves

| From | To |
|------|-----|
| `src/todos.table.ts` | `src/tables/todos.table.ts` |
| `src/auth.table.ts` | `src/tables/auth.table.ts` |
| `src/todos.routes.ts` | `src/todos/todos.routes.ts` |
| `src/todos.service.ts` | `src/todos/todos.service.ts` |
| `src/todos.filter.ts` | `src/todos/todos.filter.ts` |
| `src/todos.typetest.ts` | `src/todos/todos.typetest.ts` |
| `src/__tests__/todos.service.test.ts` | `src/todos/todos.service.test.ts` |
| `src/auth.config.ts` | `src/auth/auth.config.ts` |
| `src/auth.middleware.ts` | `src/auth/auth.middleware.ts` |

### Import Path Updates

All internal imports within the backend need updating to reflect the new paths. Key changes:

- `./todos.table` → `./tables/todos.table`
- `./auth.table` → `./tables/auth.table`
- `./todos.routes` → `./todos/todos.routes` (in router.ts)
- `./todos.service` → `./todos/todos.service` (in routes, tests)
- `./todos.filter` → `./todos/todos.filter` (in service)
- `./auth.config` → `./auth/auth.config`
- `./auth.middleware` → `./auth/auth.middleware` (in routes)

Within domain folders, imports between sibling files use `./`:
- `./todos.table` becomes `../tables/todos.table` (from todos/ or auth/)
- `./todos.filter` stays `./todos.filter` (within todos/)

### External Package Imports

The `@repo/backend` package has these exports consumed by `@repo/seeding`:

| Export path | Current source | New source |
|-------------|---------------|------------|
| `@repo/backend/db.service` | `./src/db.service.ts` | no change |
| `@repo/backend/todos.table` | `./src/todos.table.ts` | `./src/tables/todos.table.ts` |
| `@repo/backend/auth.table` | `./src/auth.table.ts` | `./src/tables/auth.table.ts` |
| `@repo/backend/router` | `./src/router.ts` | no change |

Import sites in `@repo/seeding` that use these:
- `@repo/backend/db.service` — 5 files (no change needed)
- `@repo/backend/todos.table` — `packages/seeding/src/todos.factory.ts` (no change needed, export path stays same)
- `@repo/backend/auth.table` — `packages/seeding/src/users.factory.ts` (no change needed, export path stays same)

Only `apps/backend/package.json` exports need updating to point to the new file locations. The external import paths (`@repo/backend/todos.table`) stay the same — consumers don't need to change.

### CLAUDE.md Updates

Update the backend architecture table to reflect the new folder structure.

### Router Export Convention

`router.ts` already defines `R_todos`. No rename needed — just update the import path from `./todos.routes` to `./todos/todos.routes`.
