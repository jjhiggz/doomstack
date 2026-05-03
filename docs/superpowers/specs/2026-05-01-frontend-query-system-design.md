# Frontend Query System Design

## Problem

Mutation invalidation logic is scattered across components. Every component that mutates data independently wires up `useQueryClient()`, reconstructs query keys, and calls `invalidateQueries()`. This duplicates the "which mutations invalidate which queries" knowledge and makes it easy to forget invalidation when adding new mutation call sites.

Additionally, query options need to be reusable across TanStack Start route loaders (for SSR prefetching via `ensureQueryData`) and components (via `useSuspenseQuery`). Wrapping at the hook level prevents this reuse.

## Decision

Hybrid approach:

- **Query options**: Exported as `QO_` prefixed functions that return TanStack Query options objects. Reusable in both route loaders and components. Input types are shared from `@repo/shared` — never redeclared.
- **Mutation hooks**: Per-operation `use<Verb><Entity>` hooks that encapsulate `useMutation` + invalidation. Mutations can't be used in loaders, so hooks are the right abstraction.

## File Organization

One file per domain in `~/lib/queries/`, named after the backend domain:

```
apps/web/src/lib/queries/
  todos.ts      — QO_todosList, useCreateTodo, useToggleTodo, useDeleteTodo
```

New domains get their own file (e.g. `projects.ts`, `users.ts`).

## Naming Conventions

### Query options: `QO_<entity><Verb>`

| Query options | Backend procedure | Input type |
|---------------|-------------------|------------|
| `QO_todosList` | `D_listTodos` | `IIn_D_listTodos` |
| `QO_todosGet` | `D_getTodo` | `IIn_D_getTodo` |

### Mutation hooks: `use<Verb><Entity>`

| Hook | Backend procedure |
|------|-------------------|
| `useCreateTodo` | `D_createTodo` |
| `useToggleTodo` | `D_toggleTodo` |
| `useDeleteTodo` | `D_deleteTodo` |

## Query Options Structure

Functions that accept the shared input type from `@repo/shared` and return oRPC query options. The input type is defined once in the shared schema — never redeclared.

```ts
import type { IIn_D_listTodos } from "@repo/shared/todos"
import { orpc } from "~/lib/orpc"

export const QO_todosList = (input: IIn_D_listTodos = {}) =>
  orpc.todos.list.queryOptions({ input })
```

### Usage in route loaders (SSR prefetch)

```ts
export const Route = createFileRoute("/_authed/todos")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(QO_todosList()),
  component: C_PageTodos,
})
```

### Usage in components (data already cached)

```tsx
function C_PageTodos() {
  const { data } = useSuspenseQuery(QO_todosList())
  return <C_TodoList todos={data.todos} />
}
```

## Mutation Hooks Structure

Wrap `useMutation` + `orpc.*.mutationOptions()`. Encapsulate invalidation in `onSuccess`.

```ts
export function useCreateTodo() {
  const qc = useQueryClient()
  return useMutation({
    ...orpc.todos.create.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: orpc.todos.key() }),
  })
}
```

## Invalidation Strategy

Each mutation invalidates at the **router level** using `orpc.<domain>.key()`. This partial key matches all queries under that domain — list, get-by-id, filtered variants — without needing to reconstruct specific keys.

If performance requires it later, narrow to specific keys using `orpc.<domain>.<procedure>.queryKey()`. But start broad.

## What Components Do NOT Do

- Never use `useQuery` directly — use `useSuspenseQuery` with `QO_*` options (data is prefetched in the loader)
- Never call `useQueryClient()` for invalidation — that lives in mutation hooks
- Never redeclare input types — import `IIn_D_*` from `@repo/shared`

## Components Can Still Customize

Component-specific behavior (like clearing a form) goes in the component via per-call options:

```tsx
const createMutation = useCreateTodo()

createMutation.mutate(
  { title: title.trim() },
  { onSuccess: () => setTitle("") },
)
```

The per-call `onSuccess` runs after the hook's `onSuccess` (invalidation), so both fire.

## CLAUDE.md Addition

Add `QO_` to the naming prefixes table in root `CLAUDE.md`.

Add to `apps/web/CLAUDE.md`:

```markdown
## Query System

All TanStack Query usage goes through `~/lib/queries/<domain>.ts`.

- **Query options**: `QO_<entity><Verb>` functions — use in route loaders (`ensureQueryData`) and components (`useSuspenseQuery`)
- **Mutation hooks**: `use<Verb><Entity>` — encapsulate `useMutation` + invalidation
- **Never use `useQuery`/`useMutation` directly in components**
- **Never redeclare input types** — import `IIn_D_*` from `@repo/shared`
- **Invalidation**: mutations invalidate at the router level via `orpc.<domain>.key()`
```
