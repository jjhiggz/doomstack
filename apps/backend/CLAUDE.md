# Backend Rules (@repo/backend)

## Service Layer (Effect-TS)

Business logic lives in Effect services, not in route handlers or raw function calls.

### Architecture

| Layer      | Location                     | Purpose                                                       |
| ---------- | ---------------------------- | ------------------------------------------------------------- |
| Tables     | `src/tables/*.table.ts`      | Drizzle table definitions                                     |
| Procedures | `src/<domain>/*.routes.ts`   | oRPC entry points — parse input, call services, return output |
| Services   | `src/<domain>/*.service.ts`  | Business logic as Effect services with `Context.Tag`          |
| Filters    | `src/<domain>/*.filter.ts`   | Query filter builders                                         |
| Type Tests | `src/<domain>/*.typetest.ts`  | Compile-time schema ↔ table assertions                       |
| Tests      | `src/<domain>/*.test.ts`     | Colocated tests (vitest)                                      |
| Middleware | `src/auth/*.middleware.ts`   | Request middleware (auth, etc.)                                |
| Config     | `src/auth/*.config.ts`       | External service configuration (auth, etc.)                    |

### Rules

- **Procedures are thin** — validate input, delegate to services, handle errors
- **Services use Effect** — `Effect.gen`, typed errors, dependency injection via `Context.Tag` and `Layer`
- **Database operations are pure queries** — no business logic in query functions
- **No cross-concern mixing** — auth middleware handles auth, services handle business logic, procedures wire them together

## Parallelise Independent Effects

Use `Effect.all` for independent effects. Sequential `yield*` for independent work is a hidden performance bug.

```ts
// BAD — sequential, but neither depends on the other
const user = yield* Svc_Users.get(userId)
const todos = yield* Svc_Todos.list(userId)

// GOOD
const [user, todos] = yield* Effect.all([Svc_Users.get(userId), Svc_Todos.list(userId)])
```

For 3+ effects with named results, use `Effect.all` with an object:

```ts
const { user, todos, settings } = yield* Effect.all({
  user: Svc_Users.get(userId),
  todos: Svc_Todos.list(userId),
  settings: Svc_Settings.get(userId),
})
```

## Schema Patterns (Backend-Specific)

- Use Effect Schema or oRPC's built-in validation for procedure inputs/outputs
- Define error types with `ORPCTaggedError` in `packages/shared`
- Types flow to the frontend via `RouterClient<typeof R_root>`
