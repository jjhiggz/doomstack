# Row Schema Type Tests Design

## Problem

`S_Todo` serves as both the database row shape and the API response shape, but it doesn't actually match the database row (`Row_Todo` has `userId`, `S_Todo` omits it). There's no compile-time check ensuring schemas stay in sync with table definitions, and the naming doesn't communicate whether a schema tracks a table row.

## Design

### New Convention: `SRow_` / `IRow_` Prefix

Schemas that are designed to exactly match a Drizzle table row use the `SRow_` prefix. Their inferred types use `IRow_`.

| Prefix | Meaning | Example |
|--------|---------|---------|
| `SRow_` | Schema matching a DB row exactly | `SRow_Todo` |
| `IRow_` | Inferred type from row schema | `IRow_Todo` |

The existing `S_` prefix remains for non-row schemas (endpoint inputs/outputs, filters, enums, etc.).

### Schema Changes

**`packages/shared/src/todos.schema.ts`**

Replace `S_Todo` / `I_Todo` with `SRow_Todo` / `IRow_Todo`. Add `userId` to match the table row exactly.

```ts
export const SRow_Todo = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  dueDate: z.coerce.date().nullable(),
});

export type IRow_Todo = z.infer<typeof SRow_Todo>;
```

Endpoint output schemas reference `SRow_Todo` directly:

```ts
export const SOut_D_listTodos = z.object({
  todos: z.array(SRow_Todo),
});

export const SOut_D_createTodo = SRow_Todo;
export const SOut_D_toggleTodo = SRow_Todo;
```

### Type Test

**`apps/backend/src/todos.typetest.ts`**

A pure compile-time assertion file. No runtime tests — fails on `pnpm typecheck`.

```ts
import type { IRow_Todo } from "@repo/shared/todos";
import type { Row_Todo } from "./todos.table";

type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

type _assert = Equal<IRow_Todo, Row_Todo> extends true
  ? true
  : "IRow_Todo does not match Row_Todo — update SRow_Todo to match the table";

const _check: _assert = true;
```

### Service Layer Changes

**`apps/backend/src/todos.service.ts`**

- Remove `rowToTodo()` — rows are returned directly
- Update service interface to use `IRow_Todo` instead of `I_Todo`
- Return full rows (including `userId`) from all service methods

### Update All References

- `I_Todo` -> `IRow_Todo` everywhere
- `S_Todo` -> `SRow_Todo` everywhere
- Stub file (`todos.stub.ts`) updated to use `SRow_Todo` and include `userId`

### CLAUDE.md Updates

Add `SRow_` and `IRow_` to the naming prefix table. Clarify that `S_` is for non-row schemas.

## File Changes

| File | Change |
|------|--------|
| `packages/shared/src/todos.schema.ts` | `S_Todo` -> `SRow_Todo`, add `userId` |
| `packages/shared/src/todos.stub.ts` | Update to use `SRow_Todo`, add `userId` |
| `apps/backend/src/todos.typetest.ts` | New file — compile-time type assertion |
| `apps/backend/src/todos.service.ts` | Remove `rowToTodo()`, return rows directly, use `IRow_Todo` |
| `apps/backend/src/todos.routes.ts` | Update schema references |
| `apps/web/` (all frontend refs) | `I_Todo` -> `IRow_Todo`, `S_Todo` -> `SRow_Todo` |
| `CLAUDE.md` | Add `SRow_` / `IRow_` to prefix table |

## Type Test Utility

The `Equal<X, Y>` type will be placed in a shared utility so it can be reused as more tables/schemas are added:

**`apps/backend/src/utils/type-testing.ts`**

```ts
export type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

export type AssertEqual<X, Y> = Equal<X, Y> extends true
  ? true
  : "Types are not equal";
```

Then each typetest file is minimal:

```ts
import type { AssertEqual } from "./utils/type-testing";
import type { IRow_Todo } from "@repo/shared/todos";
import type { Row_Todo } from "./todos.table";

const _check: AssertEqual<IRow_Todo, Row_Todo> = true;
```
