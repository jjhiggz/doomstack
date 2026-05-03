# Project: Effect oRPC Todo App

## First-Time Setup

Prerequisites: Node.js 18+, pnpm 10+, Docker

1. `pnpm install`
2. `docker compose up -d` (starts Postgres)
3. `pnpm -F @repo/backend db:push` (pushes schema to DB)
4. `pnpm dev` (starts all dev servers)

Optional: `pnpm seed filterable up` for demo data (login: user@user.com / password)

## Tech Stack

- **Backend**: Effect-TS + oRPC + Hono + Drizzle (Postgres) + better-auth
- **Frontend**: TanStack Start (SSR) + React + TanStack Query + oRPC client
- **UI**: shadcn/ui (Base UI variant, not Radix) + Tailwind CSS v4
- **Monorepo**: pnpm workspaces + Turborepo

## Project Structure

```
apps/web/              — TanStack Start frontend (@repo/web)
apps/backend/          — Hono API server (@repo/backend)
  src/tables/          — Drizzle table definitions
  src/todos/           — Todo domain (routes, service, filters, tests)
  src/auth/            — Auth config and middleware
packages/shared/       — Shared types, schemas, errors (@repo/shared)
packages/lint-rules/   — Custom lint rules (@repo/lint-rules)
```

## Commands

- `pnpm dev` — run all dev servers (turbo)
- `pnpm build` — build all packages
- `pnpm check` — format check + lint + typecheck
- `pnpm fmt` — format all files (oxfmt)
- `pnpm lint` — oxlint + custom lint rules
- `pnpm typecheck` — typecheck all packages (turbo)
- `pnpm -F @repo/web dev` — run just the frontend
- `pnpm -F @repo/backend dev` — run just the backend
- `pnpm -F @repo/backend test` — run backend tests (vitest)

## Codebase Knowledge Graph

A graphify knowledge graph exists at `graphify-out/` (206 nodes, 154 edges). Before answering codebase architecture questions, check the graph first — it finds cross-file connections that grep alone would miss.

- **Query:** `/graphify query "<question>"` — traverse the graph to answer questions
- **Update:** `/graphify --update` — re-index after significant code changes
- **Explore:** Open `graphify-out/graph.html` in a browser for interactive visualization
- **God nodes:** `S_Todo Schema` (degree 6), `Design Spec: CLAUDE.md AI Rules` (degree 6) — highest-connectivity hubs

## Key Patterns

- **oRPC procedures** use `effect-orpc` with `makeEffectORPC` to wrap Effect generators
- **Typed errors** use `ORPCTaggedError` from `effect-orpc` in `packages/shared`
- **Auth middleware** uses `os.$context<{ headers: Headers }>()` for typed context
- **oRPC client** needs `RouterClient<typeof R_root>` (not raw `typeof R_root`)
- **RPCLink** requires absolute URLs — use `window.location.origin` on client, `http://localhost:3001` on server

## Naming Prefixes

| Prefix | Meaning | Example |
|--------|---------|---------|
| `SRow_` | Schema matching a DB row exactly | `SRow_Todo` |
| `IRow_` | Inferred type from row schema | `IRow_Todo` |
| `S_` | Schema (non-row: filters, enums, etc.) | `S_completedFilter` |
| `I_` | Inferred type from schema | `I_Session` |
| `SIn_D_` / `SOut_D_` | Endpoint input/output schema | `SIn_D_createTodo` |
| `E_` | Error class | `E_TodoNotFound` |
| `D_` | Procedure definition | `D_createTodo` |
| `C_` | Component | `C_TodoList` |
| `Svc_` | Effect service tag | `Svc_TodosRepo` |
| `L_` | Effect layer | `L_TodosRepo` |
| `MW_` | Middleware | `MW_auth` |
| `R_` | Router | `R_todos` |
| `RT_` | Runtime | `RT_main` |
| `T_` | Database table | `T_todos` |
| `Row_` / `RowInsert_` | Drizzle row types | `Row_Todo` |
| `QO_` | Query options function | `QO_todosList` |
| `ST_` | Stub builder | `ST_Todo` |

---

# Code Rules

## 1. Declarative Programming

Prefer declarative, expression-based code over imperative mutation. Code should describe _what_ is wanted, not _how_ to compute it step by step.

### Array Access: Never Use Index Access to Select Items

Never use `array[0]`, `array[index]`, or positional index to pick an item unless iterating or the array is explicitly ordered and position is the semantic intent (tuple destructuring, first element of sorted result).

Use `.find()` to select by condition. Use `.filter()` to select a subset. Use `.at(-1)` only when "last" is truly the intent.

### Loops: Replace For/While with Declarative Methods

Any `for` or `while` loop that can be expressed with a declarative method should be.

- `.find` — return first match
- `.filter` — return subset
- `.map` — transform each element
- `.some` — test if any match
- `.every` — test if all match
- `.toSorted` — sort without mutation

For Effect-TS code, prefer `Effect.gen`, `pipe`, `Array` module, and `Stream` over imperative loops.

### Conditional Logic

**No `let` mutation** — use `const` with ternary or `ts-pattern`:

```ts
// BAD
let label: string;
if (isPrimary) {
  label = "Primary";
} else {
  label = "Secondary";
}

// GOOD
const label = isPrimary ? "Primary" : "Secondary";
```

**Nested ternaries** — use `ts-pattern` instead:

```ts
const label = match(status)
  .with("approved", () => "Approved")
  .with("pending", () => "Pending")
  .otherwise(() => "Unknown");
```

**3+ branches** — use Record lookup for static values, `ts-pattern` with `.exhaustive()` for composite conditions.

**Guard clauses** — flatten nested if/else with early returns. Happy path at the bottom.

**Name derived booleans** — don't inline multi-variable expressions:

```tsx
// BAD
<Button disabled={!isValidPassword || !isValidConfirm || isSubmitting} />

// GOOD
const canSubmit = isValidPassword && isValidConfirm && !isSubmitting
<Button disabled={!canSubmit} />
```

## 2. No Type Casting

`as` casts silence the type checker without fixing the underlying mismatch. Before casting, find the correct typed alternative.

- **`as` in match branches**: use `.returnType<T>()` instead
- **`as` to assert a narrower type**: use a type guard
- **`as` on array literals**: annotate the variable (`const ids: string[] = []`)
- **`as` to satisfy a generic**: fix the generic constraint
- **`as any` / `as unknown as T`**: never acceptable — use schema parsing, type guards, or fix the types
- **Exceptions**: DOM APIs where TypeScript structurally cannot infer (`e.target as HTMLInputElement`), and `as const` assertions (which narrow types, not cast them)

## 3. TypeScript

- Avoid `any` — prefer `unknown` for unknown types. Use schema parsing or type guards to narrow.
- Use strict TypeScript configuration (enforced in `tsconfig.base.json`)
- Leverage discriminated unions for type safety
- Use type guards for runtime type checking
- Use `readonly` for immutable properties
- Use explicit return types for public/exported functions
- Use arrow functions for callbacks
- `PascalCase` for type names, `camelCase` for variables/functions, `UPPER_CASE` for constants
- Descriptive names with auxiliary verbs (`isLoading`, `hasError`)

## 4. Imports

### No dynamic imports

Never use `import("module").Type` for type imports. Use static imports:

```ts
// BAD
type Job = import("bullmq").Job

// GOOD
import type { Job } from "bullmq"
```

### No barrel exports

Barrel files (`index.ts` with `export * from`) are banned (enforced by oxlint `oxc/no-barrel-file`). Import from specific modules:

```ts
// BAD
import { SRow_Todo, E_Database } from "@repo/shared"

// GOOD
import { SRow_Todo } from "@repo/shared/todos"
```

## 5. String Formatting

Use template literals instead of `String()`:

```ts
// BAD
String(variable)
String(variable) || "fallback"

// GOOD
`${variable}`
`${variable || "fallback"}`
```

## 6. Refactoring

Never refactor without a safety net. Tests written before a refactor prove the behavior was already there.

### The Refactor Loop

1. Write tests that capture current behavior — do this FIRST
2. Run tests — they must pass before you touch a single line
3. Refactor
4. Run tests — they must still pass

Test **observable behavior**, not implementation details:

```ts
// BAD — tests implementation (breaks when you refactor)
it("calls db.select with the right args", () => { ... })

// GOOD — tests behavior (survives any restructuring)
it("returns only active todos for the given user", async () => { ... })
```

If tests are hard to write, that's a signal: the function does too much, or business logic is mixed with I/O. Fix the structure first.

## 7. Schema Patterns

Schemas are the single source of truth for types. Never write TypeScript interfaces manually when a schema exists.

- **Derive types from schemas** — use `Schema.Type` / `z.infer` / contract types, never manual interfaces
- **Schema composition over duplication** — extend/pick/omit from base schemas
- **Keep schema count minimal** — base schema + endpoint schemas + helpers
- **Validate at boundaries** — parse external input at the edge (oRPC procedures), trust typed data internally
