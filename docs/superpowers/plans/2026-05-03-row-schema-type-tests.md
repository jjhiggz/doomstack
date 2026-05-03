# Row Schema Type Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `S_Todo`/`I_Todo` with `SRow_Todo`/`IRow_Todo` that exactly matches the database row type, add compile-time type assertions, and remove the `rowToTodo` mapping function.

**Architecture:** Row schemas (`SRow_*`) are the single source of truth for entity shapes — they match Drizzle table rows exactly and are used by both frontend and backend. A compile-time type test in the backend asserts `IRow_Todo === Row_Todo`, catching any drift between the Zod schema and the Drizzle table definition. The `rowToTodo` mapping function becomes unnecessary since the shapes are identical.

**Tech Stack:** Zod, Drizzle ORM, TypeScript (compile-time assertions), Vitest (existing tests)

---

### Task 1: Add Type Testing Utility

**Files:**
- Create: `apps/backend/src/utils/type-testing.ts`

- [ ] **Step 1: Create the type testing utility**

```ts
// apps/backend/src/utils/type-testing.ts
export type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

export type AssertEqual<X, Y> = Equal<X, Y> extends true
  ? true
  : "Types are not equal";
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm -F @repo/backend typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/utils/type-testing.ts
git commit -m "feat: add compile-time type testing utility"
```

---

### Task 2: Rename `S_Todo`/`I_Todo` to `SRow_Todo`/`IRow_Todo` and Add `userId`

**Files:**
- Modify: `packages/shared/src/todos.schema.ts`

- [ ] **Step 1: Run existing tests to confirm green baseline**

Run: `pnpm -F @repo/backend test`
Expected: All tests pass

- [ ] **Step 2: Rename schema and add `userId`**

In `packages/shared/src/todos.schema.ts`, make these changes:

Replace the domain object schema section:
```ts
// ── Domain Object Schema ──

export const S_Todo = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  createdAt: z.coerce.date(),
  dueDate: z.coerce.date().nullable(),
});

export type I_Todo = z.infer<typeof S_Todo>;
```

With:
```ts
// ── Row Schema (matches T_todos exactly) ──

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

- [ ] **Step 3: Update all schema references in the same file**

In `packages/shared/src/todos.schema.ts`, update the endpoint output schemas:

Replace:
```ts
  todos: z.array(S_Todo),
```
With:
```ts
  todos: z.array(SRow_Todo),
```

Replace:
```ts
export const SOut_D_createTodo = S_Todo;
```
With:
```ts
export const SOut_D_createTodo = SRow_Todo;
```

Replace:
```ts
export const SOut_D_toggleTodo = S_Todo;
```
With:
```ts
export const SOut_D_toggleTodo = SRow_Todo;
```

- [ ] **Step 4: Update inferred type exports**

In `packages/shared/src/todos.schema.ts`, replace:
```ts
export type IIn_D_listTodos = z.infer<typeof SIn_D_listTodos>;
export type IOut_D_listTodos = z.infer<typeof SOut_D_listTodos>;
export type IIn_D_createTodo = z.infer<typeof SIn_D_createTodo>;
export type IOut_D_createTodo = z.infer<typeof SOut_D_createTodo>;
export type IIn_D_toggleTodo = z.infer<typeof SIn_D_toggleTodo>;
export type IOut_D_toggleTodo = z.infer<typeof SOut_D_toggleTodo>;
export type IIn_D_deleteTodo = z.infer<typeof SIn_D_deleteTodo>;
export type IOut_D_deleteTodo = z.infer<typeof SOut_D_deleteTodo>;
```

With:
```ts
export type IIn_D_listTodos = z.infer<typeof SIn_D_listTodos>;
export type IOut_D_listTodos = z.infer<typeof SOut_D_listTodos>;
export type IIn_D_createTodo = z.infer<typeof SIn_D_createTodo>;
export type IOut_D_createTodo = z.infer<typeof SOut_D_createTodo>;
export type IIn_D_toggleTodo = z.infer<typeof SIn_D_toggleTodo>;
export type IOut_D_toggleTodo = z.infer<typeof SOut_D_toggleTodo>;
export type IIn_D_deleteTodo = z.infer<typeof SIn_D_deleteTodo>;
export type IOut_D_deleteTodo = z.infer<typeof SOut_D_deleteTodo>;
```

(These stay the same — they already reference `SOut_D_*` which now references `SRow_Todo`. No change needed.)

- [ ] **Step 5: Verify shared package compiles**

Run: `pnpm -F @repo/shared typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/todos.schema.ts
git commit -m "feat: rename S_Todo to SRow_Todo, add userId to match table row"
```

---

### Task 3: Update Stub

**Files:**
- Modify: `packages/shared/src/todos.stub.ts`

- [ ] **Step 1: Update stub to use `SRow_Todo` and add `userId` generator**

Replace the full content of `packages/shared/src/todos.stub.ts`:

```ts
import { SRow_Todo } from "./todos.schema";
import { makeStub } from "./utils/stub-builder";

export const ST_Todo = makeStub(SRow_Todo, {
  generators: {
    id: ({ index = 0 }) => `todo-${index + 1}`,
    title: ({ index = 0 }) => `Todo ${index + 1}`,
    completed: () => false,
    userId: ({ index = 0 }) => `user-${index + 1}`,
    createdAt: () => new Date("2025-01-01T00:00:00Z"),
    dueDate: () => null,
  },
});
```

- [ ] **Step 2: Update stub-builder test references**

In `packages/shared/src/utils/stub-builder.test.ts`, find the section starting at line 361:

Replace:
```ts
// ── Real-world: S_Todo stub ──

describe("S_Todo stub (real schema)", () => {
```
With:
```ts
// ── Real-world: SRow_Todo stub ──

describe("SRow_Todo stub (real schema)", () => {
```

In the same file, replace all three occurrences of `const { S_Todo } = await import("../todos.schema");` with:
```ts
const { SRow_Todo } = await import("../todos.schema");
```

And replace all three occurrences of `const ST = makeStub(S_Todo, {` with:
```ts
const ST = makeStub(SRow_Todo, {
```

Each of the three test cases needs a `userId` generator added. For all three `makeStub` calls, add `userId` to the generators object:

```ts
const ST = makeStub(SRow_Todo, {
  generators: {
    id: ({ index = 0 }) => `todo-${index + 1}`,
    title: ({ index = 0 }) => `Todo ${index + 1}`,
    completed: () => false,                         // or ({ index = 0 }) => index % 2 === 0 in the second test
    userId: ({ index = 0 }) => `user-${index + 1}`,
    createdAt: () => new Date("2025-01-01T00:00:00Z"),
  },
});
```

Note: the second test has `completed: ({ index = 0 }) => index % 2 === 0` — keep that as-is, just add `userId`.

- [ ] **Step 3: Run stub-builder tests**

Run: `pnpm -F @repo/shared test`
Expected: All tests pass (including the renamed `SRow_Todo stub` tests)

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/todos.stub.ts packages/shared/src/utils/stub-builder.test.ts
git commit -m "feat: update stub to use SRow_Todo with userId generator"
```

---

### Task 4: Update Backend Service — Remove `rowToTodo`, Return Rows Directly

**Files:**
- Modify: `apps/backend/src/todos.service.ts`

- [ ] **Step 1: Update imports**

In `apps/backend/src/todos.service.ts`, replace:
```ts
import type { I_Todo, IIn_D_listTodos } from "@repo/shared/todos";
```
With:
```ts
import type { IRow_Todo, IIn_D_listTodos } from "@repo/shared/todos";
```

- [ ] **Step 2: Update service interface types**

Replace:
```ts
    list: (input: IIn_D_listTodos) => Effect.Effect<I_Todo[], E_Database>;
    create: (
      title: string,
      userId: string,
      dueDate?: Date | null,
    ) => Effect.Effect<I_Todo, E_Database>;
    toggle: (id: string, userId: string) => Effect.Effect<I_Todo, E_TodoNotFound | E_Database>;
```
With:
```ts
    list: (input: IIn_D_listTodos) => Effect.Effect<IRow_Todo[], E_Database>;
    create: (
      title: string,
      userId: string,
      dueDate?: Date | null,
    ) => Effect.Effect<IRow_Todo, E_Database>;
    toggle: (id: string, userId: string) => Effect.Effect<IRow_Todo, E_TodoNotFound | E_Database>;
```

- [ ] **Step 3: Remove `rowToTodo` and update `list` to return rows directly**

Delete the `rowToTodo` function (lines 30-38):
```ts
function rowToTodo(row: typeof T_todos.$inferSelect): I_Todo {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed,
    createdAt: row.createdAt,
    dueDate: row.dueDate,
  };
}
```

In the `list` implementation, replace:
```ts
            return rows.map(rowToTodo);
```
With:
```ts
            return rows;
```

- [ ] **Step 4: Update `create` to return the full row**

In the `create` implementation, replace:
```ts
            return { id, title, completed: false, createdAt: now, dueDate: dueDate ?? null };
```
With:
```ts
            return { id, title, completed: false, userId, createdAt: now, dueDate: dueDate ?? null };
```

- [ ] **Step 5: Update `toggle` to return the row directly**

Replace:
```ts
          return rowToTodo({ ...existing, completed: newCompleted });
```
With:
```ts
          return { ...existing, completed: newCompleted };
```

- [ ] **Step 6: Run backend tests**

Run: `pnpm -F @repo/backend test`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/todos.service.ts
git commit -m "refactor: remove rowToTodo, return full rows from service"
```

---

### Task 5: Add Compile-Time Type Test

**Files:**
- Create: `apps/backend/src/todos.typetest.ts`

- [ ] **Step 1: Create the type test file**

```ts
// apps/backend/src/todos.typetest.ts
import type { IRow_Todo } from "@repo/shared/todos";
import type { Row_Todo } from "./todos.table";
import type { AssertEqual } from "./utils/type-testing";

const _check: AssertEqual<IRow_Todo, Row_Todo> = true;
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm -F @repo/backend typecheck`
Expected: PASS — `IRow_Todo` and `Row_Todo` have the same shape

- [ ] **Step 3: Verify it catches drift (manual sanity check)**

Temporarily add a field to `SRow_Todo` in `packages/shared/src/todos.schema.ts`:
```ts
  testField: z.string(), // temporary — remove after checking
```

Run: `pnpm -F @repo/backend typecheck`
Expected: FAIL with `Type '"Types are not equal"' is not assignable to type 'true'` in `todos.typetest.ts`

Remove the temporary field.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/todos.typetest.ts
git commit -m "feat: add compile-time type test asserting SRow_Todo matches Row_Todo"
```

---

### Task 6: Update Frontend References

**Files:**
- Modify: `apps/web/src/routes/_authed/todos.tsx`
- Modify: `apps/web/src/components/C_TodoList.tsx`
- Modify: `apps/web/src/components/C_TodoItem.tsx`

- [ ] **Step 1: Update `todos.tsx`**

In `apps/web/src/routes/_authed/todos.tsx`, replace:
```ts
import type { I_Todo, IIn_D_listTodos } from "@repo/shared/todos";
```
With:
```ts
import type { IRow_Todo, IIn_D_listTodos } from "@repo/shared/todos";
```

Replace:
```ts
const columns: ColumnDef<I_Todo, unknown>[] = [
```
With:
```ts
const columns: ColumnDef<IRow_Todo, unknown>[] = [
```

Replace:
```ts
function TodoCheckbox({ todo }: { todo: I_Todo }) {
```
With:
```ts
function TodoCheckbox({ todo }: { todo: IRow_Todo }) {
```

- [ ] **Step 2: Update `C_TodoList.tsx`**

In `apps/web/src/components/C_TodoList.tsx`, replace:
```ts
import type { I_Todo } from "@repo/shared/todos";
```
With:
```ts
import type { IRow_Todo } from "@repo/shared/todos";
```

Replace:
```ts
export function C_TodoList({ todos }: { todos: I_Todo[] }) {
```
With:
```ts
export function C_TodoList({ todos }: { todos: IRow_Todo[] }) {
```

- [ ] **Step 3: Update `C_TodoItem.tsx`**

In `apps/web/src/components/C_TodoItem.tsx`, replace:
```ts
import type { I_Todo } from "@repo/shared/todos";
```
With:
```ts
import type { IRow_Todo } from "@repo/shared/todos";
```

Replace:
```ts
export function C_TodoItem({ todo }: { todo: I_Todo }) {
```
With:
```ts
export function C_TodoItem({ todo }: { todo: IRow_Todo }) {
```

- [ ] **Step 4: Verify frontend compiles**

Run: `pnpm -F @repo/web typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/_authed/todos.tsx apps/web/src/components/C_TodoList.tsx apps/web/src/components/C_TodoItem.tsx
git commit -m "refactor: update frontend to use IRow_Todo"
```

---

### Task 7: Update Seeding Package

**Files:**
- Modify: `packages/seeding/src/todos.factory.ts`
- Modify: `packages/seeding/src/basics.scenario.ts`
- Modify: `packages/seeding/src/filterable.scenario.ts`

- [ ] **Step 1: Update `todos.factory.ts`**

In `packages/seeding/src/todos.factory.ts`, replace:
```ts
import type { I_Todo } from "@repo/shared/todos";
```
With:
```ts
import type { IRow_Todo } from "@repo/shared/todos";
```

Replace:
```ts
export const F_createTodo = (opts: TodoSeedOpts): Effect.Effect<I_Todo, never, Svc_Database> =>
```
With:
```ts
export const F_createTodo = (opts: TodoSeedOpts): Effect.Effect<IRow_Todo, never, Svc_Database> =>
```

The factory currently returns `stub` (which previously didn't include `userId`). Since `ST_Todo` now includes `userId` and the stub gets `userId` from `opts`, the return value already has `userId` because it's spread via `{ userId: user.id, ...overrides }`. However, the stub is built with `ST_Todo.one({ id: nanoid(), ...overrides })` where `overrides` has `userId` stripped. We need to include `userId` in the return.

Replace:
```ts
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
```
With:
```ts
    const { userId, ...overrides } = opts;
    const stub = ST_Todo.one({ id: nanoid(), userId, ...overrides });

    yield* Effect.promise(() =>
      db.insert(T_todos).values({
        id: stub.id,
        title: stub.title,
        completed: stub.completed,
        userId: stub.userId,
        createdAt: stub.createdAt,
        dueDate: stub.dueDate,
      }),
    );

    return stub;
```

- [ ] **Step 2: Update `basics.scenario.ts`**

In `packages/seeding/src/basics.scenario.ts`, replace:
```ts
import type { I_Todo } from "@repo/shared/todos";
```
With:
```ts
import type { IRow_Todo } from "@repo/shared/todos";
```

Replace:
```ts
  todos: I_Todo[];
```
With:
```ts
  todos: IRow_Todo[];
```

- [ ] **Step 3: Update `filterable.scenario.ts`**

In `packages/seeding/src/filterable.scenario.ts`, replace:
```ts
import type { I_Todo } from "@repo/shared/todos";
```
With:
```ts
import type { IRow_Todo } from "@repo/shared/todos";
```

Replace:
```ts
  todos: I_Todo[];
```
With:
```ts
  todos: IRow_Todo[];
```

- [ ] **Step 4: Verify seeding package compiles**

Run: `pnpm -F @repo/seeding typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/seeding/src/todos.factory.ts packages/seeding/src/basics.scenario.ts packages/seeding/src/filterable.scenario.ts
git commit -m "refactor: update seeding package to use IRow_Todo"
```

---

### Task 8: Update CLAUDE.md Naming Conventions

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the naming prefix table**

In `CLAUDE.md`, replace the naming prefixes table:
```
| Prefix | Meaning | Example |
|--------|---------|---------|
| `S_` | Schema | `S_Todo` |
| `I_` | Inferred type from schema | `I_Todo` |
| `SIn_D_` / `SOut_D_` | Endpoint input/output schema | `SIn_D_createTodo` |
```

With:
```
| Prefix | Meaning | Example |
|--------|---------|---------|
| `SRow_` | Schema matching a DB row exactly | `SRow_Todo` |
| `IRow_` | Inferred type from row schema | `IRow_Todo` |
| `S_` | Schema (non-row: filters, enums, etc.) | `S_completedFilter` |
| `I_` | Inferred type from schema | `I_Session` |
| `SIn_D_` / `SOut_D_` | Endpoint input/output schema | `SIn_D_createTodo` |
```

Keep all other rows in the table unchanged.

- [ ] **Step 2: Update the barrel file example**

In `CLAUDE.md`, replace:
```ts
// BAD
import { S_Todo, E_Database } from "@repo/shared"

// GOOD
import { S_Todo } from "@repo/shared/todos"
```

With:
```ts
// BAD
import { SRow_Todo, E_Database } from "@repo/shared"

// GOOD
import { SRow_Todo } from "@repo/shared/todos"
```

- [ ] **Step 3: Run full check**

Run: `pnpm check`
Expected: format check, lint, and typecheck all pass

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md naming conventions with SRow_/IRow_ prefixes"
```
