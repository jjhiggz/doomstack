# Effect oRPC Todo App

A full-stack todo app built with Effect-TS, oRPC, Hono, Drizzle, TanStack Start, and React.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 10+
- [Docker](https://www.docker.com/) (for Postgres)

## Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Start Postgres
docker compose up -d

# 3. Push database schema
pnpm -F @repo/backend db:push

# 4. (Optional) Seed demo data
pnpm seed filterable up

# 5. Start dev servers
pnpm dev
```

The app is now running at:
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:3001

## Seed Accounts

| Scenario | Email | Password |
|----------|-------|----------|
| `basics` | `seed@test.com` | `password123` |
| `filterable` | `user@user.com` | `password` |

```bash
pnpm seed basics up        # 1 user + 10 todos
pnpm seed filterable up    # 1 user + 40 todos (varied filters)
pnpm seed <scenario> down  # Tear down
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run all dev servers |
| `pnpm build` | Build all packages |
| `pnpm check` | Format + lint + typecheck + dead code |
| `pnpm test` | Run all tests |
| `pnpm fmt` | Format all files |
| `pnpm lint` | Lint all files |
| `pnpm typecheck` | Typecheck all packages |
| `pnpm seed <scenario> <up\|down>` | Seed or tear down data |

## Project Structure

```
apps/
  backend/             Hono API server
    src/tables/        Drizzle table definitions
    src/todos/         Todo domain (routes, service, filters, tests)
    src/auth/          Auth config and middleware
  web/                 TanStack Start frontend (SSR + React)

packages/
  shared/              Shared schemas, types, and errors
  seeding/             Database seed scenarios and factories
  lint-rules/          Custom lint rules
```

## Tech Stack

- **Backend:** Effect-TS, oRPC, Hono, Drizzle (Postgres), better-auth
- **Frontend:** TanStack Start, React, TanStack Query, oRPC client
- **UI:** shadcn/ui (Base UI variant), Tailwind CSS v4
- **Tooling:** pnpm workspaces, Turborepo, Vitest, oxlint, oxfmt, Fallow
