# Seeding Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `testing/` with `packages/seeding/` — an Effect-based seeding library using the backend's `Svc_Database` layer.

**Architecture:** Factories are Effect programs that `yield* Svc_Database` to get a Drizzle instance. Scenarios compose factories with `Effect.all`. Teardown truncates tables. A thin CLI runner wires up `L_Database` and runs scenarios via `Effect.runPromise`.

**Tech Stack:** Effect-TS, Drizzle ORM (Postgres), better-auth (password hashing), vitest

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `packages/seeding/package.json` | Create | Package manifest with deps |
| `packages/seeding/tsconfig.json` | Create | TypeScript config |
| `packages/seeding/src/users.factory.ts` | Create | `F_createUser` Effect program |
| `packages/seeding/src/todos.factory.ts` | Create | `F_createTodo` Effect program |
| `packages/seeding/src/teardown.ts` | Create | `truncateAll` Effect program |
| `packages/seeding/src/basics.scenario.ts` | Create | Basic dev data scenario |
| `packages/seeding/src/filterable.scenario.ts` | Create | 40-todo filter testing scenario |
| `packages/seeding/src/cli.ts` | Create | CLI runner |
| `apps/backend/package.json` | Modify | Add export entries for `db.service`, `todos.table`, `auth.table` |
| `pnpm-workspace.yaml` | Modify | Remove `testing` workspace entry |
| `package.json` (root) | Modify | Update `seed` script path |
| `testing/` | Delete | Entire folder removed |

---

### Task 1: Backend Exports

Add export entries to `@repo/backend` so `@repo/seeding` can import `Svc_Database`, `L_Database`, and table schemas.

**Files:**
- Modify: `apps/backend/package.json:6-8`

- [ ] **Step 1: Add export entries to backend package.json**

Open `apps/backend/package.json` and replace the `exports` field:

```json
"exports": {
  "./router": "./src/router.ts",
  "./db.service": "./src/db.service.ts",
  "./todos.table": "./src/todos.table.ts",
  "./auth.table": "./src/auth.table.ts"
},
```

- [ ] **Step 2: Verify the exports resolve**

Run: `pnpm typecheck`
Expected: All packages pass (5/5). The new exports don't break anything — they just make existing files importable.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/package.json
git commit -m "feat: add backend export entries for db.service and table schemas"
```

---

### Task 2: Scaffold `packages/seeding`

Create the package skeleton with `package.json` and `tsconfig.json`.

**Files:**
- Create: `packages/seeding/package.json`
- Create: `packages/seeding/tsconfig.json`
- Modify: `pnpm-workspace.yaml:4` (remove `testing`)

- [ ] **Step 1: Create `packages/seeding/package.json`**

```json
{
  "name": "@repo/seeding",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./users.factory": "./src/users.factory.ts",
    "./todos.factory": "./src/todos.factory.ts",
    "./basics.scenario": "./src/basics.scenario.ts",
    "./filterable.scenario": "./src/filterable.scenario.ts",
    "./teardown": "./src/teardown.ts"
  },
  "scripts": {
    "seed": "tsx src/cli.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@repo/backend": "workspace:*",
    "@repo/shared": "workspace:*",
    "better-auth": "latest",
    "drizzle-orm": "latest",
    "effect": "latest",
    "nanoid": "latest",
    "pg": "latest"
  },
  "devDependencies": {
    "@types/pg": "latest",
    "tsx": "latest"
  }
}
```

- [ ] **Step 2: Create `packages/seeding/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": false,
    "declarationMap": false
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Remove `testing` from `pnpm-workspace.yaml`**

Update `pnpm-workspace.yaml` to:

```yaml
packages:
  - "apps/*"
  - "packages/*"

onlyBuiltDependencies:
  - esbuild
```

The `packages/*` glob already covers `packages/seeding/`.

- [ ] **Step 4: Install dependencies**

Run: `pnpm install`
Expected: Lockfile updates. `@repo/seeding` appears in the workspace.

- [ ] **Step 5: Commit**

```bash
git add packages/seeding/package.json packages/seeding/tsconfig.json pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "feat: scaffold @repo/seeding package"
```

---

### Task 3: `teardown.ts` — Truncate Helper

Create the truncate helper first since scenarios depend on it for `down`.

**Files:**
- Create: `packages/seeding/src/teardown.ts`

- [ ] **Step 1: Create `packages/seeding/src/teardown.ts`**

```ts
import { Effect } from "effect";
import { sql } from "drizzle-orm";
import { Svc_Database } from "@repo/backend/db.service";

export const truncateAll: Effect.Effect<void, never, Svc_Database> = Effect.gen(function* () {
  const db = yield* Svc_Database;
  yield* Effect.promise(() =>
    db.execute(sql`TRUNCATE todos, account, "user", session, verification CASCADE`),
  );
});
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm -F @repo/seeding typecheck`
Expected: Pass (0 errors).

- [ ] **Step 3: Commit**

```bash
git add packages/seeding/src/teardown.ts
git commit -m "feat: add truncateAll teardown helper"
```

---

### Task 4: `users.factory.ts` — `F_createUser`

**Files:**
- Create: `packages/seeding/src/users.factory.ts`

- [ ] **Step 1: Create `packages/seeding/src/users.factory.ts`**

```ts
import { Effect } from "effect";
import { nanoid } from "nanoid";
import { hashPassword } from "better-auth/crypto";
import { Svc_Database } from "@repo/backend/db.service";
import * as authSchema from "@repo/backend/auth.table";

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

export const F_createUser = (
  opts: UserSeedOpts = {},
): Effect.Effect<UserSeedOutput, never, Svc_Database> =>
  Effect.gen(function* () {
    const db = yield* Svc_Database;
    const id = nanoid();
    const email = opts.email ?? `seed-${id}@test.com`;
    const name = opts.name ?? "Seed User";
    const password = opts.password ?? "password123";
    const now = new Date();
    const hash = yield* Effect.promise(() => hashPassword(password));

    yield* Effect.promise(() =>
      db
        .insert(authSchema.user)
        .values({ id, email, name, emailVerified: false, createdAt: now, updatedAt: now }),
    );

    yield* Effect.promise(() =>
      db.insert(authSchema.account).values({
        id: nanoid(),
        accountId: id,
        providerId: "credential",
        userId: id,
        password: hash,
        createdAt: now,
        updatedAt: now,
      }),
    );

    return { id, email, name };
  });
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm -F @repo/seeding typecheck`
Expected: Pass (0 errors).

- [ ] **Step 3: Commit**

```bash
git add packages/seeding/src/users.factory.ts
git commit -m "feat: add F_createUser factory"
```

---

### Task 5: `todos.factory.ts` — `F_createTodo`

**Files:**
- Create: `packages/seeding/src/todos.factory.ts`

- [ ] **Step 1: Create `packages/seeding/src/todos.factory.ts`**

```ts
import { Effect } from "effect";
import { nanoid } from "nanoid";
import { Svc_Database } from "@repo/backend/db.service";
import { T_todos } from "@repo/backend/todos.table";
import type { I_Todo } from "@repo/shared/todos";
import { ST_Todo } from "@repo/shared/todos.stub";

type TodoSeedOpts = Parameters<typeof ST_Todo.one>[0] & { userId: string };

export type { TodoSeedOpts };

export const F_createTodo = (opts: TodoSeedOpts): Effect.Effect<I_Todo, never, Svc_Database> =>
  Effect.gen(function* () {
    const db = yield* Svc_Database;
    const { userId, ...overrides } = opts;
    const stub = ST_Todo.one({ id: nanoid(), ...overrides });

    yield* Effect.promise(() =>
      db.insert(T_todos).values({
        id: stub.id,
        title: stub.title,
        completed: stub.completed,
        userId,
        createdAt: stub.createdAt,
        dueDate: stub.dueDate,
      }),
    );

    return stub;
  });
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm -F @repo/seeding typecheck`
Expected: Pass (0 errors).

- [ ] **Step 3: Commit**

```bash
git add packages/seeding/src/todos.factory.ts
git commit -m "feat: add F_createTodo factory"
```

---

### Task 6: `basics.scenario.ts`

**Files:**
- Create: `packages/seeding/src/basics.scenario.ts`

- [ ] **Step 1: Create `packages/seeding/src/basics.scenario.ts`**

```ts
import { Effect } from "effect";
import type { I_Todo } from "@repo/shared/todos";
import { Svc_Database } from "@repo/backend/db.service";
import { F_createUser, type UserSeedOutput } from "./users.factory";
import { F_createTodo } from "./todos.factory";
import { truncateAll } from "./teardown";

export interface BasicsOutput {
  user: UserSeedOutput;
  todos: I_Todo[];
}

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

export const up: Effect.Effect<BasicsOutput, never, Svc_Database> = Effect.gen(function* () {
  const user = yield* F_createUser({
    email: "seed@test.com",
    name: "Seed User",
    password: "password123",
  });

  const todos = yield* Effect.all(
    TODOS.map((t) => F_createTodo({ userId: user.id, ...t })),
  );

  return { user, todos };
});

export const down: Effect.Effect<void, never, Svc_Database> = truncateAll;
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm -F @repo/seeding typecheck`
Expected: Pass (0 errors).

- [ ] **Step 3: Commit**

```bash
git add packages/seeding/src/basics.scenario.ts
git commit -m "feat: add basics scenario"
```

---

### Task 7: `filterable.scenario.ts`

**Files:**
- Create: `packages/seeding/src/filterable.scenario.ts`

- [ ] **Step 1: Create `packages/seeding/src/filterable.scenario.ts`**

```ts
import { Effect } from "effect";
import type { I_Todo } from "@repo/shared/todos";
import { Svc_Database } from "@repo/backend/db.service";
import { F_createUser, type UserSeedOutput } from "./users.factory";
import { F_createTodo } from "./todos.factory";
import { truncateAll } from "./teardown";

export interface FilterableOutput {
  user: UserSeedOutput;
  todos: I_Todo[];
}

const TODOS: { title: string; completed: boolean; dueDate: Date | null; createdAt?: Date }[] = [
  // Completed + has due date (past — not overdue since completed)
  { title: "Set up project scaffolding", completed: true, dueDate: new Date("2026-01-15"), createdAt: new Date("2026-01-02") },
  { title: "Configure CI/CD pipeline", completed: true, dueDate: new Date("2026-01-20"), createdAt: new Date("2026-01-05") },
  { title: "Write unit tests for auth", completed: true, dueDate: new Date("2026-02-01"), createdAt: new Date("2026-01-10") },
  { title: "Design database schema", completed: true, dueDate: new Date("2026-02-10"), createdAt: new Date("2026-01-12") },
  { title: "Implement user registration", completed: true, dueDate: new Date("2026-02-15"), createdAt: new Date("2026-01-20") },
  { title: "Add password reset flow", completed: true, dueDate: new Date("2026-02-28"), createdAt: new Date("2026-02-01") },
  { title: "Create seed data script", completed: true, dueDate: new Date("2026-03-01"), createdAt: new Date("2026-02-10") },
  { title: "Set up error monitoring", completed: true, dueDate: new Date("2026-03-10"), createdAt: new Date("2026-02-15") },

  // Completed + no due date
  { title: "Research Effect-TS patterns", completed: true, dueDate: null, createdAt: new Date("2026-01-03") },
  { title: "Evaluate UI component libraries", completed: true, dueDate: null, createdAt: new Date("2026-01-08") },
  { title: "Set up linting rules", completed: true, dueDate: null, createdAt: new Date("2026-02-05") },
  { title: "Document API conventions", completed: true, dueDate: null, createdAt: new Date("2026-02-20") },

  // Active + overdue (due date in the past)
  { title: "Fix flaky integration test", completed: false, dueDate: new Date("2026-03-15"), createdAt: new Date("2026-03-01") },
  { title: "Migrate legacy endpoints", completed: false, dueDate: new Date("2026-03-20"), createdAt: new Date("2026-03-05") },
  { title: "Update onboarding docs", completed: false, dueDate: new Date("2026-04-01"), createdAt: new Date("2026-03-10") },
  { title: "Resolve security audit findings", completed: false, dueDate: new Date("2026-04-10"), createdAt: new Date("2026-03-15") },
  { title: "Refactor notification service", completed: false, dueDate: new Date("2026-04-15"), createdAt: new Date("2026-03-20") },
  { title: "Optimize database queries", completed: false, dueDate: new Date("2026-04-20"), createdAt: new Date("2026-04-01") },
  { title: "Add rate limiting middleware", completed: false, dueDate: new Date("2026-04-25"), createdAt: new Date("2026-04-05") },
  { title: "Review accessibility compliance", completed: false, dueDate: new Date("2026-04-30"), createdAt: new Date("2026-04-10") },

  // Active + future due date
  { title: "Build dashboard analytics page", completed: false, dueDate: new Date("2026-06-01"), createdAt: new Date("2026-04-15") },
  { title: "Implement WebSocket notifications", completed: false, dueDate: new Date("2026-06-15"), createdAt: new Date("2026-04-18") },
  { title: "Add export to CSV feature", completed: false, dueDate: new Date("2026-06-20"), createdAt: new Date("2026-04-20") },
  { title: "Create user settings page", completed: false, dueDate: new Date("2026-07-01"), createdAt: new Date("2026-04-22") },
  { title: "Implement dark mode toggle", completed: false, dueDate: new Date("2026-07-10"), createdAt: new Date("2026-04-25") },
  { title: "Add keyboard shortcuts", completed: false, dueDate: new Date("2026-07-15"), createdAt: new Date("2026-04-28") },
  { title: "Write end-to-end test suite", completed: false, dueDate: new Date("2026-08-01"), createdAt: new Date("2026-05-01") },
  { title: "Set up staging environment", completed: false, dueDate: new Date("2026-08-15"), createdAt: new Date("2026-05-02") },
  { title: "Plan Q3 roadmap", completed: false, dueDate: new Date("2026-09-01"), createdAt: new Date("2026-05-02") },
  { title: "Integrate payment provider", completed: false, dueDate: new Date("2026-09-15"), createdAt: new Date("2026-05-02") },

  // Active + no due date
  { title: "Explore caching strategies", completed: false, dueDate: null, createdAt: new Date("2026-03-01") },
  { title: "Investigate memory leak in worker", completed: false, dueDate: null, createdAt: new Date("2026-03-10") },
  { title: "Prototype mobile layout", completed: false, dueDate: null, createdAt: new Date("2026-03-25") },
  { title: "Benchmark API response times", completed: false, dueDate: null, createdAt: new Date("2026-04-05") },
  { title: "Spike on GraphQL federation", completed: false, dueDate: null, createdAt: new Date("2026-04-12") },
  { title: "Clean up unused dependencies", completed: false, dueDate: null, createdAt: new Date("2026-04-18") },
  { title: "Audit logging for admin actions", completed: false, dueDate: null, createdAt: new Date("2026-04-22") },
  { title: "Research serverless deployment", completed: false, dueDate: null, createdAt: new Date("2026-04-28") },
  { title: "Draft RFC for plugin system", completed: false, dueDate: null, createdAt: new Date("2026-05-01") },
  { title: "Sketch data migration plan", completed: false, dueDate: null, createdAt: new Date("2026-05-02") },
];

export const up: Effect.Effect<FilterableOutput, never, Svc_Database> = Effect.gen(function* () {
  const user = yield* F_createUser({
    email: "user@user.com",
    name: "Demo User",
    password: "password",
  });

  const todos = yield* Effect.all(
    TODOS.map((t) => F_createTodo({ userId: user.id, ...t })),
  );

  return { user, todos };
});

export const down: Effect.Effect<void, never, Svc_Database> = truncateAll;
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm -F @repo/seeding typecheck`
Expected: Pass (0 errors).

- [ ] **Step 3: Commit**

```bash
git add packages/seeding/src/filterable.scenario.ts
git commit -m "feat: add filterable scenario"
```

---

### Task 8: `cli.ts` — CLI Runner

**Files:**
- Create: `packages/seeding/src/cli.ts`
- Modify: `package.json` (root):13 — update `seed` script path

- [ ] **Step 1: Create `packages/seeding/src/cli.ts`**

```ts
import { Effect, Layer } from "effect";
import { Svc_Database, L_Database } from "@repo/backend/db.service";

const CONNECTION_STRING = "postgresql://postgres:postgres@localhost:5434/effect_orpc";

const SCENARIOS = ["basics", "filterable"] as const;
type Scenario = (typeof SCENARIOS)[number];

function printUsage(): void {
  console.log("Usage: pnpm seed <scenario> <up|down>");
  console.log("");
  console.log("Scenarios:");
  console.log("  basics      1 user (seed@test.com / password123) + 10 todos");
  console.log("  filterable  1 user (user@user.com / password) + 40 filterable todos");
  console.log("");
  console.log("Examples:");
  console.log("  pnpm seed basics up");
  console.log("  pnpm seed basics down");
}

async function main(): Promise<void> {
  const [scenario, direction] = process.argv.slice(2);

  if (!scenario || !direction || !["up", "down"].includes(direction)) {
    printUsage();
    process.exit(1);
  }

  if (!SCENARIOS.includes(scenario as Scenario)) {
    console.error(`Unknown scenario: "${scenario}"`);
    printUsage();
    process.exit(1);
  }

  const mod = await import(`./${scenario}.scenario.ts`);
  const effect = direction === "up" ? mod.up : mod.down;

  if (!effect) {
    console.error(`Scenario "${scenario}" has no ${direction}() export`);
    process.exit(1);
  }

  const layer = L_Database(CONNECTION_STRING);

  const result = await Effect.runPromise(effect.pipe(Effect.provide(layer)));

  if (direction === "up") {
    console.log(`Seeded "${scenario}" successfully.`);
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Torn down "${scenario}" successfully.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Update root `package.json` seed script**

In the root `package.json`, change the `seed` script:

```json
"seed": "tsx packages/seeding/src/cli.ts"
```

- [ ] **Step 3: Verify it typechecks**

Run: `pnpm -F @repo/seeding typecheck`
Expected: Pass (0 errors).

- [ ] **Step 4: Commit**

```bash
git add packages/seeding/src/cli.ts package.json
git commit -m "feat: add seeding CLI runner"
```

---

### Task 9: Integration Test — Verify Seeding Works

Run the CLI against the real database to verify everything wires up correctly.

**Files:** None (manual verification)

- [ ] **Step 1: Ensure Postgres is running**

Run: `docker compose up -d`
Expected: Postgres container starts on port 5434.

- [ ] **Step 2: Run `basics` scenario up**

Run: `pnpm seed basics up`
Expected: Output shows created user and 10 todos as JSON. No errors.

- [ ] **Step 3: Run `basics` scenario down**

Run: `pnpm seed basics down`
Expected: `Torn down "basics" successfully.` — tables truncated.

- [ ] **Step 4: Run `filterable` scenario up**

Run: `pnpm seed filterable up`
Expected: Output shows created user and 40 todos as JSON. No errors.

- [ ] **Step 5: Run `filterable` scenario down**

Run: `pnpm seed filterable down`
Expected: `Torn down "filterable" successfully.`

- [ ] **Step 6: Run full monorepo checks**

Run: `pnpm check`
Expected: Format, lint, and typecheck all pass (6/6 packages including new `@repo/seeding`).

- [ ] **Step 7: Commit (if any fixes were needed)**

Only commit if fixes were required. Otherwise skip.

---

### Task 10: Delete `testing/` Folder

Remove the old testing folder now that `packages/seeding/` is verified working.

**Files:**
- Delete: `testing/` (entire folder)

- [ ] **Step 1: Delete the `testing/` folder**

Run: `rm -rf testing/`

- [ ] **Step 2: Run `pnpm install`**

Run: `pnpm install`
Expected: Lockfile updates — `@repo/testing` workspace removed.

- [ ] **Step 3: Run full monorepo checks**

Run: `pnpm check`
Expected: Format, lint, and typecheck all pass. No references to `testing/` or `@repo/testing` remain.

- [ ] **Step 4: Verify seed still works**

Run: `pnpm seed basics up && pnpm seed basics down`
Expected: Seeds and tears down successfully.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove old testing/ folder, replaced by @repo/seeding"
```
