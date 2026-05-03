# Effect-oRPC Monorepo Design Spec

## Goal

Explore whether Effect-TS's typed error classification can be preserved end-to-end (backend to frontend) while using DX-focused libraries (TanStack Start, oRPC, better-auth) and maintaining separation of concerns.

The demo is a simple auth-gated SQLite todo list. The architecture is the interesting part.

## Stack

| Layer            | Tool                                                           |
| ---------------- | -------------------------------------------------------------- |
| Monorepo         | pnpm workspaces + Turborepo                                    |
| Frontend         | TanStack Start (RC), TanStack Router, TanStack Query           |
| API layer        | oRPC (v1) + effect-orpc (Approach A: Effect-native procedures) |
| Backend runtime  | Effect-TS with ManagedRuntime for DI                           |
| Auth             | better-auth (email/password only)                              |
| Backend HTTP     | Hono (Fetch API compatible, serves oRPC + better-auth)         |
| Database         | SQLite + Drizzle ORM                                           |
| Schemas          | Zod (v4, source of truth)                                      |
| Type checking    | @effect/tsgo (typescript-go + Effect LSP plugin)               |
| Linting          | oxlint (with no-unsafe-type-assertion = error)                 |
| Pattern matching | ts-pattern (exhaustive matching on typed errors)               |
| UI               | Minimal/functional (plain HTML or basic Tailwind)              |

## Design Rules

- No `as` keyword in business logic code (enforced via oxlint `no-unsafe-type-assertion`)
- ts-pattern for all error handling — use `.exhaustive()` to get compile-time guarantees when error variants change
- DB connection injected via Effect services/layers — never hardcoded (enables future parallel integration test story)
- Zod is the schema source of truth — all shared types inferred from Zod schemas

## Naming Conventions

| Category             | Prefix/Pattern          | Example            |
| -------------------- | ----------------------- | ------------------ |
| Drizzle table def    | `T_*` (plural)          | `T_todos`          |
| Drizzle select type  | `Row_*`                 | `Row_Todo`         |
| Drizzle insert type  | `RowInsert_*`           | `RowInsert_Todo`   |
| Zod domain schema    | `S_*`                   | `S_Todo`           |
| Zod input schema     | `SIn_D_*`               | `SIn_D_listTodos`  |
| Zod output schema    | `SOut_D_*`              | `SOut_D_listTodos` |
| Inferred TS type     | `I_*`                   | `I_Todo`           |
| Inferred input type  | `IIn_D_*`               | `IIn_D_listTodos`  |
| Inferred output type | `IOut_D_*`              | `IOut_D_listTodos` |
| Effect error class   | `E_*` (no Error suffix) | `E_TodoNotFound`   |
| Effect service tag   | `Svc_*`                 | `Svc_TodosRepo`    |
| Effect layer         | `L_*`                   | `L_TodosRepo`      |
| Effect runtime       | `RT_*`                  | `RT_main`          |
| oRPC procedure       | `D_*`                   | `D_listTodos`      |
| oRPC middleware      | `MW_*`                  | `MW_authed`        |
| oRPC router          | `R_*`                   | `R_todos`          |
| React component      | `C_*`                   | `C_TodoList`       |
| Custom hook          | `use*`                  | `useTodos`         |
| oRPC client          | `orpc`                  | `orpc`             |

## Project Structure

```
~/effect-orpc-messaround/
├── turbo.json
├── package.json                  # pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json            # shared TS config, @effect/tsgo plugin
├── oxlint.json                   # no-unsafe-type-assertion = error
├── apps/
│   ├── web/                      # TanStack Start app
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── app.config.ts
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── __root.tsx
│   │       │   ├── login.tsx
│   │       │   ├── signup.tsx
│   │       │   ├── _authed.tsx
│   │       │   └── _authed/
│   │       │       └── todos.tsx
│   │       ├── components/
│   │       │   ├── C_TodoList.tsx
│   │       │   ├── C_TodoItem.tsx
│   │       │   └── C_TodoForm.tsx
│   │       └── lib/
│   │           ├── orpc.ts       # oRPC client + TanStack Query
│   │           └── auth-client.ts
│   └── backend/                  # oRPC API server
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts          # server entry
│           ├── runtime.ts        # Effect ManagedRuntime (DI root)
│           ├── router.ts         # oRPC router assembly
│           ├── routes/
│           │   └── todos.ts      # D_listTodos, D_createTodo, etc.
│           ├── middleware/
│           │   └── auth.ts       # MW_authed
│           ├── services/
│           │   └── todos-repo.ts # Svc_TodosRepo + L_TodosRepo
│           └── db/
│               ├── schema.ts     # T_todos, Drizzle schema
│               ├── index.ts      # DB connection, L_Database
│               └── migrations/
└── packages/
    └── shared/
        ├── package.json          # exports raw .ts source
        ├── tsconfig.json
        └── src/
            ├── index.ts          # barrel export
            ├── todos.ts          # S_Todo, SIn/SOut schemas, E_* errors
            └── auth.ts           # shared auth types
```

## Data Model

### SQLite Schema (Drizzle)

```typescript
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

better-auth manages its own user/session tables.

## Shared Contracts

```typescript
// packages/shared/src/todos.ts
import { z } from "zod";
import { ORPCTaggedError } from "effect-orpc";

// Domain object schema
export const S_Todo = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  createdAt: z.date(),
});
export type I_Todo = z.infer<typeof S_Todo>;

// Endpoint schemas
export const SIn_D_listTodos = z.object({
  filter: z.enum(["all", "active", "completed"]).optional(),
});
export const SOut_D_listTodos = z.object({ todos: z.array(S_Todo) });

export const SIn_D_createTodo = z.object({
  title: z.string().min(1).max(255),
});
export const SOut_D_createTodo = S_Todo;

export const SIn_D_toggleTodo = z.object({ id: z.string() });
export const SOut_D_toggleTodo = S_Todo;

export const SIn_D_deleteTodo = z.object({ id: z.string() });
export const SOut_D_deleteTodo = z.object({ success: z.literal(true) });

// Inferred types
export type IIn_D_listTodos = z.infer<typeof SIn_D_listTodos>;
export type IOut_D_listTodos = z.infer<typeof SOut_D_listTodos>;
export type IIn_D_createTodo = z.infer<typeof SIn_D_createTodo>;
export type IOut_D_createTodo = z.infer<typeof SOut_D_createTodo>;
export type IIn_D_toggleTodo = z.infer<typeof SIn_D_toggleTodo>;
export type IOut_D_toggleTodo = z.infer<typeof SOut_D_toggleTodo>;
export type IIn_D_deleteTodo = z.infer<typeof SIn_D_deleteTodo>;
export type IOut_D_deleteTodo = z.infer<typeof SOut_D_deleteTodo>;

// Error classes
export class E_TodoNotFound extends ORPCTaggedError("E_TodoNotFound") {
  readonly id!: string;
}
export class E_TodoValidation extends ORPCTaggedError("E_TodoValidation") {
  readonly message!: string;
}
export class E_Database extends ORPCTaggedError("E_Database") {
  readonly message!: string;
}
```

## Backend Architecture

### Effect Services

```typescript
// services/todos-repo.ts
export class Svc_TodosRepo extends Context.Tag("Svc_TodosRepo")<
  Svc_TodosRepo,
  {
    list: (filter?: string) => Effect.Effect<I_Todo[], E_Database>;
    create: (title: string, userId: string) => Effect.Effect<I_Todo, E_TodoValidation | E_Database>;
    toggle: (id: string, userId: string) => Effect.Effect<I_Todo, E_TodoNotFound | E_Database>;
    delete: (id: string, userId: string) => Effect.Effect<void, E_TodoNotFound | E_Database>;
  }
>() {}

export const L_TodosRepo = Layer.succeed(Svc_TodosRepo, {
  list: (filter) =>
    Effect.gen(function* () {
      // Drizzle query against T_todos
    }),
  // ...
});
```

### Runtime

```typescript
// runtime.ts
const MainLayer = Layer.mergeAll(L_TodosRepo, L_Database);
export const RT_main = ManagedRuntime.make(MainLayer);
```

### oRPC Procedures

```typescript
// routes/todos.ts
const effectOs = makeEffectORPC(RT_main);

export const D_listTodos = effectOs
  .errors(E_Database)
  .input(SIn_D_listTodos)
  .output(SOut_D_listTodos)
  .effect(function* ({ input, context }) {
    const repo = yield* Svc_TodosRepo;
    const todos = yield* repo.list(input.filter);
    return { todos };
  });
```

### Auth Middleware

```typescript
// middleware/auth.ts
export const MW_authed = os.middleware(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers });
  if (!session) throw new ORPCError("UNAUTHORIZED");
  return next({ context: { ...context, session } });
});
```

### Router

```typescript
// router.ts
export const R_todos = {
  list: D_listTodos,
  create: D_createTodo,
  toggle: D_toggleTodo,
  delete: D_deleteTodo,
};

export const R_root = { todos: R_todos };
```

## Frontend Architecture

### oRPC Client

```typescript
// lib/orpc.ts
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createIsomorphicFn } from "@tanstack/start";

const getLink = createIsomorphicFn()
  .client(() => RPCLink({ url: "/api/rpc" }))
  .server(() => RPCLink({ url: "http://localhost:3001/rpc" }));

export const orpc = createORPCClient(R_root, { link: getLink() });
```

### Auth Client

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/client";
export const authClient = createAuthClient({ baseURL: "/api/auth" });
```

### Route Structure

```
src/routes/
├── __root.tsx          # root layout, loads session
├── login.tsx           # public, email/password form
├── signup.tsx          # public, registration form
├── _authed.tsx         # layout route, redirects if no session
└── _authed/
    └── todos.tsx       # protected, todo list page
```

### Error Handling Pattern (ts-pattern)

```typescript
// All error handling uses ts-pattern with .exhaustive()
if (error) {
  return match(error)
    .instanceOf(E_Database, (e) => <p>Database error: {e.message}</p>)
    .instanceOf(E_TodoNotFound, (e) => <p>Todo {e.id} not found</p>)
    .otherwise(() => <p>Something went wrong</p>);
}
```

Adding a new error variant to a procedure forces every consumer to handle it at compile time.

## API Endpoints

| Procedure      | Input                         | Output                | Errors                           | Auth     |
| -------------- | ----------------------------- | --------------------- | -------------------------------- | -------- |
| `D_listTodos`  | filter?: all/active/completed | `{ todos: I_Todo[] }` | `E_Database`                     | Required |
| `D_createTodo` | title: string                 | `I_Todo`              | `E_TodoValidation`, `E_Database` | Required |
| `D_toggleTodo` | id: string                    | `I_Todo`              | `E_TodoNotFound`, `E_Database`   | Required |
| `D_deleteTodo` | id: string                    | `{ success: true }`   | `E_TodoNotFound`, `E_Database`   | Required |

## Dev Workflow

- `pnpm dev` (via Turborepo) starts both web and backend in parallel
- Shared package exports raw `.ts` — no build step during dev, Vite compiles on the fly
- `turbo build` for production builds with correct dependency ordering
- oxlint runs in CI and as a pre-commit check

## Future Considerations (out of scope for now)

- **Parallel integration tests**: DB connection is injected via `L_Database` — create `RT_test` with isolated SQLite file per test worker
- **OAuth providers**: better-auth supports plugins for GitHub, Google, etc.
- **OpenAPI generation**: oRPC can generate OpenAPI specs from the router
