# File Naming Conventions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename files in `packages/shared` and `apps/backend` to use `<domain>.<role>.ts` suffix convention, flatten the backend folder structure, and update all imports.

**Architecture:** Pure rename + import rewrite. No logic changes. Flatten `apps/backend/src/` by removing `db/`, `middleware/`, `routes/`, `services/` subdirectories. Update `packages/shared` exports to point to renamed files. External consumers (`@repo/shared/todos`) keep the same import paths.

**Tech Stack:** TypeScript, pnpm workspaces, Drizzle, Effect, oRPC, vitest

---

### Task 1: Rename `packages/shared` schema files

**Files:**
- Rename: `packages/shared/src/todos.ts` → `packages/shared/src/todos.schema.ts`
- Rename: `packages/shared/src/auth.ts` → `packages/shared/src/auth.schema.ts`
- Modify: `packages/shared/package.json`
- Modify: `packages/shared/src/todos.stub.ts`

- [ ] **Step 1: Rename the schema files**

```bash
cd /Users/jon-higger/effect-orpc-messaround
mv packages/shared/src/todos.ts packages/shared/src/todos.schema.ts
mv packages/shared/src/auth.ts packages/shared/src/auth.schema.ts
```

- [ ] **Step 2: Update the stub's import**

In `packages/shared/src/todos.stub.ts`, change the import:

```ts
// Before
import { S_Todo } from "./todos";

// After
import { S_Todo } from "./todos.schema";
```

- [ ] **Step 3: Update package.json exports**

In `packages/shared/package.json`, update the export targets (keep the same export paths so consumers don't change):

```json
{
  "exports": {
    "./todos": "./src/todos.schema.ts",
    "./todos.stub": "./src/todos.stub.ts",
    "./auth": "./src/auth.schema.ts",
    "./utils/stub-builder": "./src/utils/stub-builder.ts"
  }
}
```

- [ ] **Step 4: Verify shared package typechecks**

Run: `pnpm -F @repo/shared typecheck`
Expected: No errors

- [ ] **Step 5: Run stub builder tests**

Run: `pnpm -F @repo/shared exec vitest run src/utils/stub-builder.test.ts`
Expected: 38 tests pass

- [ ] **Step 6: Commit**

```bash
git add packages/shared/
git commit -m "refactor(shared): rename schema files to <domain>.schema.ts convention"
```

---

### Task 2: Move and rename backend table files

**Files:**
- Rename: `apps/backend/auth-schema.ts` → `apps/backend/src/auth.table.ts`
- Rename: `apps/backend/src/db/schema.ts` → `apps/backend/src/todos.table.ts`
- Modify: `apps/backend/drizzle.config.ts` (update schema path)

- [ ] **Step 1: Move auth-schema.ts into src/ with new name**

```bash
cd /Users/jon-higger/effect-orpc-messaround
mv apps/backend/auth-schema.ts apps/backend/src/auth.table.ts
```

- [ ] **Step 2: Move db/schema.ts to flat src/ with new name**

```bash
mv apps/backend/src/db/schema.ts apps/backend/src/todos.table.ts
```

- [ ] **Step 3: Update drizzle.config.ts schema path**

In `apps/backend/drizzle.config.ts`:

```ts
// Before
schema: "./src/db/schema.ts",

// After
schema: "./src/todos.table.ts",
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/auth-schema.ts apps/backend/src/auth.table.ts apps/backend/src/todos.table.ts apps/backend/src/db/schema.ts apps/backend/drizzle.config.ts
git commit -m "refactor(backend): rename table files to <domain>.table.ts, flatten into src/"
```

---

### Task 3: Move and rename backend db.service, auth.config, auth.middleware

**Files:**
- Rename: `apps/backend/src/db/index.ts` → `apps/backend/src/db.service.ts`
- Rename: `apps/backend/src/auth.ts` → `apps/backend/src/auth.config.ts`
- Rename: `apps/backend/src/middleware/auth.ts` → `apps/backend/src/auth.middleware.ts`

- [ ] **Step 1: Move db/index.ts to flat src/ with new name**

```bash
cd /Users/jon-higger/effect-orpc-messaround
mv apps/backend/src/db/index.ts apps/backend/src/db.service.ts
```

- [ ] **Step 2: Remove the now-empty db/ directory**

```bash
rmdir apps/backend/src/db
```

- [ ] **Step 3: Update the schema import in db.service.ts**

In `apps/backend/src/db.service.ts`:

```ts
// Before
import * as schema from "./schema";

// After
import * as schema from "./todos.table";
```

- [ ] **Step 4: Rename auth.ts to auth.config.ts**

```bash
mv apps/backend/src/auth.ts apps/backend/src/auth.config.ts
```

- [ ] **Step 5: Update auth-schema import in auth.config.ts**

In `apps/backend/src/auth.config.ts`:

```ts
// Before
import * as authSchema from "../auth-schema";

// After
import * as authSchema from "./auth.table";
```

- [ ] **Step 6: Move middleware/auth.ts to flat src/**

```bash
mv apps/backend/src/middleware/auth.ts apps/backend/src/auth.middleware.ts
rmdir apps/backend/src/middleware
```

- [ ] **Step 7: Update auth import in auth.middleware.ts**

In `apps/backend/src/auth.middleware.ts`:

```ts
// Before
import { auth } from "../auth";

// After
import { auth } from "./auth.config";
```

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/
git commit -m "refactor(backend): rename db, auth, middleware files to suffix convention"
```

---

### Task 4: Move and rename backend routes and services

**Files:**
- Rename: `apps/backend/src/routes/todos.ts` → `apps/backend/src/todos.routes.ts`
- Rename: `apps/backend/src/services/todos-repo.ts` → `apps/backend/src/todos.service.ts`
- Rename: `apps/backend/src/__tests__/todos-repo.test.ts` → `apps/backend/src/__tests__/todos.service.test.ts`

- [ ] **Step 1: Move routes/todos.ts to flat src/**

```bash
cd /Users/jon-higger/effect-orpc-messaround
mv apps/backend/src/routes/todos.ts apps/backend/src/todos.routes.ts
rmdir apps/backend/src/routes
```

- [ ] **Step 2: Update imports in todos.routes.ts**

In `apps/backend/src/todos.routes.ts`:

```ts
// Before
import { RT_main } from "../runtime";
import { os_withHeaders, MW_authed } from "../middleware/auth";
import { Svc_TodosRepo } from "../services/todos-repo";

// After
import { RT_main } from "./runtime";
import { os_withHeaders, MW_authed } from "./auth.middleware";
import { Svc_TodosRepo } from "./todos.service";
```

- [ ] **Step 3: Move services/todos-repo.ts to flat src/**

```bash
mv apps/backend/src/services/todos-repo.ts apps/backend/src/todos.service.ts
rmdir apps/backend/src/services
```

- [ ] **Step 4: Update imports in todos.service.ts**

In `apps/backend/src/todos.service.ts`:

```ts
// Before
import { Svc_Database } from "../db";
import { T_todos } from "../db/schema";

// After
import { Svc_Database } from "./db.service";
import { T_todos } from "./todos.table";
```

- [ ] **Step 5: Rename the test file**

```bash
mv apps/backend/src/__tests__/todos-repo.test.ts apps/backend/src/__tests__/todos.service.test.ts
```

- [ ] **Step 6: Update imports in todos.service.test.ts**

In `apps/backend/src/__tests__/todos.service.test.ts`:

```ts
// Before
import * as schema from "../db/schema";
import { Svc_Database } from "../db";
import { Svc_TodosRepo, L_TodosRepo } from "../services/todos-repo";

// After
import * as schema from "../todos.table";
import { Svc_Database } from "../db.service";
import { Svc_TodosRepo, L_TodosRepo } from "../todos.service";
```

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/
git commit -m "refactor(backend): rename routes and services to suffix convention"
```

---

### Task 5: Update remaining backend imports (router, runtime, index)

**Files:**
- Modify: `apps/backend/src/router.ts`
- Modify: `apps/backend/src/runtime.ts`
- Modify: `apps/backend/src/index.ts`

- [ ] **Step 1: Update router.ts**

In `apps/backend/src/router.ts`:

```ts
// Before
import { D_listTodos, D_createTodo, D_toggleTodo, D_deleteTodo } from "./routes/todos";

// After
import { D_listTodos, D_createTodo, D_toggleTodo, D_deleteTodo } from "./todos.routes";
```

- [ ] **Step 2: Update runtime.ts**

In `apps/backend/src/runtime.ts`:

```ts
// Before
import { L_Database } from "./db";
import { L_TodosRepo } from "./services/todos-repo";

// After
import { L_Database } from "./db.service";
import { L_TodosRepo } from "./todos.service";
```

- [ ] **Step 3: Update index.ts**

In `apps/backend/src/index.ts`:

```ts
// Before
import { auth } from "./auth";

// After
import { auth } from "./auth.config";
```

- [ ] **Step 4: Update seeder db.ts imports (external consumer of backend files)**

In `testing/seeders/db.ts`:

```ts
// Before
import * as appSchema from "../../apps/backend/src/db/schema";
import * as authSchema from "../../apps/backend/auth-schema";

// After
import * as appSchema from "../../apps/backend/src/todos.table";
import * as authSchema from "../../apps/backend/src/auth.table";
```

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/router.ts apps/backend/src/runtime.ts apps/backend/src/index.ts testing/seeders/db.ts
git commit -m "refactor: update all remaining imports for renamed files"
```

---

### Task 6: Verify everything works

**Files:** (no changes — verification only)

- [ ] **Step 1: Typecheck the whole monorepo**

Run: `pnpm typecheck`
Expected: All packages pass

- [ ] **Step 2: Run backend tests**

Run: `pnpm -F @repo/backend test`
Expected: All tests pass

- [ ] **Step 3: Run shared package tests**

Run: `pnpm -F @repo/shared exec vitest run`
Expected: All tests pass

- [ ] **Step 4: Run seeder up/down**

Run: `pnpm seed basics up && pnpm seed basics down`
Expected: Seeds and tears down without errors

- [ ] **Step 5: Run full check**

Run: `pnpm check`
Expected: Format, lint, typecheck all pass

---

### Task 7: Update CLAUDE.md docs

**Files:**
- Modify: `apps/backend/CLAUDE.md`
- Modify: `CLAUDE.md` (root)

- [ ] **Step 1: Update backend CLAUDE.md architecture table**

Replace the architecture table in `apps/backend/CLAUDE.md`:

```markdown
### Architecture

| Layer      | File suffix        | Purpose                                                       |
| ---------- | ------------------ | ------------------------------------------------------------- |
| Procedures | `*.routes.ts`      | oRPC entry points — parse input, call services, return output |
| Services   | `*.service.ts`     | Business logic as Effect services with `Context.Tag`          |
| Database   | `*.table.ts`       | Drizzle table definitions                                     |
| Middleware | `*.middleware.ts`  | Request middleware (auth, etc.)                                |
| Config     | `*.config.ts`      | External service configuration (auth, etc.)                    |
```

Also update the location column references in the Rules section — remove folder paths like `apps/backend/src/routes/` since everything is now flat in `src/`.

- [ ] **Step 2: Add ST_ prefix to root CLAUDE.md naming table**

Add this row to the naming prefixes table in the root `CLAUDE.md`:

```markdown
| `ST_` | Stub builder | `ST_Todo` |
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/CLAUDE.md CLAUDE.md
git commit -m "docs: update CLAUDE.md for new file naming conventions"
```
