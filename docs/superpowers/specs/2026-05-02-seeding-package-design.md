# Seeding Package Design

## Goal

Replace the `testing/` folder with `packages/seeding/` (`@repo/seeding`) — a shared seeding library that uses Effect + the backend's `Svc_Database` layer. Consumed by automated tests and a future dev-tools app.

## Architecture

### Package Structure

```
packages/seeding/
  src/
    users.factory.ts        — F_createUser
    todos.factory.ts        — F_createTodo
    basics.scenario.ts      — basic dev data (1 user, 10 todos)
    filterable.scenario.ts  — filter testing data (1 user, 40 todos)
    teardown.ts             — truncate helper
    cli.ts                  — thin CLI runner
  package.json
  tsconfig.json
```

Flat files with role suffixes, matching the backend convention (`*.service.ts`, `*.filter.ts`, `*.routes.ts`).

### File Suffixes

| Suffix          | Purpose                                      |
| --------------- | -------------------------------------------- |
| `*.factory.ts`  | Single-record creators (Effect programs)     |
| `*.scenario.ts` | Compose factories into test/dev states       |

### Dependencies

- `@repo/backend` — `Svc_Database`, `L_Database`, table schemas (`T_todos`, auth tables)
- `@repo/shared` — types (`I_Todo`), stubs (`ST_Todo`)

## Factories

Effect programs that yield `Svc_Database` and return created records.

```ts
// todos.factory.ts
import { Effect } from "effect";
import { nanoid } from "nanoid";
import { Svc_Database } from "@repo/backend/db.service";
import { T_todos } from "@repo/backend/todos.table";
import type { I_Todo } from "@repo/shared/todos";
import { ST_Todo } from "@repo/shared/todos.stub";

type TodoSeedOpts = Parameters<typeof ST_Todo.one>[0] & { userId: string };

export const F_createTodo = (opts: TodoSeedOpts): Effect.Effect<I_Todo, never, Svc_Database> =>
  Effect.gen(function* () {
    const db = yield* Svc_Database;
    const stub = ST_Todo.one({ id: nanoid(), ...opts });

    yield* Effect.promise(() =>
      db.insert(T_todos).values({
        id: stub.id,
        title: stub.title,
        completed: stub.completed,
        userId: opts.userId,
        createdAt: stub.createdAt,
        dueDate: stub.dueDate,
      }),
    );

    return stub;
  });
```

```ts
// users.factory.ts
import { Effect } from "effect";
import { nanoid } from "nanoid";
import { hashPassword } from "better-auth/crypto";
import { Svc_Database } from "@repo/backend/db.service";
import * as authSchema from "@repo/backend/auth.table";

interface UserSeedOpts {
  email?: string;
  name?: string;
  password?: string;
}

interface UserSeedOutput {
  id: string;
  email: string;
  name: string;
}

export const F_createUser = (opts: UserSeedOpts = {}): Effect.Effect<UserSeedOutput, never, Svc_Database> =>
  Effect.gen(function* () {
    const db = yield* Svc_Database;
    const id = nanoid();
    const email = opts.email ?? `seed-${id}@test.com`;
    const name = opts.name ?? "Seed User";
    const password = opts.password ?? "password123";
    const now = new Date();
    const hash = yield* Effect.promise(() => hashPassword(password));

    yield* Effect.promise(() =>
      db.insert(authSchema.user).values({ id, email, name, emailVerified: false, createdAt: now, updatedAt: now }),
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

Key decisions:
- `F_createTodo` opts type is `Parameters<typeof ST_Todo.one>[0] & { userId: string }` — derived from the stub, not hand-written
- `F_createUser` keeps a manual interface since there's no user stub builder (auth is external)
- DB comes from Effect DI (`yield* Svc_Database`), not a function parameter
- No error channel — seed failures should crash (`Effect.promise` instead of `Effect.tryPromise`)

## Scenarios

Compose factories into meaningful database states. Each scenario exports `up` and `down`.

```ts
// basics.scenario.ts
import { Effect } from "effect";
import type { I_Todo } from "@repo/shared/todos";
import type { Svc_Database } from "@repo/backend/db.service";
import { F_createUser, type UserSeedOutput } from "./users.factory";
import { F_createTodo } from "./todos.factory";

export interface BasicsOutput {
  user: UserSeedOutput;
  todos: I_Todo[];
}

const TODOS = [
  { title: "Buy groceries", completed: true, dueDate: new Date("2026-05-10") },
  // ... remaining items
] as const;

export const up: Effect.Effect<BasicsOutput, never, Svc_Database> =
  Effect.gen(function* () {
    const user = yield* F_createUser({ email: "seed@test.com", name: "Seed User", password: "password123" });
    const todos = yield* Effect.all(
      TODOS.map((t) => F_createTodo({ userId: user.id, ...t })),
    );
    return { user, todos };
  });

export const down: Effect.Effect<void, never, Svc_Database> =
  Effect.gen(function* () {
    yield* truncateAll;
  });
```

`filterable.scenario.ts` follows the same pattern with 40 todos covering all filter combinations.

## Teardown

Two strategies depending on the consumer:

### Tests: Truncate Between Tests

Tests call `truncateAll` in `afterEach` or `afterAll` to clean up. This is simpler than transaction rollback (Drizzle doesn't expose `tx.rollback()` directly) and good enough for a local test database. If performance becomes an issue with many tests, we can revisit with a Postgres savepoint approach later.

### CLI: Truncate

The `down` function for CLI usage truncates relevant tables:

```ts
// teardown.ts
import { Effect } from "effect";
import { sql } from "drizzle-orm";
import { Svc_Database } from "@repo/backend/db.service";

export const truncateAll: Effect.Effect<void, never, Svc_Database> =
  Effect.gen(function* () {
    const db = yield* Svc_Database;
    yield* Effect.promise(() => db.execute(sql`TRUNCATE todos, account, "user", session, verification CASCADE`));
  });
```

This eliminates the `.output/` JSON persistence — no need to track individual IDs.

## CLI Runner

Thin entry point that wires up `L_Database` and runs scenarios:

```ts
// cli.ts
import { Effect } from "effect";
import { L_Database } from "@repo/backend/db.service";

const CONNECTION_STRING = "postgresql://postgres:postgres@localhost:5434/effect_orpc";

async function main() {
  const [scenario, direction] = process.argv.slice(2);
  // validate args, dynamic import scenario, run with Effect.runPromise
  // provide L_Database(CONNECTION_STRING) layer
}
```

Usage stays the same: `pnpm seed basics up`, `pnpm seed basics down`.

## What Gets Deleted

The entire `testing/` folder is removed:
- `testing/seeders/db.ts` — replaced by `Svc_Database` from `@repo/backend`
- `testing/seeders/run.ts` — replaced by `cli.ts`
- `testing/seeders/factories/` — replaced by `*.factory.ts`
- `testing/seeders/scenarios/` — replaced by `*.scenario.ts`
- `testing/seeders/.output/` — eliminated (truncate replaces ID-based cleanup)
- `testing/seeders/README.md` — rewrite for new structure
- `testing/package.json`, `testing/tsconfig.json` — replaced by `packages/seeding/` equivalents

## Backend Exports

`@repo/backend` needs to export `Svc_Database`, `L_Database`, and table schemas so `@repo/seeding` can import them. Add export entries to `apps/backend/package.json`:

```json
"exports": {
  "./db.service": "./src/db.service.ts",
  "./todos.table": "./src/todos.table.ts",
  "./auth.table": "./src/auth.table.ts"
}
```

## Existing Backend Tests

`apps/backend/src/__tests__/todos.service.test.ts` already creates its own pool + Drizzle instance and builds a test runtime with `L_TodosRepo` + `L_TestDatabase`. This test stays as-is — it tests the service layer directly and doesn't need the seeding package. The seeding package is for populating realistic data, not for unit-testing services.
