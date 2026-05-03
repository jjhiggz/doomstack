# Frontend Rules (@repo/web)

## Imports

Use the `~/` path alias (resolves to `apps/web/src/`). Do not use `./` or `../` to reach across modules.

```ts
// BAD
import { cn } from "../../lib/utils"

// GOOD
import { cn } from "~/lib/utils"
```

## React Hooks

Components should read like a description of behavior, not an implementation.

### Extract `useEffect` into Named Custom Hooks

If a `useEffect` and its related state/refs can be given a meaningful name, extract them into a custom hook.

```tsx
// BAD — reader has to parse the effect to understand intent
useEffect(() => {
  const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
  window.addEventListener("keydown", handler)
  return () => window.removeEventListener("keydown", handler)
}, [onClose])

// GOOD — intent is immediately clear
useEscapeKey(onClose)
```

If the same `useEffect` shape appears in multiple components, it is definitely a hook.

### No Data Fetching in `useEffect`

Use `QO_*` query options with `useSuspenseQuery` instead of raw fetch-in-effect. Prefetch in route loaders via `ensureQueryData`.

```tsx
// BAD
useEffect(() => {
  setLoading(true)
  fetchTodos().then(setTodos).finally(() => setLoading(false))
}, [])

// GOOD — prefetched in loader, no loading state needed
const { data } = useSuspenseQuery(QO_todosList())
```

## Query System

All TanStack Query usage goes through `~/lib/queries/<domain>.ts`.

- **Query options**: `QO_<entity><Verb>` functions — use in route loaders (`ensureQueryData`) and components (`useSuspenseQuery`)
- **Mutation hooks**: `use<Verb><Entity>` — encapsulate `useMutation` + invalidation
- **Never use `useQuery`/`useMutation` directly in components**
- **Never redeclare input types** — import `IIn_D_*` from `@repo/shared`
- **Invalidation**: mutations invalidate at the router level via `orpc.<domain>.key()`
- **Component-specific behavior** (clearing forms, navigation): pass via per-call `onSuccess` in `.mutate()`, not in the hook

## Parallelise Independent Promises

Use `Promise.all` for independent awaits:

```ts
// BAD — sequential
const deal = await getDeal(id)
const documents = await getDocuments(id)

// GOOD
const [deal, documents] = await Promise.all([getDeal(id), getDocuments(id)])
```

**Exception — first-match search:** When iterating a small collection and awaiting a lookup to find the first success, keep sequential with early `break`. `Promise.all` would fire all queries even when only the first is needed.

## shadcn/UI Components are Read-Only

Never modify generated files in `apps/web/src/components/ui/`. These are shadcn-generated Base UI components.

If you need to customize behavior:

1. Create a wrapper component in `apps/web/src/components/`
2. Extend functionality through composition, not modification
3. Use the `ui/` components as building blocks

## Color & Theming

Use semantic CSS variable tokens via Tailwind utilities. Never use raw color values.

### Use semantic tokens, never raw colors

```tsx
// BAD — hardcoded hex or raw Tailwind palette
<div className="bg-amber-500 text-white border-gray-200" />

// GOOD — semantic tokens, theme-aware
<div className="bg-primary text-primary-foreground border-border" />
```

### Pair foregrounds with their surface

Every surface token has a matching `-foreground`. Always pair them:

```tsx
// BAD
<div className="bg-card text-foreground" />

// GOOD
<div className="bg-card text-card-foreground" />
```

### Muted for secondary content, destructive for errors

```tsx
// BAD
<p className="text-gray-500">Secondary text</p>
<span className="text-red-600">Error</span>

// GOOD
<p className="text-muted-foreground">Secondary text</p>
<span className="text-destructive">Error</span>
```

### Dark mode is automatic

Tokens are defined in both `:root` and `.dark`. Do not add `dark:` color variants — the token system handles it.

## Styling Conventions

### Use `cn()` for conditional classes

Never use template literals with ternaries in `className`. Use `cn()` from `~/lib/utils`:

```tsx
// BAD
<div className={`px-4 ${isActive ? "bg-primary" : "bg-muted"}`} />

// GOOD
<div className={cn("px-4", isActive ? "bg-primary" : "bg-muted")} />

// GOOD — object syntax for conditional classes
<div className={cn("px-4 py-2", { "cursor-not-allowed opacity-50": isDisabled })} />
```

### Icon sizing

- When width and height are equal, use `size-*` shorthand (`size-4`, not `h-4 w-4`)
- When an icon is inside a Button, omit explicit size if 4 or smaller
