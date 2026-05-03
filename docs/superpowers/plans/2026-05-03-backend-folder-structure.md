# Backend Folder Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize `apps/backend/src/` from a flat structure into domain folders (`tables/`, `todos/`, `auth/`) with colocated tests, and update all import paths.

**Architecture:** Files are moved with `git mv` to preserve history. Each task moves one logical group, updates all imports that reference the moved files, and verifies with typecheck. External package exports (`@repo/backend/*`) keep their consumer-facing paths unchanged — only the internal source paths in `package.json` are updated.

**Tech Stack:** TypeScript, git mv, pnpm workspaces

---

### Task 1: Move Table Files to `tables/`

**Files:**
- Move: `src/todos.table.ts` → `src/tables/todos.table.ts`
- Move: `src/auth.table.ts` → `src/tables/auth.table.ts`
- Modify: `apps/backend/package.json` (export paths)
- Modify: `apps/backend/drizzle.config.ts` (schema paths)
- Modify: `apps/backend/src/db.service.ts` (import)
- Modify: `apps/backend/src/todos.service.ts` (import)
- Modify: `apps/backend/src/todos.filter.ts` (import)
- Modify: `apps/backend/src/todos.typetest.ts` (import)
- Modify: `apps/backend/src/auth.config.ts` (import)
- Modify: `apps/backend/src/__tests__/todos.service.test.ts` (import)

- [ ] **Step 1: Create the tables directory and move files**

```bash
mkdir -p apps/backend/src/tables
git mv apps/backend/src/todos.table.ts apps/backend/src/tables/todos.table.ts
git mv apps/backend/src/auth.table.ts apps/backend/src/tables/auth.table.ts
```

- [ ] **Step 2: Update `apps/backend/package.json` export paths**

Replace:
```json
    "./todos.table": "./src/todos.table.ts",
    "./auth.table": "./src/auth.table.ts"
```
With:
```json
    "./todos.table": "./src/tables/todos.table.ts",
    "./auth.table": "./src/tables/auth.table.ts"
```

- [ ] **Step 3: Update `apps/backend/drizzle.config.ts`**

Replace:
```ts
  schema: ["./src/todos.table.ts", "./src/auth.table.ts"],
```
With:
```ts
  schema: ["./src/tables/todos.table.ts", "./src/tables/auth.table.ts"],
```

- [ ] **Step 4: Update imports in files that reference table files**

In `apps/backend/src/db.service.ts`, replace:
```ts
import * as schema from "./todos.table";
```
With:
```ts
import * as schema from "./tables/todos.table";
```

In `apps/backend/src/todos.service.ts`, replace:
```ts
import { T_todos } from "./todos.table";
```
With:
```ts
import { T_todos } from "./tables/todos.table";
```

In `apps/backend/src/todos.filter.ts`, replace:
```ts
import { T_todos } from "./todos.table";
```
With:
```ts
import { T_todos } from "./tables/todos.table";
```

In `apps/backend/src/todos.typetest.ts`, replace:
```ts
import type { Row_Todo } from "./todos.table";
```
With:
```ts
import type { Row_Todo } from "./tables/todos.table";
```

In `apps/backend/src/auth.config.ts`, replace:
```ts
import * as authSchema from "./auth.table";
```
With:
```ts
import * as authSchema from "./tables/auth.table";
```

In `apps/backend/src/__tests__/todos.service.test.ts`, replace:
```ts
import * as schema from "../todos.table";
```
With:
```ts
import * as schema from "../tables/todos.table";
```

- [ ] **Step 5: Verify**

Run: `pnpm -F @repo/backend typecheck && pnpm -F @repo/seeding typecheck`
Expected: PASS (seeding imports via `@repo/backend/todos.table` which still resolves)

- [ ] **Step 6: Commit**

```bash
git add -A apps/backend/
git commit -m "refactor: move table files to tables/ directory"
```

---

### Task 2: Move Auth Files to `auth/`

**Files:**
- Move: `src/auth.config.ts` → `src/auth/auth.config.ts`
- Move: `src/auth.middleware.ts` → `src/auth/auth.middleware.ts`
- Modify: `apps/backend/src/index.ts` (import)
- Modify: `apps/backend/src/todos.routes.ts` (import)

- [ ] **Step 1: Create the auth directory and move files**

```bash
mkdir -p apps/backend/src/auth
git mv apps/backend/src/auth.config.ts apps/backend/src/auth/auth.config.ts
git mv apps/backend/src/auth.middleware.ts apps/backend/src/auth/auth.middleware.ts
```

- [ ] **Step 2: Update import inside `auth.middleware.ts`**

The middleware imports from auth.config. Since they're now siblings in `auth/`, this stays `./auth.config` — no change needed.

- [ ] **Step 3: Update import inside `auth.config.ts`**

In `apps/backend/src/auth/auth.config.ts`, replace:
```ts
import * as authSchema from "./auth.table";
```
With:
```ts
import * as authSchema from "../tables/auth.table";
```

(This file was already updated in Task 1 to `./tables/auth.table`, but now it moved into `auth/`, so the relative path changes again.)

- [ ] **Step 4: Update imports in files that reference auth files**

In `apps/backend/src/index.ts`, replace:
```ts
import { auth } from "./auth.config";
```
With:
```ts
import { auth } from "./auth/auth.config";
```

In `apps/backend/src/todos.routes.ts`, replace:
```ts
import { os_withHeaders, MW_authed } from "./auth.middleware";
```
With:
```ts
import { os_withHeaders, MW_authed } from "./auth/auth.middleware";
```

- [ ] **Step 5: Verify**

Run: `pnpm -F @repo/backend typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A apps/backend/
git commit -m "refactor: move auth files to auth/ directory"
```

---

### Task 3: Move Todos Domain Files to `todos/`

**Files:**
- Move: `src/todos.routes.ts` → `src/todos/todos.routes.ts`
- Move: `src/todos.service.ts` → `src/todos/todos.service.ts`
- Move: `src/todos.filter.ts` → `src/todos/todos.filter.ts`
- Move: `src/todos.typetest.ts` → `src/todos/todos.typetest.ts`
- Move: `src/__tests__/todos.service.test.ts` → `src/todos/todos.service.test.ts`
- Modify: `apps/backend/src/router.ts` (import)
- Modify: `apps/backend/src/runtime.ts` (import)

- [ ] **Step 1: Create the todos directory and move files**

```bash
mkdir -p apps/backend/src/todos
git mv apps/backend/src/todos.routes.ts apps/backend/src/todos/todos.routes.ts
git mv apps/backend/src/todos.service.ts apps/backend/src/todos/todos.service.ts
git mv apps/backend/src/todos.filter.ts apps/backend/src/todos/todos.filter.ts
git mv apps/backend/src/todos.typetest.ts apps/backend/src/todos/todos.typetest.ts
git mv apps/backend/src/__tests__/todos.service.test.ts apps/backend/src/todos/todos.service.test.ts
```

- [ ] **Step 2: Update imports inside moved files — `todos.routes.ts`**

In `apps/backend/src/todos/todos.routes.ts`, replace:
```ts
import { RT_main } from "./runtime";
```
With:
```ts
import { RT_main } from "../runtime";
```

Replace:
```ts
import { os_withHeaders, MW_authed } from "./auth.middleware";
```
With:
```ts
import { os_withHeaders, MW_authed } from "../auth/auth.middleware";
```

(This was already updated in Task 2 to `./auth/auth.middleware`, but now the routes file moved into `todos/`, so relative path changes.)

Replace:
```ts
import { Svc_TodosRepo } from "./todos.service";
```
With:
```ts
import { Svc_TodosRepo } from "./todos.service";
```

(No change — still a sibling.)

- [ ] **Step 3: Update imports inside moved files — `todos.service.ts`**

In `apps/backend/src/todos/todos.service.ts`, replace:
```ts
import { Svc_Database } from "./db.service";
```
With:
```ts
import { Svc_Database } from "../db.service";
```

Replace:
```ts
import { T_todos } from "./tables/todos.table";
```
With:
```ts
import { T_todos } from "../tables/todos.table";
```

(This was updated in Task 1 to `./tables/todos.table`, now needs `../` since file moved.)

The import for `./todos.filter` stays the same — still a sibling.

- [ ] **Step 4: Update imports inside moved files — `todos.filter.ts`**

In `apps/backend/src/todos/todos.filter.ts`, replace:
```ts
import { T_todos } from "./tables/todos.table";
```
With:
```ts
import { T_todos } from "../tables/todos.table";
```

(Same adjustment — was updated in Task 1, now needs `../`.)

- [ ] **Step 5: Update imports inside moved files — `todos.typetest.ts`**

In `apps/backend/src/todos/todos.typetest.ts`, replace:
```ts
import type { Row_Todo } from "./tables/todos.table";
```
With:
```ts
import type { Row_Todo } from "../tables/todos.table";
```

Replace:
```ts
import type { AssertEqual } from "./utils/type-testing";
```
With:
```ts
import type { AssertEqual } from "../utils/type-testing";
```

- [ ] **Step 6: Update imports inside moved files — `todos.service.test.ts`**

In `apps/backend/src/todos/todos.service.test.ts`, replace:
```ts
import * as schema from "../todos.table";
import { Svc_Database } from "../db.service";
import { Svc_TodosRepo, L_TodosRepo } from "../todos.service";
```
With:
```ts
import * as schema from "../tables/todos.table";
import { Svc_Database } from "../db.service";
import { Svc_TodosRepo, L_TodosRepo } from "./todos.service";
```

(Table path was updated in Task 1 to `../todos.table`, now `../tables/todos.table`. db.service stays at `../db.service`. todos.service is now a sibling at `./todos.service`.)

- [ ] **Step 7: Update imports in files that reference moved files**

In `apps/backend/src/router.ts`, replace:
```ts
import { D_listTodos, D_createTodo, D_toggleTodo, D_deleteTodo } from "./todos.routes";
```
With:
```ts
import { D_listTodos, D_createTodo, D_toggleTodo, D_deleteTodo } from "./todos/todos.routes";
```

In `apps/backend/src/runtime.ts`, replace:
```ts
import { L_TodosRepo } from "./todos.service";
```
With:
```ts
import { L_TodosRepo } from "./todos/todos.service";
```

- [ ] **Step 8: Remove empty `__tests__/` directory**

```bash
rmdir apps/backend/src/__tests__
```

- [ ] **Step 9: Verify everything**

Run: `pnpm check`
Expected: format, lint, typecheck all pass

Run: `pnpm -F @repo/backend test`
Expected: All 9 tests pass

- [ ] **Step 10: Commit**

```bash
git add -A apps/backend/
git commit -m "refactor: move todos domain files to todos/ directory"
```

---

### Task 4: Update CLAUDE.md Documentation

**Files:**
- Modify: `CLAUDE.md` (project structure section)
- Modify: `apps/backend/CLAUDE.md` (architecture table)

- [ ] **Step 1: Update root CLAUDE.md project structure**

In `CLAUDE.md`, replace:
```
apps/web/          — TanStack Start frontend (@repo/web)
apps/backend/      — Hono API server (@repo/backend)
packages/shared/   — Shared types, schemas, errors (@repo/shared)
packages/lint-rules/ — Custom lint rules (@repo/lint-rules)
```

With:
```
apps/web/              — TanStack Start frontend (@repo/web)
apps/backend/          — Hono API server (@repo/backend)
  src/tables/          — Drizzle table definitions
  src/todos/           — Todo domain (routes, service, filters, tests)
  src/auth/            — Auth config and middleware
packages/shared/       — Shared types, schemas, errors (@repo/shared)
packages/lint-rules/   — Custom lint rules (@repo/lint-rules)
```

- [ ] **Step 2: Update backend CLAUDE.md architecture table**

In `apps/backend/CLAUDE.md`, replace:
```
| Layer      | File suffix       | Purpose                                                       |
| ---------- | ----------------- | ------------------------------------------------------------- |
| Procedures | `*.routes.ts`     | oRPC entry points — parse input, call services, return output |
| Services   | `*.service.ts`    | Business logic as Effect services with `Context.Tag`          |
| Database   | `*.table.ts`      | Drizzle table definitions                                     |
| Middleware | `*.middleware.ts`  | Request middleware (auth, etc.)                               |
| Config     | `*.config.ts`     | External service configuration (auth, etc.)                    |
```

With:
```
| Layer      | Location                | Purpose                                                       |
| ---------- | ----------------------- | ------------------------------------------------------------- |
| Tables     | `src/tables/*.table.ts` | Drizzle table definitions                                     |
| Procedures | `src/<domain>/*.routes.ts` | oRPC entry points — parse input, call services, return output |
| Services   | `src/<domain>/*.service.ts` | Business logic as Effect services with `Context.Tag`         |
| Filters    | `src/<domain>/*.filter.ts` | Query filter builders                                        |
| Type Tests | `src/<domain>/*.typetest.ts` | Compile-time schema ↔ table assertions                      |
| Tests      | `src/<domain>/*.test.ts` | Colocated tests (vitest)                                     |
| Middleware | `src/auth/*.middleware.ts` | Request middleware (auth, etc.)                              |
| Config     | `src/auth/*.config.ts` | External service configuration (auth, etc.)                    |
```

- [ ] **Step 3: Run full check**

Run: `pnpm check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md apps/backend/CLAUDE.md
git commit -m "docs: update CLAUDE.md with new backend folder structure"
```
