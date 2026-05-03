# Declarative Filters + Postgres Migration

## Problem

The todo list has no filtering UI. The backend has a rudimentary `filter` enum (`all | active | completed`) but no search, date range, sorting, or null-aware filtering. The app runs on SQLite, but Drizzle now has a native Effect integration for Postgres — migrating now avoids building more SQLite-specific code.

## Decision

1. Migrate from SQLite to Postgres (dockerized) with Drizzle's `@effect/sql-pg` integration
2. Adopt the declarative filter pattern from us-app-2: named filter fragments composed with `and()`
3. Add a `dueDate` nullable column to demonstrate null-aware filtering (`IS NULL` / `IS NOT NULL`)
4. Build a reusable table with filter/sort controls, URL-driven state via TanStack Start search params

## Scope

- **Infrastructure**: Docker Compose (Postgres on port 5434), migrate schema from `sqliteTable` to `pgTable`, update `db.service.ts` to use `@effect/sql-pg`, update `auth.config.ts` and seeders for Postgres
- **Schema**: Add `dueDate` nullable field to `T_todos` and `S_Todo`, expand `SIn_D_listTodos` with search/sort/date filters
- **Backend**: Declarative filter builders in `todos.filter.ts`, update `todos.service.ts` to compose them
- **Frontend**: `DataTable` component with reusable filter components, URL-driven filter state

## Infrastructure: SQLite → Postgres

### Docker Compose

`docker-compose.yml` at project root:

- Postgres 17 Alpine on port **5434** (avoids us-app-2's 5432/5433)
- Volume for data persistence
- Environment: `POSTGRES_DB=effect_orpc`, `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=postgres`

### Database connection

`apps/backend/src/db.service.ts` switches from `better-sqlite3` to `@effect/sql-pg` + `PgDrizzle`:

```ts
import { PgDrizzle } from "drizzle-orm/effect";

// Effect Layer that provides the Drizzle Postgres instance
export const L_Database = (connectionString: string) =>
  Layer.effect(Svc_Database, PgDrizzle.make({ ... }));
```

Connection string: `postgresql://postgres:postgres@localhost:5434/effect_orpc`

### Schema migration

All table definitions switch from `sqliteTable` / `integer` to `pgTable` / `timestamp` / `boolean`:

```ts
// Before (SQLite)
export const T_todos = sqliteTable("todos", {
  completed: integer("completed", { mode: "boolean" }),
  createdAt: integer("created_at", { mode: "timestamp" }),
});

// After (Postgres)
export const T_todos = pgTable("todos", {
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull(),
  dueDate: timestamp("due_date"),  // nullable — the null-filtering demo
});
```

### Auth migration

`auth.config.ts` switches from `better-sqlite3` to `pg` pool with Drizzle Postgres adapter. better-auth supports this natively.

### Seeders

`testing/seeders/db.ts` switches from `better-sqlite3` to `pg` client connecting to `localhost:5434`.

### Dev workflow

```
docker compose up -d    # start Postgres
pnpm db:push            # push schema
pnpm dev                # start app
```

### Drizzle config

`drizzle.config.ts` switches dialect from `sqlite` to `postgresql` with connection string.

## Filter Schema

Filter enums are defined as named schemas in `packages/shared/src/todos.schema.ts` — single source of truth for URL validation, API input, backend matching, and frontend dropdown options.

```ts
export const S_completedFilter = z.enum(["all", "true", "false"]);
export const S_dueDateFilter = z.enum(["all", "has-date", "no-date", "overdue"]);
export const S_todoSortField = z.enum(["title", "createdAt", "completed", "dueDate"]);
export const S_sortOrder = z.enum(["asc", "desc"]);

export const SIn_D_listTodos = z.object({
  search: z.string().optional(),
  completed: S_completedFilter.optional(),
  dueDate: S_dueDateFilter.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortField: S_todoSortField.optional(),
  sortOrder: S_sortOrder.optional(),
});
```

### Semantics

- `undefined` = filter not applied (field ignored in query)
- `"all"` = explicit "show everything" (same effect as undefined, but persists in URL to show user's intent)
- `"no-date"` = `dueDate IS NULL` — the null-filtering pattern
- `"overdue"` = `dueDate IS NOT NULL AND dueDate < now` — compound condition

The `S_Todo` schema adds:

```ts
dueDate: z.coerce.date().nullable(),
```

## Backend: Declarative Filter Builders

### Pattern

Adapted from us-app-2's composable Prisma filters. Each filter is a named fragment typed as `SQL | undefined`. Uses `ts-pattern` for conditional logic. Compose with Drizzle's `and()` which ignores `undefined` arguments.

### File: `apps/backend/src/todos.filter.ts`

Contains pure functions, each handling one filter concern:

**`buildCompletedFilter(value)`** — Simple enum-to-condition mapping:

```ts
const completedWhere = match(input.completed)
  .with("true", () => eq(T_todos.completed, true))
  .with("false", () => eq(T_todos.completed, false))
  .otherwise(() => undefined);
```

**`buildDueDateFilter(value)`** — Null-aware filtering with sentinel values:

```ts
const dueDateWhere = match(input.dueDate)
  .with("no-date", () => isNull(T_todos.dueDate))
  .with("has-date", () => isNotNull(T_todos.dueDate))
  .with("overdue", () => and(isNotNull(T_todos.dueDate), lt(T_todos.dueDate, new Date())))
  .otherwise(() => undefined);
```

**`buildDateRangeFilter(dateFrom, dateTo)`** — Multi-input interaction (the ts-pattern showcase):

```ts
const dateWhere = match({ dateFrom, dateTo })
  .with({ dateFrom: P.nonNullable, dateTo: P.nonNullable }, ({ dateFrom, dateTo }) =>
    between(T_todos.createdAt, dateFrom, dateTo))
  .with({ dateFrom: P.nonNullable }, ({ dateFrom }) =>
    gte(T_todos.createdAt, dateFrom))
  .with({ dateTo: P.nonNullable }, ({ dateTo }) =>
    lte(T_todos.createdAt, dateTo))
  .otherwise(() => undefined);
```

**`buildSearchFilter(search)`** — Multi-word AND matching:

```ts
const searchWhere = match(input.search?.trim())
  .with(P.string.minLength(1), (search) => {
    const words = search.split(/\s+/);
    return and(...words.map(w => ilike(T_todos.title, `%${w}%`)));
  })
  .otherwise(() => undefined);
```

Note: `ilike` instead of `like` — Postgres supports case-insensitive LIKE natively.

### Composition in `todos.service.ts`

```ts
const todos = yield* Effect.try({
  try: () =>
    db.select().from(T_todos)
      .where(and(completedWhere, dueDateWhere, dateWhere, searchWhere))
      .orderBy(sortClause)
      .all(),
  catch: (error) => new E_Database({ message: String(error) }),
});
```

### Sorting

```ts
const sortClause = match({ field: input.sortField, order: input.sortOrder })
  .with({ field: "title", order: "asc" }, () => asc(T_todos.title))
  .with({ field: "title", order: "desc" }, () => desc(T_todos.title))
  .with({ field: "createdAt", order: "asc" }, () => asc(T_todos.createdAt))
  .with({ field: "createdAt", order: "desc" }, () => desc(T_todos.createdAt))
  .with({ field: "completed", order: "asc" }, () => asc(T_todos.completed))
  .with({ field: "completed", order: "desc" }, () => desc(T_todos.completed))
  .with({ field: "dueDate", order: "asc" }, () => asc(T_todos.dueDate))
  .with({ field: "dueDate", order: "desc" }, () => desc(T_todos.dueDate))
  .otherwise(() => desc(T_todos.createdAt));  // default sort
```

### Testing

Each filter builder is a pure function — test independently:

```ts
describe("buildSearchFilter", () => {
  it("returns undefined for empty search", () => { ... });
  it("ANDs multiple words", () => { ... });
});

describe("buildDueDateFilter", () => {
  it("returns isNull for no-date", () => { ... });
  it("returns compound condition for overdue", () => { ... });
});
```

## Frontend: Table with Filter Controls

### URL-driven state

The TanStack Start route validates search params with the shared schema:

```ts
export const Route = createFileRoute("/_authed/todos")({
  validateSearch: zodValidator(SIn_D_listTodos),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(QO_todosList(deps)),
});
```

`useSearch()` reads filters, `navigate({ search })` writes them. URL is the single source of truth — filters survive refresh and are shareable.

### Query integration

```ts
const search = useSearch({ from: "/_authed/todos" });
const { data } = useSuspenseQuery(QO_todosList(search));
```

When search params change, TanStack Query refetches automatically.

### Reusable filter components

Three filter component types, reusable across future tables:

**`FilterText`** — Text input with debounce. For search fields.

**`FilterSelect`** — Dropdown derived from schema enum options (`S_dueDateFilter.options`). For enum filters.

**`FilterDateRange`** — Two date inputs for from/to. For date range filters.

Each component reads its value from `useSearch()` and writes via `navigate({ search: (prev) => ({ ...prev, [field]: value }) })`.

### Table columns

```ts
const columns: ColumnDef<I_Todo>[] = [
  { accessorKey: "title",     /* sortable + text search */ },
  { accessorKey: "completed", /* sortable + select filter */ },
  { accessorKey: "dueDate",   /* sortable + select filter */ },
  { accessorKey: "createdAt", /* sortable + date range filter */ },
];
```

### DataTable component

Wraps TanStack Table with:

- Column header sort controls (click to cycle asc/desc/none)
- Filter controls rendered above or inline with columns
- Active filter indicators
- Uses shadcn/ui table primitives

## Files Changed / Created

### New files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Postgres 17 on port 5434 |
| `apps/backend/src/todos.filter.ts` | Declarative filter builders |
| `apps/web/src/components/DataTable.tsx` | Reusable table component |
| `apps/web/src/components/FilterText.tsx` | Text search filter |
| `apps/web/src/components/FilterSelect.tsx` | Enum select filter |
| `apps/web/src/components/FilterDateRange.tsx` | Date range filter |

### Modified files

| File | Change |
|------|--------|
| `packages/shared/src/todos.schema.ts` | Add `dueDate` to `S_Todo`, expand `SIn_D_listTodos`, add named filter enums |
| `packages/shared/src/todos.stub.ts` | Add `dueDate` generator |
| `apps/backend/src/todos.table.ts` | Switch to `pgTable`, add `dueDate` column |
| `apps/backend/src/auth.table.ts` | Switch to `pgTable` |
| `apps/backend/src/db.service.ts` | Switch to `@effect/sql-pg` / `PgDrizzle` |
| `apps/backend/src/auth.config.ts` | Switch to Postgres adapter |
| `apps/backend/src/todos.service.ts` | Use filter builders, update query |
| `apps/backend/src/todos.routes.ts` | Pass expanded input to service |
| `apps/backend/drizzle.config.ts` | Switch to `postgresql` dialect |
| `apps/backend/package.json` | Swap SQLite deps for Postgres deps |
| `testing/seeders/db.ts` | Switch to `pg` client |
| `testing/seeders/factories/todos.ts` | Add `dueDate` to factory |
| `testing/seeders/scenarios/basics.ts` | Add varied `dueDate` values |
| `testing/package.json` | Swap SQLite deps for Postgres deps |
| `apps/web/src/routes/_authed/todos.tsx` | Replace list with DataTable, add validateSearch |
| `apps/web/src/lib/queries/todos.ts` | Pass filter input to query options |

## Future work (not in this implementation)

- Pagination (limit/offset or cursor-based)
- Column visibility toggle
- Persistent table preferences per user
- Export to CSV
- Multi-select filters (e.g., filter by multiple statuses)
