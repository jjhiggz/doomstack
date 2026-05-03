# Declarative Filters + Postgres Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate from SQLite to Postgres, add declarative filter builders for todos, and build a DataTable UI with URL-driven filter/sort controls.

**Architecture:** Docker Compose provides Postgres 17 on port 5434. Backend switches from `better-sqlite3` to `pg` + Drizzle Postgres adapter. Declarative filter builders (pure functions returning `SQL | undefined`) compose via `and()`. Frontend uses TanStack Start's `validateSearch` with shared Zod schemas for URL-driven filter state.

**Tech Stack:** Drizzle ORM (Postgres), `pg`, Docker Compose, ts-pattern, TanStack Table, TanStack Start search params, shadcn/ui table primitives, Zod.

---

## File Map

### New files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Postgres 17 Alpine on port 5434 |
| `apps/backend/src/todos.filter.ts` | Declarative filter builder functions |
| `apps/web/src/components/C_DataTable.tsx` | Reusable DataTable with sort/filter controls |
| `apps/web/src/components/C_FilterText.tsx` | Debounced text search filter |
| `apps/web/src/components/C_FilterSelect.tsx` | Enum select filter |
| `apps/web/src/components/C_FilterDateRange.tsx` | Date range filter (from/to) |

### Modified files

| File | Change |
|------|--------|
| `packages/shared/src/todos.schema.ts` | Add `dueDate` to `S_Todo`, named filter enums, expanded `SIn_D_listTodos` |
| `packages/shared/src/todos.stub.ts` | Add `dueDate` generator |
| `apps/backend/src/todos.table.ts` | Switch `sqliteTable` → `pgTable`, add `dueDate` column |
| `apps/backend/src/auth.table.ts` | Switch `sqliteTable` → `pgTable` |
| `apps/backend/src/db.service.ts` | Switch to `pg` + Drizzle Postgres |
| `apps/backend/src/auth.config.ts` | Switch to Postgres adapter |
| `apps/backend/src/todos.service.ts` | Accept filter input object, use filter builders, add `dueDate` to `rowToTodo` |
| `apps/backend/src/todos.routes.ts` | Pass full input object to service |
| `apps/backend/src/runtime.ts` | Use connection string instead of file path |
| `apps/backend/drizzle.config.ts` | Switch to `postgresql` dialect |
| `apps/backend/package.json` | Swap `better-sqlite3` for `pg`, add `@types/pg` |
| `apps/backend/src/__tests__/todos.service.test.ts` | Use `pg` + Postgres for test DB |
| `testing/seeders/db.ts` | Switch to `pg` client |
| `testing/seeders/factories/todos.ts` | Add `dueDate` field |
| `testing/seeders/scenarios/basics.ts` | Add varied `dueDate` values |
| `testing/package.json` | Swap `better-sqlite3` for `pg` |
| `pnpm-workspace.yaml` | Remove `better-sqlite3` from `onlyBuiltDependencies` |
| `apps/web/src/routes/_authed/todos.tsx` | Replace list with DataTable, add `validateSearch` |
| `apps/web/src/lib/queries/todos.ts` | Pass filter input to query options |
| `apps/web/package.json` | Add `@tanstack/react-table` |

---

### Task 1: Docker Compose + Postgres Infrastructure

**Files:**
- Create: `docker-compose.yml`
- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:17-alpine
    ports:
      - "5434:5432"
    environment:
      POSTGRES_DB: effect_orpc
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 2: Remove `better-sqlite3` from `onlyBuiltDependencies` in `pnpm-workspace.yaml`**

Change `pnpm-workspace.yaml` to:

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "testing"

onlyBuiltDependencies:
  - esbuild
```

- [ ] **Step 3: Start Postgres and verify it's running**

Run: `docker compose up -d && sleep 2 && docker compose ps`

Expected: Container running, port 5434 mapped.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml pnpm-workspace.yaml
git commit -m "chore: add Docker Compose for Postgres 17 on port 5434"
```

---

### Task 2: Migrate Schema Files to Postgres

**Files:**
- Modify: `apps/backend/src/todos.table.ts`
- Modify: `apps/backend/src/auth.table.ts`

- [ ] **Step 1: Rewrite `apps/backend/src/todos.table.ts` to use `pgTable`**

```ts
import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const T_todos = pgTable("todos", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull(),
  dueDate: timestamp("due_date"),
});

export type Row_Todo = typeof T_todos.$inferSelect;
export type RowInsert_Todo = typeof T_todos.$inferInsert;
```

- [ ] **Step 2: Rewrite `apps/backend/src/auth.table.ts` to use `pgTable`**

Replace all `sqliteTable` with `pgTable`, all `integer(..., { mode: "boolean" })` with `boolean(...)`, all `integer(..., { mode: "timestamp_ms" })` with `timestamp(..., { mode: "date" })`, and all `text("id").primaryKey()` stays the same. Remove the `sql` import for `unixepoch` defaults and use `sql\`now()\`` instead:

```ts
import { relations, sql } from "drizzle-orm";
import { pgTable, text, boolean, timestamp, index } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`now()`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`now()`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
```

- [ ] **Step 3: Verify types compile**

Run: `cd apps/backend && npx tsc --noEmit 2>&1 | head -30`

Expected: Errors only from `db.service.ts` and `auth.config.ts` (still importing `better-sqlite3`). No errors from table files.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/todos.table.ts apps/backend/src/auth.table.ts
git commit -m "feat: migrate table definitions from sqliteTable to pgTable"
```

---

### Task 3: Migrate Database Service, Auth Config, and Runtime

**Files:**
- Modify: `apps/backend/src/db.service.ts`
- Modify: `apps/backend/src/auth.config.ts`
- Modify: `apps/backend/src/runtime.ts`
- Modify: `apps/backend/drizzle.config.ts`
- Modify: `apps/backend/package.json`

- [ ] **Step 1: Update `apps/backend/package.json` — swap SQLite for Postgres deps**

Replace `"better-sqlite3": "latest"` with `"pg": "latest"` in dependencies.
Replace `"@types/better-sqlite3": "latest"` with `"@types/pg": "latest"` in devDependencies.

- [ ] **Step 2: Run `pnpm install`**

Run: `pnpm install`

Expected: Installs `pg` and `@types/pg`, removes `better-sqlite3`.

- [ ] **Step 3: Rewrite `apps/backend/src/db.service.ts`**

```ts
import { Context, Layer } from "effect";
import pg from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./todos.table";

export type DrizzleDB = NodePgDatabase<typeof schema>;

export class Svc_Database extends Context.Tag("Svc_Database")<Svc_Database, DrizzleDB>() {}

export const L_Database = (connectionString: string) =>
  Layer.sync(Svc_Database, () => {
    const pool = new pg.Pool({ connectionString });
    return drizzle(pool, { schema });
  });
```

- [ ] **Step 4: Rewrite `apps/backend/src/auth.config.ts`**

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as authSchema from "./auth.table";

const pool = new pg.Pool({
  connectionString: "postgresql://postgres:postgres@localhost:5434/effect_orpc",
});
const db = drizzle(pool, { schema: authSchema });

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: ["http://localhost:3000"],
});
```

- [ ] **Step 5: Update `apps/backend/src/runtime.ts`**

```ts
import { Layer, ManagedRuntime } from "effect";
import { L_Database } from "./db.service";
import { L_TodosRepo } from "./todos.service";

const MainLayer = L_TodosRepo.pipe(
  Layer.provide(L_Database("postgresql://postgres:postgres@localhost:5434/effect_orpc")),
);

export const RT_main = ManagedRuntime.make(MainLayer);
```

- [ ] **Step 6: Update `apps/backend/drizzle.config.ts`**

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: ["./src/todos.table.ts", "./src/auth.table.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://postgres:postgres@localhost:5434/effect_orpc",
  },
});
```

- [ ] **Step 7: Verify types compile**

Run: `cd apps/backend && npx tsc --noEmit 2>&1 | head -30`

Expected: Errors only from `todos.service.ts` (the `.all()` and `.get()` calls are SQLite-specific), and `__tests__/todos.service.test.ts`. Table/config/runtime files should be clean.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/db.service.ts apps/backend/src/auth.config.ts apps/backend/src/runtime.ts apps/backend/drizzle.config.ts apps/backend/package.json pnpm-lock.yaml
git commit -m "feat: migrate db service, auth config, and runtime to Postgres"
```

---

### Task 4: Shared Schema Expansion — Filter Enums + dueDate

**Files:**
- Modify: `packages/shared/src/todos.schema.ts`
- Modify: `packages/shared/src/todos.stub.ts`

- [ ] **Step 1: Expand `packages/shared/src/todos.schema.ts`**

Add `dueDate` to `S_Todo`, add named filter enums, replace `SIn_D_listTodos`:

```ts
import { z } from "zod";
import { ORPCTaggedError } from "effect-orpc";

// ── Domain Object Schema ──

export const S_Todo = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  createdAt: z.coerce.date(),
  dueDate: z.coerce.date().nullable(),
});

export type I_Todo = z.infer<typeof S_Todo>;

// ── Filter Enums ──

export const S_completedFilter = z.enum(["all", "true", "false"]);
export const S_dueDateFilter = z.enum(["all", "has-date", "no-date", "overdue"]);
export const S_todoSortField = z.enum(["title", "createdAt", "completed", "dueDate"]);
export const S_sortOrder = z.enum(["asc", "desc"]);

// ── Endpoint Schemas ──

export const SIn_D_listTodos = z.object({
  search: z.string().optional(),
  completed: S_completedFilter.optional(),
  dueDate: S_dueDateFilter.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortField: S_todoSortField.optional(),
  sortOrder: S_sortOrder.optional(),
});
export const SOut_D_listTodos = z.object({
  todos: z.array(S_Todo),
});

export const SIn_D_createTodo = z.object({
  title: z.string().min(1).max(255),
  dueDate: z.coerce.date().nullable().optional(),
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
}) {}

export class E_TodoValidation extends ORPCTaggedError("E_TodoValidation", {
  status: 400,
}) {}

export class E_Database extends ORPCTaggedError("E_Database", {
  status: 500,
}) {}
```

- [ ] **Step 2: Update `packages/shared/src/todos.stub.ts`**

Add `dueDate` generator:

```ts
import { S_Todo } from "./todos.schema";
import { makeStub } from "./utils/stub-builder";

export const ST_Todo = makeStub(S_Todo, {
  generators: {
    id: ({ index = 0 }) => `todo-${index + 1}`,
    title: ({ index = 0 }) => `Todo ${index + 1}`,
    completed: () => false,
    createdAt: () => new Date("2025-01-01T00:00:00Z"),
    dueDate: () => null,
  },
});
```

- [ ] **Step 3: Verify types compile**

Run: `cd packages/shared && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/todos.schema.ts packages/shared/src/todos.stub.ts
git commit -m "feat: add filter enums, dueDate field, and expanded listTodos input schema"
```

---

### Task 5: Backend Filter Builders + Service Update

**Files:**
- Create: `apps/backend/src/todos.filter.ts`
- Modify: `apps/backend/src/todos.service.ts`
- Modify: `apps/backend/src/todos.routes.ts`

- [ ] **Step 1: Create `apps/backend/src/todos.filter.ts`**

```ts
import { eq, and, ilike, isNull, isNotNull, lt, gte, lte, between, asc, desc } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { match, P } from "ts-pattern";
import type { IIn_D_listTodos } from "@repo/shared/todos";
import { T_todos } from "./todos.table";

export function buildCompletedFilter(value: IIn_D_listTodos["completed"]): SQL | undefined {
  return match(value)
    .with("true", () => eq(T_todos.completed, true))
    .with("false", () => eq(T_todos.completed, false))
    .otherwise(() => undefined);
}

export function buildDueDateFilter(value: IIn_D_listTodos["dueDate"]): SQL | undefined {
  return match(value)
    .with("no-date", () => isNull(T_todos.dueDate))
    .with("has-date", () => isNotNull(T_todos.dueDate))
    .with("overdue", () => and(isNotNull(T_todos.dueDate), lt(T_todos.dueDate, new Date())))
    .otherwise(() => undefined);
}

export function buildDateRangeFilter(
  dateFrom: IIn_D_listTodos["dateFrom"],
  dateTo: IIn_D_listTodos["dateTo"],
): SQL | undefined {
  return match({ dateFrom, dateTo })
    .with(
      { dateFrom: P.nonNullable, dateTo: P.nonNullable },
      ({ dateFrom, dateTo }) => between(T_todos.createdAt, dateFrom, dateTo),
    )
    .with(
      { dateFrom: P.nonNullable },
      ({ dateFrom }) => gte(T_todos.createdAt, dateFrom),
    )
    .with(
      { dateTo: P.nonNullable },
      ({ dateTo }) => lte(T_todos.createdAt, dateTo),
    )
    .otherwise(() => undefined);
}

export function buildSearchFilter(search: IIn_D_listTodos["search"]): SQL | undefined {
  return match(search?.trim())
    .with(P.string.minLength(1), (search) => {
      const words = search.split(/\s+/);
      return and(...words.map((w) => ilike(T_todos.title, `%${w}%`)));
    })
    .otherwise(() => undefined);
}

export function buildSortClause(
  sortField: IIn_D_listTodos["sortField"],
  sortOrder: IIn_D_listTodos["sortOrder"],
): SQL {
  return match({ field: sortField, order: sortOrder })
    .with({ field: "title", order: "asc" }, () => asc(T_todos.title))
    .with({ field: "title", order: "desc" }, () => desc(T_todos.title))
    .with({ field: "createdAt", order: "asc" }, () => asc(T_todos.createdAt))
    .with({ field: "createdAt", order: "desc" }, () => desc(T_todos.createdAt))
    .with({ field: "completed", order: "asc" }, () => asc(T_todos.completed))
    .with({ field: "completed", order: "desc" }, () => desc(T_todos.completed))
    .with({ field: "dueDate", order: "asc" }, () => asc(T_todos.dueDate))
    .with({ field: "dueDate", order: "desc" }, () => desc(T_todos.dueDate))
    .otherwise(() => desc(T_todos.createdAt));
}
```

- [ ] **Step 2: Update `apps/backend/src/todos.service.ts`**

Replace the entire file. Key changes: `list` accepts `IIn_D_listTodos` instead of optional string, uses filter builders, Postgres uses promise-based `.execute()` instead of `.all()` / `.get()` / `.run()`, `rowToTodo` includes `dueDate`, `create` accepts optional `dueDate`:

```ts
import { Context, Effect, Layer } from "effect";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { I_Todo, IIn_D_listTodos } from "@repo/shared/todos";
import { E_TodoNotFound, E_Database } from "@repo/shared/todos";
import { Svc_Database } from "./db.service";
import { T_todos } from "./todos.table";
import {
  buildCompletedFilter,
  buildDueDateFilter,
  buildDateRangeFilter,
  buildSearchFilter,
  buildSortClause,
} from "./todos.filter";

export class Svc_TodosRepo extends Context.Tag("Svc_TodosRepo")<
  Svc_TodosRepo,
  {
    list: (input: IIn_D_listTodos) => Effect.Effect<I_Todo[], E_Database>;
    create: (title: string, userId: string, dueDate?: Date | null) => Effect.Effect<I_Todo, E_Database>;
    toggle: (id: string, userId: string) => Effect.Effect<I_Todo, E_TodoNotFound | E_Database>;
    delete: (id: string, userId: string) => Effect.Effect<void, E_TodoNotFound | E_Database>;
  }
>() {}

function rowToTodo(row: typeof T_todos.$inferSelect): I_Todo {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed,
    createdAt: row.createdAt,
    dueDate: row.dueDate,
  };
}

export const L_TodosRepo = Layer.effect(
  Svc_TodosRepo,
  Effect.gen(function* () {
    const db = yield* Svc_Database;

    return {
      list: (input) =>
        Effect.tryPromise({
          try: async () => {
            const completedWhere = buildCompletedFilter(input.completed);
            const dueDateWhere = buildDueDateFilter(input.dueDate);
            const dateWhere = buildDateRangeFilter(input.dateFrom, input.dateTo);
            const searchWhere = buildSearchFilter(input.search);
            const sortClause = buildSortClause(input.sortField, input.sortOrder);

            const rows = await db
              .select()
              .from(T_todos)
              .where(and(completedWhere, dueDateWhere, dateWhere, searchWhere))
              .orderBy(sortClause);

            return rows.map(rowToTodo);
          },
          catch: (error) => new E_Database({ message: String(error) }),
        }),

      create: (title, userId, dueDate) =>
        Effect.tryPromise({
          try: async () => {
            const id = nanoid();
            const now = new Date();
            await db.insert(T_todos).values({
              id,
              title,
              completed: false,
              userId,
              createdAt: now,
              dueDate: dueDate ?? null,
            });
            return { id, title, completed: false, createdAt: now, dueDate: dueDate ?? null };
          },
          catch: (error) => new E_Database({ message: String(error) }),
        }),

      toggle: (id, userId) =>
        Effect.gen(function* () {
          const rows = yield* Effect.tryPromise({
            try: () =>
              db
                .select()
                .from(T_todos)
                .where(and(eq(T_todos.id, id), eq(T_todos.userId, userId))),
            catch: (error) => new E_Database({ message: String(error) }),
          });

          const existing = rows[0];
          if (!existing) {
            return yield* Effect.fail(new E_TodoNotFound({ message: `Todo ${id} not found` }));
          }

          const newCompleted = !existing.completed;
          yield* Effect.tryPromise({
            try: () =>
              db.update(T_todos).set({ completed: newCompleted }).where(eq(T_todos.id, id)),
            catch: (error) => new E_Database({ message: String(error) }),
          });

          return rowToTodo({ ...existing, completed: newCompleted });
        }),

      delete: (id, userId) =>
        Effect.gen(function* () {
          const rows = yield* Effect.tryPromise({
            try: () =>
              db
                .select()
                .from(T_todos)
                .where(and(eq(T_todos.id, id), eq(T_todos.userId, userId))),
            catch: (error) => new E_Database({ message: String(error) }),
          });

          const existing = rows[0];
          if (!existing) {
            return yield* Effect.fail(new E_TodoNotFound({ message: `Todo ${id} not found` }));
          }

          yield* Effect.tryPromise({
            try: () => db.delete(T_todos).where(eq(T_todos.id, id)),
            catch: (error) => new E_Database({ message: String(error) }),
          });
        }),
    };
  }),
);
```

- [ ] **Step 3: Update `apps/backend/src/todos.routes.ts`**

Change the `D_listTodos` effect to pass the full input object instead of `input.filter`:

```ts
import { makeEffectORPC } from "effect-orpc";
import { RT_main } from "./runtime";
import { os_withHeaders, MW_authed } from "./auth.middleware";
import { Svc_TodosRepo } from "./todos.service";
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
} from "@repo/shared/todos";

const authedEffectOs = makeEffectORPC(RT_main, os_withHeaders.use(MW_authed));

export const D_listTodos = authedEffectOs
  .errors({ E_Database })
  .input(SIn_D_listTodos)
  .output(SOut_D_listTodos)
  .effect(function* ({ input }) {
    const repo = yield* Svc_TodosRepo;
    const todos = yield* repo.list(input);
    return { todos };
  });

export const D_createTodo = authedEffectOs
  .errors({ E_TodoValidation, E_Database })
  .input(SIn_D_createTodo)
  .output(SOut_D_createTodo)
  .effect(function* ({ input, context }) {
    const repo = yield* Svc_TodosRepo;
    return yield* repo.create(input.title, context.session.user.id, input.dueDate);
  });

export const D_toggleTodo = authedEffectOs
  .errors({ E_TodoNotFound, E_Database })
  .input(SIn_D_toggleTodo)
  .output(SOut_D_toggleTodo)
  .effect(function* ({ input, context }) {
    const repo = yield* Svc_TodosRepo;
    return yield* repo.toggle(input.id, context.session.user.id);
  });

export const D_deleteTodo = authedEffectOs
  .errors({ E_TodoNotFound, E_Database })
  .input(SIn_D_deleteTodo)
  .output(SOut_D_deleteTodo)
  .effect(function* ({ input, context }) {
    const repo = yield* Svc_TodosRepo;
    yield* repo.delete(input.id, context.session.user.id);
    return { success: true };
  });
```

- [ ] **Step 4: Verify types compile**

Run: `cd apps/backend && npx tsc --noEmit 2>&1 | head -30`

Expected: Only errors from `__tests__/todos.service.test.ts` (still using SQLite). All source files should be clean.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/todos.filter.ts apps/backend/src/todos.service.ts apps/backend/src/todos.routes.ts
git commit -m "feat: add declarative filter builders and update service for Postgres"
```

---

### Task 6: Update Backend Tests for Postgres

**Files:**
- Modify: `apps/backend/src/__tests__/todos.service.test.ts`

- [ ] **Step 1: Rewrite test file to use Postgres**

The test needs a running Postgres (from Docker Compose). It creates a test schema, runs tests, then drops it. Uses `Effect.tryPromise` instead of `Effect.try`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Effect, Layer, ManagedRuntime } from "effect";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "../todos.table";
import { Svc_Database } from "../db.service";
import { Svc_TodosRepo, L_TodosRepo } from "../todos.service";

const TEST_SCHEMA = `test_${Date.now()}`;
const CONNECTION_STRING = "postgresql://postgres:postgres@localhost:5434/effect_orpc";

let pool: pg.Pool;

function makeTestRuntime() {
  pool = new pg.Pool({ connectionString: CONNECTION_STRING });
  const db = drizzle(pool, { schema });

  const L_TestDatabase = Layer.succeed(Svc_Database, db);
  const TestLayer = Layer.provideMerge(L_TodosRepo, L_TestDatabase);
  return ManagedRuntime.make(TestLayer);
}

const runtime = makeTestRuntime();

beforeAll(async () => {
  // Create todos table if it doesn't exist (for test isolation, use the public schema)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT false,
      user_id TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL,
      due_date TIMESTAMP
    )
  `);
  // Clean any existing test data
  await pool.query(`DELETE FROM todos`);
});

afterAll(async () => {
  await pool.query(`DELETE FROM todos`);
  await pool.end();
});

describe("Svc_TodosRepo", () => {
  it("creates a todo and lists it", async () => {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        const created = yield* repo.create("Test todo", "user-1");
        const listed = yield* repo.list({});
        return { created, listed };
      }),
    );

    expect(result.created.title).toBe("Test todo");
    expect(result.created.completed).toBe(false);
    expect(result.created.dueDate).toBeNull();
    expect(result.listed.length).toBeGreaterThanOrEqual(1);
    expect(result.listed).toContainEqual(expect.objectContaining({ id: result.created.id }));
  });

  it("creates a todo with dueDate", async () => {
    const dueDate = new Date("2026-06-15T00:00:00Z");
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        return yield* repo.create("Due date todo", "user-1", dueDate);
      }),
    );

    expect(result.dueDate).toEqual(dueDate);
  });

  it("toggles a todo", async () => {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        const created = yield* repo.create("Toggle me", "user-1");
        const toggled = yield* repo.toggle(created.id, "user-1");
        return toggled;
      }),
    );

    expect(result.completed).toBe(true);
  });

  it("deletes a todo", async () => {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        const created = yield* repo.create("Delete me", "user-1");
        yield* repo.delete(created.id, "user-1");
        const listed = yield* repo.list({});
        const found = listed.find((t) => t.id === created.id);
        return found;
      }),
    );

    expect(result).toBeUndefined();
  });

  it("fails with E_TodoNotFound when toggling nonexistent todo", async () => {
    const result = await runtime.runPromiseExit(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        return yield* repo.toggle("nonexistent-id", "user-1");
      }),
    );

    expect(result._tag).toBe("Failure");
  });

  it("filters by completed status", async () => {
    // Clean slate
    await pool.query(`DELETE FROM todos`);

    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        yield* repo.create("Active todo", "user-2");
        const t2 = yield* repo.create("Completed todo", "user-2");
        yield* repo.toggle(t2.id, "user-2");

        const active = yield* repo.list({ completed: "false" });
        const completed = yield* repo.list({ completed: "true" });
        return { active, completed };
      }),
    );

    expect(result.active.some((t) => t.title === "Active todo")).toBe(true);
    expect(result.active.some((t) => t.title === "Completed todo")).toBe(false);
    expect(result.completed.some((t) => t.title === "Completed todo")).toBe(true);
  });

  it("filters by dueDate presence", async () => {
    await pool.query(`DELETE FROM todos`);

    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        yield* repo.create("No due date", "user-3");
        yield* repo.create("Has due date", "user-3", new Date("2026-12-01"));

        const noDates = yield* repo.list({ dueDate: "no-date" });
        const hasDates = yield* repo.list({ dueDate: "has-date" });
        return { noDates, hasDates };
      }),
    );

    expect(result.noDates.every((t) => t.dueDate === null)).toBe(true);
    expect(result.hasDates.every((t) => t.dueDate !== null)).toBe(true);
  });

  it("searches by title", async () => {
    await pool.query(`DELETE FROM todos`);

    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        yield* repo.create("Buy groceries", "user-4");
        yield* repo.create("Read a book", "user-4");
        yield* repo.create("Buy milk", "user-4");

        return yield* repo.list({ search: "buy" });
      }),
    );

    expect(result).toHaveLength(2);
    expect(result.every((t) => t.title.toLowerCase().includes("buy"))).toBe(true);
  });

  it("sorts by title ascending", async () => {
    await pool.query(`DELETE FROM todos`);

    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        yield* repo.create("Charlie", "user-5");
        yield* repo.create("Alpha", "user-5");
        yield* repo.create("Bravo", "user-5");

        return yield* repo.list({ sortField: "title", sortOrder: "asc" });
      }),
    );

    expect(result.map((t) => t.title)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });
});
```

- [ ] **Step 2: Ensure Docker Postgres is running and push schema**

Run: `docker compose up -d && cd apps/backend && npx drizzle-kit push`

Expected: Schema pushed to Postgres.

- [ ] **Step 3: Run the tests**

Run: `cd apps/backend && pnpm test`

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/__tests__/todos.service.test.ts
git commit -m "test: update service tests for Postgres with filter/sort coverage"
```

---

### Task 7: Update Seeders for Postgres

**Files:**
- Modify: `testing/package.json`
- Modify: `testing/seeders/db.ts`
- Modify: `testing/seeders/factories/todos.ts`
- Modify: `testing/seeders/scenarios/basics.ts`

- [ ] **Step 1: Update `testing/package.json`**

Replace `better-sqlite3` with `pg`:

```json
{
  "name": "@repo/testing",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@repo/shared": "workspace:*",
    "better-auth": "latest",
    "drizzle-orm": "latest",
    "nanoid": "latest",
    "pg": "latest"
  },
  "devDependencies": {
    "@types/node": "latest",
    "@types/pg": "latest"
  }
}
```

- [ ] **Step 2: Run `pnpm install`**

Run: `pnpm install`

- [ ] **Step 3: Rewrite `testing/seeders/db.ts`**

```ts
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as appSchema from "../../apps/backend/src/todos.table";
import * as authSchema from "../../apps/backend/src/auth.table";

const CONNECTION_STRING = "postgresql://postgres:postgres@localhost:5434/effect_orpc";

export function connectDb(connectionString = CONNECTION_STRING) {
  const pool = new pg.Pool({ connectionString });
  return drizzle(pool, { schema: { ...appSchema, ...authSchema } });
}

export type SeedDb = ReturnType<typeof connectDb>;
export { appSchema, authSchema };
```

- [ ] **Step 4: Update `testing/seeders/factories/todos.ts`**

Add `dueDate` support. The factory now uses async because Postgres drizzle is promise-based:

```ts
import { nanoid } from "nanoid";
import type { I_Todo } from "@repo/shared/todos";
import { ST_Todo } from "@repo/shared/todos.stub";
import type { SeedDb } from "../db";
import { appSchema } from "../db";

/** Overrides accepted by ST_Todo.one(), plus required userId for DB insertion. */
type TodoStubOverrides = Parameters<typeof ST_Todo.one>[0];
type TodoSeedOpts = { userId: string; dueDate?: Date | null } & TodoStubOverrides;

export async function F_createTodo(db: SeedDb, opts: TodoSeedOpts): Promise<I_Todo> {
  const { userId, dueDate, ...overrides } = opts;
  const stub = ST_Todo.one({ id: nanoid(), dueDate: dueDate ?? null, ...overrides });

  await db
    .insert(appSchema.T_todos)
    .values({
      id: stub.id,
      title: stub.title,
      completed: stub.completed,
      userId,
      createdAt: stub.createdAt,
      dueDate: stub.dueDate,
    });

  return stub;
}
```

- [ ] **Step 5: Update `testing/seeders/scenarios/basics.ts`**

Add varied `dueDate` values, update to use async factory:

```ts
import { eq } from "drizzle-orm";
import type { I_Todo } from "@repo/shared/todos";
import type { SeedDb } from "../db";
import { appSchema, authSchema } from "../db";
import { F_createUser, type UserSeedOutput } from "../factories/users";
import { F_createTodo } from "../factories/todos";

const TODOS: { title: string; completed: boolean; dueDate: Date | null }[] = [
  { title: "Buy groceries", completed: true, dueDate: new Date("2026-05-10") },
  { title: "Read Effect documentation", completed: false, dueDate: null },
  { title: "Set up CI pipeline", completed: true, dueDate: new Date("2026-04-01") },
  { title: "Write integration tests", completed: false, dueDate: new Date("2026-06-15") },
  { title: "Review pull request", completed: false, dueDate: null },
  { title: "Update dependencies", completed: true, dueDate: new Date("2026-03-20") },
  { title: "Fix login redirect bug", completed: false, dueDate: new Date("2026-05-01") },
  { title: "Deploy to staging", completed: false, dueDate: null },
  { title: "Write API documentation", completed: true, dueDate: new Date("2026-07-01") },
  { title: "Plan sprint retrospective", completed: false, dueDate: new Date("2026-05-05") },
];

export interface BasicsOutput {
  user: UserSeedOutput;
  todos: I_Todo[];
}

export async function up(db: SeedDb): Promise<BasicsOutput> {
  const user = await F_createUser(db, {
    email: "seed@test.com",
    name: "Seed User",
    password: "password123",
  });

  const todos = await Promise.all(
    TODOS.map((t) => F_createTodo(db, { userId: user.id, ...t })),
  );

  return { user, todos };
}

export async function down(db: SeedDb, output: BasicsOutput): Promise<void> {
  for (const todo of output.todos) {
    await db.delete(appSchema.T_todos).where(eq(appSchema.T_todos.id, todo.id));
  }

  await db.delete(authSchema.user).where(eq(authSchema.user.id, output.user.id));
}
```

- [ ] **Step 6: Update `testing/seeders/factories/users.ts`**

The user factory also needs to be async for Postgres:

```ts
import { nanoid } from "nanoid";
import { hashPassword } from "better-auth/crypto";
import type { SeedDb } from "../db";
import { authSchema } from "../db";

export interface UserSeedOpts {
  email?: string;
  name?: string;
  password?: string;
}

export interface UserSeedOutput {
  id: string;
  email: string;
  name: string;
}

export async function F_createUser(db: SeedDb, opts: UserSeedOpts = {}): Promise<UserSeedOutput> {
  const id = nanoid();
  const email = opts.email ?? `seed-${id}@test.com`;
  const name = opts.name ?? "Seed User";
  const password = opts.password ?? "password123";

  const now = new Date();
  const hash = await hashPassword(password);

  await db
    .insert(authSchema.user)
    .values({ id, email, name, emailVerified: false, createdAt: now, updatedAt: now });

  await db
    .insert(authSchema.account)
    .values({
      id: nanoid(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: hash,
      createdAt: now,
      updatedAt: now,
    });

  return { id, email, name };
}
```

- [ ] **Step 7: Verify types compile**

Run: `cd testing && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add testing/package.json testing/seeders/db.ts testing/seeders/factories/todos.ts testing/seeders/factories/users.ts testing/seeders/scenarios/basics.ts pnpm-lock.yaml
git commit -m "feat: migrate seeders from SQLite to Postgres with dueDate support"
```

---

### Task 8: Frontend — Install shadcn Table + Add Filter Components

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/components/C_FilterText.tsx`
- Create: `apps/web/src/components/C_FilterSelect.tsx`
- Create: `apps/web/src/components/C_FilterDateRange.tsx`

- [ ] **Step 1: Install `@tanstack/react-table`**

Run: `cd apps/web && pnpm add @tanstack/react-table`

- [ ] **Step 2: Add shadcn table component**

Run: `cd apps/web && npx shadcn@latest add table select`

This installs `apps/web/src/components/ui/table.tsx` and `apps/web/src/components/ui/select.tsx`.

- [ ] **Step 3: Create `apps/web/src/components/C_FilterText.tsx`**

```tsx
import { useEffect, useState } from "react";
import { Input } from "~/components/ui/input";

interface FilterTextProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
}

export function C_FilterText({ value, onChange, placeholder = "Search..." }: FilterTextProps) {
  const [local, setLocal] = useState(value ?? "");

  useEffect(() => {
    setLocal(value ?? "");
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = local.trim();
      onChange(trimmed.length > 0 ? trimmed : undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [local, onChange]);

  return (
    <Input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      placeholder={placeholder}
      className="h-8 w-40"
    />
  );
}
```

- [ ] **Step 4: Create `apps/web/src/components/C_FilterSelect.tsx`**

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface FilterSelectProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: readonly string[];
  placeholder?: string;
  labels?: Record<string, string>;
}

export function C_FilterSelect({
  value,
  onChange,
  options,
  placeholder = "All",
  labels,
}: FilterSelectProps) {
  return (
    <Select
      value={value ?? "all"}
      onValueChange={(v) => onChange(v === "all" ? undefined : v)}
    >
      <SelectTrigger className="h-8 w-32">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {labels?.[opt] ?? opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 5: Create `apps/web/src/components/C_FilterDateRange.tsx`**

```tsx
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

interface FilterDateRangeProps {
  dateFrom: string | undefined;
  dateTo: string | undefined;
  onDateFromChange: (value: string | undefined) => void;
  onDateToChange: (value: string | undefined) => void;
}

export function C_FilterDateRange({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: FilterDateRangeProps) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground">From</Label>
      <Input
        type="date"
        value={dateFrom ?? ""}
        onChange={(e) => onDateFromChange(e.target.value || undefined)}
        className="h-8 w-36"
      />
      <Label className="text-xs text-muted-foreground">To</Label>
      <Input
        type="date"
        value={dateTo ?? ""}
        onChange={(e) => onDateToChange(e.target.value || undefined)}
        className="h-8 w-36"
      />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/src/components/C_FilterText.tsx apps/web/src/components/C_FilterSelect.tsx apps/web/src/components/C_FilterDateRange.tsx apps/web/src/components/ui/table.tsx apps/web/src/components/ui/select.tsx pnpm-lock.yaml
git commit -m "feat: add filter components and install TanStack Table + shadcn table/select"
```

---

### Task 9: Frontend — DataTable Component + Route Integration

**Files:**
- Create: `apps/web/src/components/C_DataTable.tsx`
- Modify: `apps/web/src/routes/_authed/todos.tsx`
- Modify: `apps/web/src/lib/queries/todos.ts`

- [ ] **Step 1: Create `apps/web/src/components/C_DataTable.tsx`**

```tsx
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "~/lib/utils";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  sortField?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (field: string) => void;
}

export function C_DataTable<TData>({
  columns,
  data,
  sortField,
  sortOrder,
  onSort,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.columnDef.meta?.sortable;
                const fieldId = header.column.id;
                const isActive = sortField === fieldId;

                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : canSort && onSort ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => onSort(fieldId)}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {isActive ? (
                          sortOrder === "asc" ? (
                            <ArrowUp className="ml-1 size-3" />
                          ) : (
                            <ArrowDown className="ml-1 size-3" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-1 size-3 opacity-50" />
                        )}
                      </Button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Extend TanStack Table's ColumnMeta to include sortable flag
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    sortable?: boolean;
  }
}
```

- [ ] **Step 2: Update `apps/web/src/lib/queries/todos.ts`**

No structural changes needed — `QO_todosList` already accepts `IIn_D_listTodos`. Just verify the existing code works with the expanded schema. The file should remain:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { IIn_D_listTodos } from "@repo/shared/todos";
import { orpc } from "~/lib/orpc";

// ── Query Options ──

export const QO_todosList = (input: IIn_D_listTodos = {}) =>
  orpc.todos.list.queryOptions({ input });

// ── Mutation Hooks ──

export function useCreateTodo() {
  const qc = useQueryClient();
  return useMutation({
    ...orpc.todos.create.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: orpc.todos.key() }),
  });
}

export function useToggleTodo() {
  const qc = useQueryClient();
  return useMutation({
    ...orpc.todos.toggle.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: orpc.todos.key() }),
  });
}

export function useDeleteTodo() {
  const qc = useQueryClient();
  return useMutation({
    ...orpc.todos.delete.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: orpc.todos.key() }),
  });
}
```

- [ ] **Step 3: Rewrite `apps/web/src/routes/_authed/todos.tsx`**

Replace the todo list with DataTable and filter controls. Use `validateSearch` for URL-driven state:

```tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { zodValidator } from "@tanstack/zod-adapter";
import type { I_Todo, IIn_D_listTodos } from "@repo/shared/todos";
import {
  SIn_D_listTodos,
  S_completedFilter,
  S_dueDateFilter,
} from "@repo/shared/todos";
import { C_TodoForm } from "~/components/C_TodoForm";
import { C_DataTable } from "~/components/C_DataTable";
import { C_FilterText } from "~/components/C_FilterText";
import { C_FilterSelect } from "~/components/C_FilterSelect";
import { C_FilterDateRange } from "~/components/C_FilterDateRange";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { LogOut } from "lucide-react";
import { QO_todosList } from "~/lib/queries/todos";
import { useToggleTodo, useDeleteTodo } from "~/lib/queries/todos";

export const Route = createFileRoute("/_authed/todos")({
  validateSearch: zodValidator(SIn_D_listTodos),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(QO_todosList(deps)),
  component: C_PageTodos,
});

const completedLabels: Record<string, string> = {
  all: "All",
  true: "Completed",
  false: "Active",
};

const dueDateLabels: Record<string, string> = {
  all: "All",
  "has-date": "Has date",
  "no-date": "No date",
  overdue: "Overdue",
};

const columns: ColumnDef<I_Todo, unknown>[] = [
  {
    id: "completed",
    accessorKey: "completed",
    header: "Done",
    meta: { sortable: true },
    cell: ({ row }) => {
      const todo = row.original;
      return <TodoCheckbox todo={todo} />;
    },
  },
  {
    id: "title",
    accessorKey: "title",
    header: "Title",
    meta: { sortable: true },
  },
  {
    id: "dueDate",
    accessorKey: "dueDate",
    header: "Due Date",
    meta: { sortable: true },
    cell: ({ getValue }) => {
      const date = getValue() as Date | null;
      return date ? new Date(date).toLocaleDateString() : <span className="text-muted-foreground">-</span>;
    },
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Created",
    meta: { sortable: true },
    cell: ({ getValue }) => new Date(getValue() as Date).toLocaleDateString(),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <TodoDeleteButton todoId={row.original.id} />,
  },
];

function TodoCheckbox({ todo }: { todo: I_Todo }) {
  const toggleMutation = useToggleTodo();
  return (
    <Checkbox
      checked={todo.completed}
      onCheckedChange={() => toggleMutation.mutate({ input: { id: todo.id } })}
    />
  );
}

function TodoDeleteButton({ todoId }: { todoId: string }) {
  const deleteMutation = useDeleteTodo();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive"
      onClick={() => deleteMutation.mutate({ input: { id: todoId } })}
    >
      Delete
    </Button>
  );
}

function C_PageTodos() {
  const { session } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data } = useSuspenseQuery(QO_todosList(search));

  const updateSearch = useCallback(
    (updates: Partial<IIn_D_listTodos>) => {
      navigate({ search: (prev) => ({ ...prev, ...updates }) });
    },
    [navigate],
  );

  const handleSort = useCallback(
    (field: string) => {
      const isSameField = search.sortField === field;
      const nextOrder = isSameField && search.sortOrder === "asc" ? "desc" : "asc";
      updateSearch({ sortField: field as IIn_D_listTodos["sortField"], sortOrder: nextOrder });
    },
    [search.sortField, search.sortOrder, updateSearch],
  );

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <h1 className="text-lg font-semibold">Todos</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{session.user.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="size-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <C_TodoForm />
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <C_FilterText
            value={search.search}
            onChange={(v) => updateSearch({ search: v })}
            placeholder="Search todos..."
          />
          <C_FilterSelect
            value={search.completed}
            onChange={(v) => updateSearch({ completed: v as IIn_D_listTodos["completed"] })}
            options={S_completedFilter.options}
            labels={completedLabels}
            placeholder="Status"
          />
          <C_FilterSelect
            value={search.dueDate}
            onChange={(v) => updateSearch({ dueDate: v as IIn_D_listTodos["dueDate"] })}
            options={S_dueDateFilter.options}
            labels={dueDateLabels}
            placeholder="Due Date"
          />
          <C_FilterDateRange
            dateFrom={search.dateFrom?.toISOString().split("T")[0]}
            dateTo={search.dateTo?.toISOString().split("T")[0]}
            onDateFromChange={(v) => updateSearch({ dateFrom: v ? new Date(v) : undefined })}
            onDateToChange={(v) => updateSearch({ dateTo: v ? new Date(v) : undefined })}
          />
        </div>
        <div className="mt-4">
          <C_DataTable
            columns={columns}
            data={data.todos}
            sortField={search.sortField}
            sortOrder={search.sortOrder}
            onSort={handleSort}
          />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Check if `@tanstack/zod-adapter` is installed**

Run: `cd apps/web && pnpm add @tanstack/zod-adapter`

- [ ] **Step 5: Verify types compile**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -30`

Expected: PASS (or minor fixable issues).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/C_DataTable.tsx apps/web/src/routes/_authed/todos.tsx apps/web/src/lib/queries/todos.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat: add DataTable with URL-driven filter/sort controls"
```

---

### Task 10: Push Schema + End-to-End Verification

**Files:** None (verification only)

- [ ] **Step 1: Ensure Postgres is running**

Run: `docker compose up -d`

- [ ] **Step 2: Push schema to Postgres**

Run: `cd apps/backend && npx drizzle-kit push`

Expected: Tables created/updated in Postgres.

- [ ] **Step 3: Run backend tests**

Run: `cd apps/backend && pnpm test`

Expected: All tests pass.

- [ ] **Step 4: Run full typecheck**

Run: `pnpm typecheck`

Expected: All packages typecheck clean.

- [ ] **Step 5: Start dev servers and verify manually**

Run: `pnpm dev`

Verify:
- Backend starts on :3001
- Frontend starts on :3000
- Todo page loads with DataTable
- Filters appear and update URL params
- Sorting works (click column headers)
- Search debounces and filters
- Creating/toggling/deleting todos still works

- [ ] **Step 6: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore: final verification and cleanup for declarative filters"
```
