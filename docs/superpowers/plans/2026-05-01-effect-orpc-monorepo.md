# Effect-oRPC Monorepo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a monorepo with TanStack Start frontend, Effect-oRPC backend, and shared contracts that preserves typed error classification end-to-end.

**Architecture:** pnpm workspaces + Turborepo monorepo with 3 packages: `apps/web` (TanStack Start), `apps/backend` (Hono + oRPC + Effect), `packages/shared` (Zod schemas + Effect error classes). The backend uses Effect's ManagedRuntime for DI, effect-orpc for typed procedures, and better-auth for authentication. The frontend uses TanStack Query via oRPC's integration, with ts-pattern for exhaustive error matching.

**Tech Stack:** pnpm, Turborepo, TanStack Start, TanStack Router, TanStack Query, oRPC v1, effect-orpc, Effect-TS, better-auth, Hono, Drizzle ORM, SQLite (better-sqlite3), Zod v4, ts-pattern, oxlint, @effect/tsgo

**Spec:** `docs/superpowers/specs/2026-05-01-effect-orpc-monorepo-design.md`

---

## File Map

### Root
- `package.json` — workspace root, devDependencies for turbo/typescript/oxlint
- `pnpm-workspace.yaml` — workspace package globs
- `turbo.json` — task pipeline (dev, build, lint, test)
- `tsconfig.base.json` — shared TS config with @effect/tsgo plugin
- `oxlint.json` — linting config, no-unsafe-type-assertion = error
- `.gitignore` — node_modules, dist, .turbo, *.db

### packages/shared
- `package.json` — exports raw .ts source, deps: zod, effect, effect-orpc
- `tsconfig.json` — extends base
- `src/index.ts` — barrel export
- `src/todos.ts` — S_Todo, SIn/SOut schemas, I_* types, E_* error classes
- `src/auth.ts` — shared auth types

### apps/backend
- `package.json` — deps: @orpc/server, effect-orpc, effect, hono, better-auth, drizzle-orm, better-sqlite3, nanoid
- `tsconfig.json` — extends base
- `drizzle.config.ts` — Drizzle Kit config for SQLite
- `src/db/schema.ts` — T_todos Drizzle table definition, Row_Todo, RowInsert_Todo
- `src/db/index.ts` — SQLite connection as Effect service (Svc_Database + L_Database)
- `src/auth.ts` — better-auth server config with Drizzle adapter
- `src/services/todos-repo.ts` — Svc_TodosRepo tag + L_TodosRepo layer implementation
- `src/runtime.ts` — RT_main ManagedRuntime assembly
- `src/middleware/auth.ts` — MW_authed oRPC middleware
- `src/routes/todos.ts` — D_listTodos, D_createTodo, D_toggleTodo, D_deleteTodo
- `src/router.ts` — R_todos, R_root assembly
- `src/index.ts` — Hono server entry, mounts oRPC + better-auth
- `src/__tests__/todos-repo.test.ts` — Effect service tests with isolated test DB

### apps/web
- `package.json` — deps: @tanstack/start, @tanstack/react-router, @tanstack/react-query, @orpc/client, @orpc/tanstack-query, better-auth, ts-pattern, effect, effect-orpc, react, react-dom
- `tsconfig.json` — extends base
- `app.config.ts` — TanStack Start config with Vite proxy to backend
- `src/router.tsx` — TanStack Router setup with QueryClient context
- `src/routes/__root.tsx` — root layout with QueryClientProvider
- `src/routes/login.tsx` — email/password login form
- `src/routes/signup.tsx` — registration form
- `src/routes/_authed.tsx` — layout route, redirects if no session
- `src/routes/_authed/todos.tsx` — todo list page with data loading
- `src/components/C_TodoList.tsx` — renders list of todos
- `src/components/C_TodoItem.tsx` — single todo with toggle/delete
- `src/components/C_TodoForm.tsx` — create todo form
- `src/lib/orpc.ts` — oRPC client + TanStack Query utils
- `src/lib/auth-client.ts` — better-auth client

---

## Naming Convention Reference

| Category | Prefix | Example |
|----------|--------|---------|
| Drizzle table | `T_*` | `T_todos` |
| Select type | `Row_*` | `Row_Todo` |
| Insert type | `RowInsert_*` | `RowInsert_Todo` |
| Zod schema | `S_*` | `S_Todo` |
| Input schema | `SIn_D_*` | `SIn_D_listTodos` |
| Output schema | `SOut_D_*` | `SOut_D_listTodos` |
| Inferred type | `I_*` | `I_Todo` |
| Effect error | `E_*` | `E_TodoNotFound` |
| Effect service | `Svc_*` | `Svc_TodosRepo` |
| Effect layer | `L_*` | `L_TodosRepo` |
| Effect runtime | `RT_*` | `RT_main` |
| oRPC procedure | `D_*` | `D_listTodos` |
| oRPC middleware | `MW_*` | `MW_authed` |
| oRPC router | `R_*` | `R_todos` |
| React component | `C_*` | `C_TodoList` |

---

### Task 1: Monorepo Root Scaffolding

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `oxlint.json`
- Create: `.gitignore`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "effect-orpc-messaround",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "oxlint .",
    "test": "turbo test"
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "latest",
    "oxlint": "latest"
  }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".output/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

- [ ] **Step 4: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "jsx": "react-jsx",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "plugins": [
      {
        "name": "@effect/tsgo",
        "diagnostics": true,
        "refactors": true,
        "quickinfo": true
      }
    ]
  }
}
```

- [ ] **Step 5: Create oxlint.json**

```json
{
  "$schema": "https://raw.githubusercontent.com/oxc-project/oxc/main/npm/oxlint/configuration_schema.json",
  "rules": {
    "typescript/no-unsafe-type-assertion": "error"
  },
  "ignorePatterns": ["node_modules", "dist", ".output", ".turbo", "*.gen.ts"]
}
```

- [ ] **Step 6: Create .gitignore**

```
node_modules
dist
.output
.turbo
*.db
.env
.env.local
```

- [ ] **Step 7: Run pnpm install at root**

Run: `cd ~/effect-orpc-messaround && pnpm install`
Expected: Creates pnpm-lock.yaml, installs turbo/typescript/oxlint

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: monorepo root scaffolding with pnpm + turbo + oxlint"
```

---

### Task 2: Shared Contracts Package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/todos.ts`
- Create: `packages/shared/src/auth.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Create packages/shared/package.json**

The `exports` field points to raw `.ts` source — no build step needed during dev. Vite compiles it on the fly via workspace links.

```json
{
  "name": "@repo/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "zod": "latest",
    "effect": "latest",
    "effect-orpc": "latest"
  }
}
```

- [ ] **Step 2: Create packages/shared/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create packages/shared/src/todos.ts**

This is the contract layer — Zod schemas as source of truth, inferred types, and Effect error classes.

```typescript
import { z } from "zod";
import { ORPCTaggedError } from "effect-orpc";

// ── Domain Object Schema ──

export const S_Todo = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  createdAt: z.coerce.date(),
});

export type I_Todo = z.infer<typeof S_Todo>;

// ── Endpoint Schemas ──

export const SIn_D_listTodos = z.object({
  filter: z.enum(["all", "active", "completed"]).optional(),
});
export const SOut_D_listTodos = z.object({
  todos: z.array(S_Todo),
});

export const SIn_D_createTodo = z.object({
  title: z.string().min(1).max(255),
});
export const SOut_D_createTodo = S_Todo;

export const SIn_D_toggleTodo = z.object({
  id: z.string(),
});
export const SOut_D_toggleTodo = S_Todo;

export const SIn_D_deleteTodo = z.object({
  id: z.string(),
});
export const SOut_D_deleteTodo = z.object({
  success: z.literal(true),
});

// ── Inferred Types ──

export type IIn_D_listTodos = z.infer<typeof SIn_D_listTodos>;
export type IOut_D_listTodos = z.infer<typeof SOut_D_listTodos>;
export type IIn_D_createTodo = z.infer<typeof SIn_D_createTodo>;
export type IOut_D_createTodo = z.infer<typeof SOut_D_createTodo>;
export type IIn_D_toggleTodo = z.infer<typeof SIn_D_toggleTodo>;
export type IOut_D_toggleTodo = z.infer<typeof SOut_D_toggleTodo>;
export type IIn_D_deleteTodo = z.infer<typeof SIn_D_deleteTodo>;
export type IOut_D_deleteTodo = z.infer<typeof SOut_D_deleteTodo>;

// ── Error Classes ──

export class E_TodoNotFound extends ORPCTaggedError("E_TodoNotFound", {
  status: 404,
}) {
  readonly id!: string;
}

export class E_TodoValidation extends ORPCTaggedError("E_TodoValidation", {
  status: 400,
}) {
  readonly message!: string;
}

export class E_Database extends ORPCTaggedError("E_Database", {
  status: 500,
}) {
  readonly message!: string;
}
```

- [ ] **Step 4: Create packages/shared/src/auth.ts**

```typescript
import { z } from "zod";

export const S_Session = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
  }),
});

export type I_Session = z.infer<typeof S_Session>;
```

- [ ] **Step 5: Create packages/shared/src/index.ts**

```typescript
export * from "./todos";
export * from "./auth";
```

- [ ] **Step 6: Install shared package dependencies**

Run: `cd ~/effect-orpc-messaround && pnpm install`
Expected: Installs zod, effect, effect-orpc in packages/shared

- [ ] **Step 7: Commit**

```bash
git add packages/shared
git commit -m "feat: shared contracts package with Zod schemas and Effect error classes"
```

---

### Task 3: Backend Scaffolding + Database Layer

**Files:**
- Create: `apps/backend/package.json`
- Create: `apps/backend/tsconfig.json`
- Create: `apps/backend/drizzle.config.ts`
- Create: `apps/backend/src/db/schema.ts`
- Create: `apps/backend/src/db/index.ts`

- [ ] **Step 1: Create apps/backend/package.json**

```json
{
  "name": "@repo/backend",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./router": "./src/router.ts"
  },
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup src/index.ts --format esm --dts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "test": "vitest run"
  },
  "dependencies": {
    "@repo/shared": "workspace:*",
    "@orpc/server": "latest",
    "effect-orpc": "latest",
    "effect": "latest",
    "hono": "latest",
    "better-auth": "latest",
    "drizzle-orm": "latest",
    "better-sqlite3": "latest",
    "nanoid": "latest"
  },
  "devDependencies": {
    "tsx": "latest",
    "tsup": "latest",
    "drizzle-kit": "latest",
    "vitest": "latest",
    "@types/better-sqlite3": "latest"
  }
}
```

- [ ] **Step 2: Create apps/backend/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src", "drizzle.config.ts"]
}
```

- [ ] **Step 3: Create apps/backend/drizzle.config.ts**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./local.db",
  },
});
```

- [ ] **Step 4: Create apps/backend/src/db/schema.ts**

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const T_todos = sqliteTable("todos", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  userId: text("user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type Row_Todo = typeof T_todos.$inferSelect;
export type RowInsert_Todo = typeof T_todos.$inferInsert;
```

- [ ] **Step 5: Create apps/backend/src/db/index.ts**

The database connection is an Effect service so it can be swapped for testing.

```typescript
import { Context, Layer, Effect } from "effect";
import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type DrizzleDB = BetterSQLite3Database<typeof schema>;

export class Svc_Database extends Context.Tag("Svc_Database")<
  Svc_Database,
  DrizzleDB
>() {}

export const L_Database = (dbPath: string) =>
  Layer.sync(Svc_Database, () => {
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    return drizzle(sqlite, { schema });
  });
```

- [ ] **Step 6: Install backend dependencies and push schema**

Run:
```bash
cd ~/effect-orpc-messaround && pnpm install
cd apps/backend && pnpm db:push
```
Expected: Installs all deps, creates local.db with todos table. better-auth will create its own tables later.

- [ ] **Step 7: Commit**

```bash
git add apps/backend .gitignore pnpm-lock.yaml
git commit -m "feat: backend scaffolding with Drizzle SQLite schema and Effect DB service"
```

---

### Task 4: Backend better-auth Setup

**Files:**
- Create: `apps/backend/src/auth.ts`

- [ ] **Step 1: Create apps/backend/src/auth.ts**

better-auth with email/password, Drizzle adapter, SQLite. It manages its own user/session tables.

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const sqlite = new Database("./local.db");
const db = drizzle(sqlite);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: ["http://localhost:3000"],
});
```

- [ ] **Step 2: Generate better-auth tables**

Run:
```bash
cd ~/effect-orpc-messaround/apps/backend
npx @better-auth/cli generate --config ./src/auth.ts
```
Expected: Generates migration files for better-auth user/session tables. Review the output and run migrations if needed. Alternatively, better-auth auto-creates tables on first request if using the `push` approach — verify which method the CLI produces.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/auth.ts
git commit -m "feat: better-auth setup with email/password and Drizzle SQLite adapter"
```

---

### Task 5: Backend Effect Services (TDD)

**Files:**
- Create: `apps/backend/src/services/todos-repo.ts`
- Create: `apps/backend/src/__tests__/todos-repo.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/__tests__/todos-repo.test.ts`. This test creates an isolated in-memory SQLite DB, proving the DI pattern works for future test parallelization.

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { Effect, Layer, ManagedRuntime } from "effect";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import * as schema from "../db/schema";
import { Svc_Database, type DrizzleDB } from "../db";
import { Svc_TodosRepo, L_TodosRepo } from "../services/todos-repo";
import { E_TodoNotFound } from "@repo/shared";

function makeTestRuntime() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });

  // Create tables in memory
  db.run(sql`CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`);

  const L_TestDatabase = Layer.succeed(Svc_Database, db);
  const TestLayer = Layer.merge(L_TestDatabase, L_TodosRepo);
  return ManagedRuntime.make(TestLayer);
}

describe("Svc_TodosRepo", () => {
  let runtime: ReturnType<typeof makeTestRuntime>;

  beforeAll(() => {
    runtime = makeTestRuntime();
  });

  it("creates a todo and lists it", async () => {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        const created = yield* repo.create("Test todo", "user-1");
        const listed = yield* repo.list();
        return { created, listed };
      })
    );

    expect(result.created.title).toBe("Test todo");
    expect(result.created.completed).toBe(false);
    expect(result.listed).toHaveLength(1);
    expect(result.listed[0].id).toBe(result.created.id);
  });

  it("toggles a todo", async () => {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        const created = yield* repo.create("Toggle me", "user-1");
        const toggled = yield* repo.toggle(created.id, "user-1");
        return toggled;
      })
    );

    expect(result.completed).toBe(true);
  });

  it("deletes a todo", async () => {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        const created = yield* repo.create("Delete me", "user-1");
        yield* repo.delete(created.id, "user-1");
        const listed = yield* repo.list();
        const found = listed.find((t) => t.id === created.id);
        return found;
      })
    );

    expect(result).toBeUndefined();
  });

  it("fails with E_TodoNotFound when toggling nonexistent todo", async () => {
    const result = await runtime.runPromiseExit(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        return yield* repo.toggle("nonexistent-id", "user-1");
      })
    );

    expect(result._tag).toBe("Failure");
  });

  it("filters by active/completed", async () => {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        const t1 = yield* repo.create("Active todo", "user-2");
        const t2 = yield* repo.create("Completed todo", "user-2");
        yield* repo.toggle(t2.id, "user-2");

        const active = yield* repo.list("active");
        const completed = yield* repo.list("completed");
        return { active, completed };
      })
    );

    expect(result.active.some((t) => t.title === "Active todo")).toBe(true);
    expect(result.active.some((t) => t.title === "Completed todo")).toBe(false);
    expect(result.completed.some((t) => t.title === "Completed todo")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd ~/effect-orpc-messaround/apps/backend && pnpm vitest run src/__tests__/todos-repo.test.ts`
Expected: FAIL — `Cannot find module '../services/todos-repo'`

- [ ] **Step 3: Implement Svc_TodosRepo and L_TodosRepo**

Create `apps/backend/src/services/todos-repo.ts`:

```typescript
import { Context, Effect, Layer } from "effect";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { I_Todo } from "@repo/shared";
import { E_TodoNotFound, E_Database } from "@repo/shared";
import { Svc_Database } from "../db";
import { T_todos } from "../db/schema";

export class Svc_TodosRepo extends Context.Tag("Svc_TodosRepo")<
  Svc_TodosRepo,
  {
    list: (filter?: string) => Effect.Effect<I_Todo[], E_Database>;
    create: (
      title: string,
      userId: string
    ) => Effect.Effect<I_Todo, E_Database>;
    toggle: (
      id: string,
      userId: string
    ) => Effect.Effect<I_Todo, E_TodoNotFound | E_Database>;
    delete: (
      id: string,
      userId: string
    ) => Effect.Effect<void, E_TodoNotFound | E_Database>;
  }
>() {}

function rowToTodo(row: typeof T_todos.$inferSelect): I_Todo {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed,
    createdAt: row.createdAt,
  };
}

export const L_TodosRepo = Layer.effect(
  Svc_TodosRepo,
  Effect.gen(function* () {
    const db = yield* Svc_Database;

    return {
      list: (filter) =>
        Effect.try({
          try: () => {
            let query = db.select().from(T_todos);
            if (filter === "active") {
              query = query.where(eq(T_todos.completed, false));
            } else if (filter === "completed") {
              query = query.where(eq(T_todos.completed, true));
            }
            return query.all().map(rowToTodo);
          },
          catch: (error) =>
            new E_Database({ message: String(error) }),
        }),

      create: (title, userId) =>
        Effect.try({
          try: () => {
            const id = nanoid();
            const now = new Date();
            db.insert(T_todos)
              .values({ id, title, completed: false, userId, createdAt: now })
              .run();
            return { id, title, completed: false, createdAt: now };
          },
          catch: (error) =>
            new E_Database({ message: String(error) }),
        }),

      toggle: (id, userId) =>
        Effect.gen(function* () {
          const existing = yield* Effect.try({
            try: () =>
              db
                .select()
                .from(T_todos)
                .where(and(eq(T_todos.id, id), eq(T_todos.userId, userId)))
                .get(),
            catch: (error) =>
              new E_Database({ message: String(error) }),
          });

          if (!existing) {
            return yield* Effect.fail(new E_TodoNotFound({ id }));
          }

          const newCompleted = !existing.completed;
          yield* Effect.try({
            try: () =>
              db
                .update(T_todos)
                .set({ completed: newCompleted })
                .where(eq(T_todos.id, id))
                .run(),
            catch: (error) =>
              new E_Database({ message: String(error) }),
          });

          return rowToTodo({ ...existing, completed: newCompleted });
        }),

      delete: (id, userId) =>
        Effect.gen(function* () {
          const existing = yield* Effect.try({
            try: () =>
              db
                .select()
                .from(T_todos)
                .where(and(eq(T_todos.id, id), eq(T_todos.userId, userId)))
                .get(),
            catch: (error) =>
              new E_Database({ message: String(error) }),
          });

          if (!existing) {
            return yield* Effect.fail(new E_TodoNotFound({ id }));
          }

          yield* Effect.try({
            try: () => db.delete(T_todos).where(eq(T_todos.id, id)).run(),
            catch: (error) =>
              new E_Database({ message: String(error) }),
          });
        }),
    };
  })
);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/effect-orpc-messaround/apps/backend && pnpm vitest run src/__tests__/todos-repo.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/services apps/backend/src/__tests__
git commit -m "feat: Svc_TodosRepo Effect service with DI + tests"
```

---

### Task 6: Backend Runtime + oRPC Procedures + Router

**Files:**
- Create: `apps/backend/src/runtime.ts`
- Create: `apps/backend/src/middleware/auth.ts`
- Create: `apps/backend/src/routes/todos.ts`
- Create: `apps/backend/src/router.ts`

- [ ] **Step 1: Create apps/backend/src/runtime.ts**

```typescript
import { Layer, ManagedRuntime } from "effect";
import { L_Database } from "./db";
import { L_TodosRepo } from "./services/todos-repo";

const MainLayer = L_TodosRepo.pipe(
  Layer.provide(L_Database("./local.db"))
);

export const RT_main = ManagedRuntime.make(MainLayer);
```

- [ ] **Step 2: Create apps/backend/src/middleware/auth.ts**

```typescript
import { os } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import { auth } from "../auth";

export const MW_authed = os.middleware(async ({ context, next }) => {
  const session = await auth.api.getSession({
    headers: context.headers,
  });

  if (!session) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "You must be logged in",
    });
  }

  return next({
    context: {
      ...context,
      session,
    },
  });
});
```

- [ ] **Step 3: Create apps/backend/src/routes/todos.ts**

All four domain procedures using effect-orpc with typed errors.

```typescript
import { makeEffectORPC } from "effect-orpc";
import { RT_main } from "../runtime";
import { MW_authed } from "../middleware/auth";
import { Svc_TodosRepo } from "../services/todos-repo";
import {
  SIn_D_listTodos,
  SOut_D_listTodos,
  SIn_D_createTodo,
  SOut_D_createTodo,
  SIn_D_toggleTodo,
  SOut_D_toggleTodo,
  SIn_D_deleteTodo,
  SOut_D_deleteTodo,
  E_Database,
  E_TodoNotFound,
  E_TodoValidation,
} from "@repo/shared";

const effectOs = makeEffectORPC(RT_main);
const authedEffectOs = makeEffectORPC(RT_main, MW_authed);

export const D_listTodos = authedEffectOs
  .errors(E_Database)
  .input(SIn_D_listTodos)
  .output(SOut_D_listTodos)
  .effect(function* ({ input, context }) {
    const repo = yield* Svc_TodosRepo;
    const todos = yield* repo.list(input.filter);
    return { todos };
  });

export const D_createTodo = authedEffectOs
  .errors(E_TodoValidation, E_Database)
  .input(SIn_D_createTodo)
  .output(SOut_D_createTodo)
  .effect(function* ({ input, context }) {
    const repo = yield* Svc_TodosRepo;
    return yield* repo.create(input.title, context.session.user.id);
  });

export const D_toggleTodo = authedEffectOs
  .errors(E_TodoNotFound, E_Database)
  .input(SIn_D_toggleTodo)
  .output(SOut_D_toggleTodo)
  .effect(function* ({ input, context }) {
    const repo = yield* Svc_TodosRepo;
    return yield* repo.toggle(input.id, context.session.user.id);
  });

export const D_deleteTodo = authedEffectOs
  .errors(E_TodoNotFound, E_Database)
  .input(SIn_D_deleteTodo)
  .output(SOut_D_deleteTodo)
  .effect(function* ({ input, context }) {
    const repo = yield* Svc_TodosRepo;
    yield* repo.delete(input.id, context.session.user.id);
    return { success: true };
  });
```

- [ ] **Step 4: Create apps/backend/src/router.ts**

```typescript
import { D_listTodos, D_createTodo, D_toggleTodo, D_deleteTodo } from "./routes/todos";

export const R_todos = {
  list: D_listTodos,
  create: D_createTodo,
  toggle: D_toggleTodo,
  delete: D_deleteTodo,
};

export const R_root = {
  todos: R_todos,
};
```

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/runtime.ts apps/backend/src/middleware apps/backend/src/routes apps/backend/src/router.ts
git commit -m "feat: oRPC procedures with effect-orpc typed errors and auth middleware"
```

---

### Task 7: Backend Hono Server Entry

**Files:**
- Create: `apps/backend/src/index.ts`

- [ ] **Step 1: Create apps/backend/src/index.ts**

Hono server that mounts both oRPC and better-auth handlers.

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { RPCHandler } from "@orpc/server/fetch";
import { onError } from "@orpc/server";
import { R_root } from "./router";
import { auth } from "./auth";

const app = new Hono();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// better-auth handler
app.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

// oRPC handler
const rpcHandler = new RPCHandler(R_root, {
  interceptors: [
    onError((error) => {
      console.error("[oRPC Error]", error);
    }),
  ],
});

app.all("/rpc/*", async (c) => {
  const response = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: { headers: c.req.raw.headers },
  });

  if (response) return response;
  return c.text("Not found", 404);
});

const port = 3001;
console.log(`Backend running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
```

- [ ] **Step 2: Verify the backend starts**

Run: `cd ~/effect-orpc-messaround/apps/backend && pnpm dev`
Expected: `Backend running on http://localhost:3001` — the server starts without errors. Kill it with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/index.ts
git commit -m "feat: Hono server entry mounting oRPC and better-auth"
```

---

### Task 8: Frontend TanStack Start Scaffolding

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/app.config.ts`
- Create: `apps/web/src/router.tsx`
- Create: `apps/web/src/routes/__root.tsx`
- Create: `apps/web/src/routes/index.tsx`

- [ ] **Step 1: Create apps/web/package.json**

```json
{
  "name": "@repo/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vinxi dev",
    "build": "vinxi build",
    "start": "vinxi start"
  },
  "dependencies": {
    "@repo/shared": "workspace:*",
    "@repo/backend": "workspace:*",
    "@tanstack/react-router": "latest",
    "@tanstack/start": "latest",
    "@tanstack/react-query": "latest",
    "@orpc/client": "latest",
    "@orpc/tanstack-query": "latest",
    "better-auth": "latest",
    "ts-pattern": "latest",
    "effect": "latest",
    "effect-orpc": "latest",
    "react": "latest",
    "react-dom": "latest",
    "vinxi": "latest"
  },
  "devDependencies": {
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "vite-tsconfig-paths": "latest"
  }
}
```

- [ ] **Step 2: Create apps/web/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "~/*": ["./src/*"]
    }
  },
  "include": ["src", "app.config.ts"]
}
```

- [ ] **Step 3: Create apps/web/app.config.ts**

```typescript
import { defineConfig } from "@tanstack/start/config";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
    ],
    server: {
      proxy: {
        "/api": "http://localhost:3001",
        "/rpc": "http://localhost:3001",
      },
    },
  },
});
```

- [ ] **Step 4: Create apps/web/src/router.tsx**

```typescript
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";

export function createRouter() {
  const queryClient = new QueryClient();

  const router = createTanStackRouter({
    routeTree,
    defaultPreload: "intent",
    context: {
      queryClient,
    },
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
```

- [ ] **Step 5: Create apps/web/src/routes/__root.tsx**

```tsx
import {
  createRootRouteWithContext,
  Outlet,
  ScrollRestoration,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Meta, Scripts } from "@tanstack/start";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <Outlet />
        </QueryClientProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Create apps/web/src/routes/index.tsx**

A simple landing page that redirects to /todos if authed or /login if not.

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: C_Index,
});

function C_Index() {
  return (
    <div>
      <h1>Effect-oRPC Demo</h1>
      <p>
        <a href="/login">Login</a> | <a href="/signup">Sign Up</a>
      </p>
    </div>
  );
}
```

- [ ] **Step 7: Install frontend dependencies**

Run: `cd ~/effect-orpc-messaround && pnpm install`
Expected: All workspace deps resolve, pnpm-lock.yaml updated

- [ ] **Step 8: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat: TanStack Start scaffolding with QueryClient context and Vite proxy"
```

---

### Task 9: Frontend Auth (Client + Pages + Guard)

**Files:**
- Create: `apps/web/src/lib/auth-client.ts`
- Create: `apps/web/src/routes/login.tsx`
- Create: `apps/web/src/routes/signup.tsx`
- Create: `apps/web/src/routes/_authed.tsx`

- [ ] **Step 1: Create apps/web/src/lib/auth-client.ts**

```typescript
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: "/api/auth",
});
```

- [ ] **Step 2: Create apps/web/src/routes/login.tsx**

```tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/login")({
  component: C_Login,
});

function C_Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = await authClient.signIn.email({
      email,
      password,
    });

    if (result.error) {
      setError(result.error.message ?? "Login failed");
      return;
    }

    navigate({ to: "/todos" });
  };

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit">Log In</button>
      </form>
      <p>
        Don't have an account? <a href="/signup">Sign up</a>
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Create apps/web/src/routes/signup.tsx**

```tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/signup")({
  component: C_Signup,
});

function C_Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = await authClient.signUp.email({
      name,
      email,
      password,
    });

    if (result.error) {
      setError(result.error.message ?? "Sign up failed");
      return;
    }

    navigate({ to: "/todos" });
  };

  return (
    <div>
      <h1>Sign Up</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit">Sign Up</button>
      </form>
      <p>
        Already have an account? <a href="/login">Log in</a>
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Create apps/web/src/routes/_authed.tsx**

Layout route that guards all child routes behind authentication.

```tsx
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    return { session: session.data };
  },
  component: () => <Outlet />,
});
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/auth-client.ts apps/web/src/routes/login.tsx apps/web/src/routes/signup.tsx apps/web/src/routes/_authed.tsx
git commit -m "feat: frontend auth with better-auth client, login/signup pages, and auth guard"
```

---

### Task 10: Frontend oRPC Client + Todo Pages

**Files:**
- Create: `apps/web/src/lib/orpc.ts`
- Create: `apps/web/src/components/C_TodoForm.tsx`
- Create: `apps/web/src/components/C_TodoItem.tsx`
- Create: `apps/web/src/components/C_TodoList.tsx`
- Create: `apps/web/src/routes/_authed/todos.tsx`

- [ ] **Step 1: Create apps/web/src/lib/orpc.ts**

oRPC client with TanStack Query utils. Uses the Vite proxy so all requests go to `/rpc/*`.

```typescript
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { R_root } from "@repo/backend/router";

const link = RPCLink({
  url: "/rpc",
  headers: () => ({
    "Content-Type": "application/json",
  }),
  fetch: (input, init) =>
    fetch(input, { ...init, credentials: "include" }),
});

const client = createORPCClient<typeof R_root>(link);

export const orpc = createTanstackQueryUtils(client);
```

**Note:** The `typeof R_root` import is type-only — no runtime code from the backend leaks to the frontend. This is how oRPC achieves end-to-end type safety.

- [ ] **Step 2: Create apps/web/src/components/C_TodoForm.tsx**

```tsx
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "~/lib/orpc";

export function C_TodoForm() {
  const [title, setTitle] = useState("");
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    ...orpc.todos.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.todos.list.queryOptions({ input: {} }).queryKey });
      setTitle("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate({ input: { title: title.trim() } });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="What needs to be done?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={255}
      />
      <button type="submit" disabled={createMutation.isPending}>
        Add
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create apps/web/src/components/C_TodoItem.tsx**

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { match } from "ts-pattern";
import { orpc } from "~/lib/orpc";
import { E_TodoNotFound, E_Database } from "@repo/shared";
import type { I_Todo } from "@repo/shared";

export function C_TodoItem({ todo }: { todo: I_Todo }) {
  const queryClient = useQueryClient();
  const listQueryKey = orpc.todos.list.queryOptions({ input: {} }).queryKey;

  const toggleMutation = useMutation({
    ...orpc.todos.toggle.mutationOptions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listQueryKey }),
  });

  const deleteMutation = useMutation({
    ...orpc.todos.delete.mutationOptions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listQueryKey }),
  });

  const error = toggleMutation.error ?? deleteMutation.error;

  return (
    <li>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => toggleMutation.mutate({ input: { id: todo.id } })}
        disabled={toggleMutation.isPending}
      />
      <span style={{ textDecoration: todo.completed ? "line-through" : "none" }}>
        {todo.title}
      </span>
      <button
        onClick={() => deleteMutation.mutate({ input: { id: todo.id } })}
        disabled={deleteMutation.isPending}
      >
        x
      </button>
      {error &&
        match(error)
          .instanceOf(E_TodoNotFound, (e) => <span> Todo not found</span>)
          .instanceOf(E_Database, (e) => <span> DB error: {e.message}</span>)
          .otherwise(() => <span> Something went wrong</span>)}
    </li>
  );
}
```

- [ ] **Step 4: Create apps/web/src/components/C_TodoList.tsx**

```tsx
import type { I_Todo } from "@repo/shared";
import { C_TodoItem } from "./C_TodoItem";

export function C_TodoList({ todos }: { todos: I_Todo[] }) {
  if (todos.length === 0) {
    return <p>No todos yet. Add one above!</p>;
  }

  return (
    <ul>
      {todos.map((todo) => (
        <C_TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}
```

- [ ] **Step 5: Create apps/web/src/routes/_authed/todos.tsx**

The main page — loads todos via oRPC + TanStack Query, handles errors with ts-pattern.

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { match } from "ts-pattern";
import { orpc } from "~/lib/orpc";
import { E_Database } from "@repo/shared";
import { C_TodoList } from "~/components/C_TodoList";
import { C_TodoForm } from "~/components/C_TodoForm";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/_authed/todos")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(
      orpc.todos.list.queryOptions({ input: {} })
    );
  },
  component: C_PageTodos,
});

function C_PageTodos() {
  const { session } = Route.useRouteContext();
  const { data, error } = useSuspenseQuery(
    orpc.todos.list.queryOptions({ input: {} })
  );

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  if (error) {
    return match(error)
      .instanceOf(E_Database, (e) => (
        <div>
          <h1>Database Error</h1>
          <p>{e.message}</p>
        </div>
      ))
      .otherwise(() => (
        <div>
          <h1>Something went wrong</h1>
        </div>
      ));
  }

  return (
    <div>
      <header>
        <h1>Todos</h1>
        <span>{session.user.email}</span>
        <button onClick={handleLogout}>Logout</button>
      </header>
      <C_TodoForm />
      <C_TodoList todos={data.todos} />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/orpc.ts apps/web/src/components apps/web/src/routes/_authed
git commit -m "feat: frontend todo pages with oRPC client, ts-pattern error handling"
```

---

### Task 11: Dev Workflow + End-to-End Verification

**Files:**
- Modify: `turbo.json` (if needed)

- [ ] **Step 1: Verify pnpm install is clean**

Run: `cd ~/effect-orpc-messaround && pnpm install`
Expected: No errors, all workspace dependencies resolve

- [ ] **Step 2: Start the backend**

Run: `cd ~/effect-orpc-messaround/apps/backend && pnpm dev`
Expected: `Backend running on http://localhost:3001`

- [ ] **Step 3: Start the frontend (in a separate terminal)**

Run: `cd ~/effect-orpc-messaround/apps/web && pnpm dev`
Expected: TanStack Start dev server starts on http://localhost:3000

- [ ] **Step 4: Test the auth flow**

1. Open http://localhost:3000 in a browser
2. Click "Sign Up" — create an account with email/password
3. Should redirect to /todos after successful signup
4. Visit /login — log in with the same credentials
5. Should redirect to /todos

- [ ] **Step 5: Test the todo CRUD flow**

1. On /todos, add a new todo via the form
2. Todo appears in the list
3. Click the checkbox to toggle it — text gets strikethrough
4. Click 'x' to delete it — todo disappears
5. Refresh the page — state persists (SQLite)

- [ ] **Step 6: Test the auth guard**

1. Open a private/incognito window
2. Navigate to http://localhost:3000/todos
3. Should redirect to /login

- [ ] **Step 7: Verify turbo dev runs both**

Run: `cd ~/effect-orpc-messaround && pnpm dev`
Expected: Turborepo starts both `@repo/backend` and `@repo/web` in parallel

- [ ] **Step 8: Run linting**

Run: `cd ~/effect-orpc-messaround && pnpm lint`
Expected: oxlint runs across all packages. No `as` keyword violations in business logic.

- [ ] **Step 9: Run tests**

Run: `cd ~/effect-orpc-messaround && pnpm test`
Expected: Backend TodosRepo tests pass

- [ ] **Step 10: Final commit**

```bash
git add -A
git commit -m "feat: complete effect-orpc monorepo with end-to-end typed errors"
```
