# Design: CLAUDE.md AI Rules

## Summary

Port a curated subset of AI coding rules from `us-app-2` into this project's `CLAUDE.md`, adapted to the Effect-TS + oRPC + TanStack Start + shadcn Base UI tech stack.

## Approach

**C — Curated Pick**: Only rules that meaningfully change AI behavior. 5 rules total.

## Rules Included

### 1. Declarative Programming

- Source: `us-app-2/.cursor/rules/declarative-programming.mdc`
- Adaptation: Kept core principles (no index access, declarative array methods, const expressions, guard clauses, named booleans). Removed `~/utils/async-array` references (doesn't exist here). Removed lodash references. Added note about Effect-TS patterns (`Effect.gen`, `pipe`, `Array` module).
- `ts-pattern` references kept — it's already a project dependency.

### 2. No Type Casting

- Source: `us-app-2/.cursor/rules/avoid-type-casting.mdc`
- Adaptation: Minimal changes. Kept all rules as-is. Removed verbose examples to keep CLAUDE.md concise.

### 3. Schema Patterns

- Source: `us-app-2/.cursor/rules/schema-patterns.mdc`
- Adaptation: Heavy rewrite. Replaced Zod-centric patterns with Effect Schema / oRPC contract patterns. Replaced locale/endpoint schema layers with this project's three-package structure (shared, backend, web). Core principle preserved: schemas are single source of truth, derive types from schemas.

### 4. Service Layer (Effect-TS)

- Source: `us-app-2/.cursor/rules/service-layer.mdc`
- Adaptation: Heavy rewrite. Replaced Prisma `$$` prefix conventions with Effect service patterns (`Context.Tag`, `Layer`). Replaced three-layer Prisma architecture with procedures/services/database split. Core principle preserved: thin route handlers, business logic in services.

### 5. shadcn/UI Read-Only

- Source: `us-app-2/.cursor/rules/shadcn-ui-readonly.mdc`
- Adaptation: Updated paths from `app/shadcn/components/shadcn-ui/` to `apps/web/src/components/ui/`. Removed the extensive wrapper table (project is small, doesn't need that yet). Kept core rule: never modify generated ui/ files, compose instead.

## Rules Excluded

- **Promises**: Not relevant — project uses Effect-TS, not raw Promises
- **TypeScript general**: Claude already follows these by default
- **React hooks**: Standard knowledge, no behavior change
- **Imports**: Standard knowledge
- **String formatting**: Standard knowledge
- **Refactoring**: Standard knowledge
- **No new files**: User deemed unnecessary
- **Function changes guard**: User deemed unnecessary
- **Dates**: No date handling in project yet
- **Database (Prisma-specific)**: Uses Drizzle, not applicable
- **Domain endpoints**: Prisma/Remix-specific patterns
- **UI form stack**: No complex forms yet
- **All domain-specific rules**: (color, column filters, address fields, etc.)

## Output

Single file: `CLAUDE.md` at project root. Includes project context (tech stack, structure, commands) followed by the 5 code rules.
