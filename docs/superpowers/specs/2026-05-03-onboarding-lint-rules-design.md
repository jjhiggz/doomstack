# Onboarding & Lint Rule Enforcement

## Problem

A new developer cloning this template and opening Claude Code has no guidance on prerequisites or setup. Additionally, several CLAUDE.md code rules (no `as` casts, no imperative loops, no `let`, no direct query hooks) are advisory only — nothing prevents violations from shipping.

## Design

### First-Time Setup in CLAUDE.md

Add a "First-Time Setup" section near the top of the root `CLAUDE.md` (before Tech Stack). When someone asks Claude "how do I get started?" or "I just cloned this," it has the answer without needing to read the README.

Content:

```markdown
## First-Time Setup

Prerequisites: Node.js 18+, pnpm 10+, Docker

1. `pnpm install`
2. `docker compose up -d` (starts Postgres)
3. `pnpm -F @repo/backend db:push` (pushes schema to DB)
4. `pnpm dev` (starts all dev servers)

Optional: `pnpm seed filterable up` for demo data (login: user@user.com / password)
```

All dev tooling (fallow, oxlint, oxfmt, custom lint rules) is installed via `pnpm install` — no global installs required.

### Custom Lint Rules

Four new rules in `packages/lint-rules/src/rules/`, using the existing TypeScript AST-based runner (`runner.ts`). Each rule walks the AST and produces diagnostics. They run as part of `pnpm lint` (which is part of `pnpm check`).

#### Rule 1: `no-as-cast`

Flags any `as` type assertion.

**Allowed exceptions:**
- `as const` (narrows types, not a cast)
- `as HTML*` — any cast to a type starting with `HTML` (e.g., `as HTMLInputElement`, `as HTMLFormElement`). TypeScript structurally cannot infer DOM element types from `e.target`.

**Error message:** `Avoid type assertion with 'as'. Use a type guard, schema parse, or fix the types.`

**CLAUDE.md rule enforced:** Section 2 (No Type Casting)

#### Rule 2: `no-imperative-loops`

Flags `for` and `while` statements.

**Allowed exceptions:**
- `for...of` inside generator functions (needed for Effect `yield*` patterns where you iterate and yield effects)

**Error message:** `Use .map(), .filter(), .find(), or .reduce() instead of '<keyword>' loops.`

**CLAUDE.md rule enforced:** Section 1 (Declarative Programming — Loops)

#### Rule 3: `no-direct-query-hooks`

Flags direct calls to `useQuery(`, `useMutation(`, `useSuspenseQuery(` in files under `components/` or `routes/`. These hooks should only appear in `lib/queries/` files, wrapped as `QO_*` query options and `use*Entity` mutation hooks.

**Allowed locations:** Files whose path includes `lib/queries/`

**Error message:** `Use QO_* query options or use*Entity mutation hooks from ~/lib/queries/ instead.`

**CLAUDE.md rule enforced:** Frontend CLAUDE.md Query System section

#### Rule 4: `no-let`

Flags `let` variable declarations.

**Allowed exceptions:** None. Use `const` with ternary, `ts-pattern` match, or guard clauses.

**Error message:** `Use 'const' with ternary, ts-pattern match(), or guard clauses instead of 'let'.`

**CLAUDE.md rule enforced:** Section 1 (Declarative Programming — Conditional Logic)

### File Changes

**New files (8):**
- `packages/lint-rules/src/rules/no-as-cast.ts`
- `packages/lint-rules/src/rules/no-as-cast.test.ts`
- `packages/lint-rules/src/rules/no-imperative-loops.ts`
- `packages/lint-rules/src/rules/no-imperative-loops.test.ts`
- `packages/lint-rules/src/rules/no-direct-query-hooks.ts`
- `packages/lint-rules/src/rules/no-direct-query-hooks.test.ts`
- `packages/lint-rules/src/rules/no-let.ts`
- `packages/lint-rules/src/rules/no-let.test.ts`

**Modified files (2):**
- `packages/lint-rules/src/cli.ts` — register 4 new rules
- `CLAUDE.md` — add First-Time Setup section

### Existing Code Compliance

All existing code must pass the new rules. If current violations exist, they are fixed as part of implementation. If a violation is intentional (e.g., `let` in the lint runner itself), add an inline suppression comment.

### Testing

Each rule has a colocated test file following the existing `no-long-ternary.test.ts` pattern. Tests verify both detection (bad code produces diagnostics) and allowlisting (exceptions produce no diagnostics).
