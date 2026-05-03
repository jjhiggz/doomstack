# Seeder System Design

## Problem

No way to quickly populate the database with realistic test data for local development or graybox testing. Manually creating users and todos through the UI is tedious and doesn't produce consistent, reproducible states.

## Decision

Scenario-based seeder system with composable data factories. Seeders are pure functions over a Drizzle DB connection — no authentication, no HTTP, no Effect runtime required. This makes them usable from:

- **CLI** — `pnpm seed basics up` for dev convenience
- **Integration tests** — call `up()`/`down()` directly in test setup/teardown
- **Admin UI** — expose scenario functions behind an authenticated endpoint (future)

## Architecture

```
testing/seeders/
  run.ts              — CLI entry point
  db.ts               — Drizzle connection + schema re-exports
  factories/
    users.ts          — F_createUser: creates user + account with hashed password
    todos.ts          — F_createTodo: creates a todo for a user
  scenarios/
    basics.ts         — dev basics: 1 user, 10 todos in mixed states
  .output/            — gitignored, persists scenario output for teardown
  README.md           — usage docs
```

### Layers

| Layer | Purpose | Example |
|-------|---------|---------|
| Factories | Create single records, return IDs | `F_createUser(db, { email, password })` |
| Scenarios | Compose factories into meaningful states | `basics.up(db)` → user + 10 todos |
| Runners | Thin entry points that call scenarios | CLI, test harness, admin API |

### User Creation

Users are created with properly hashed passwords via `better-auth/crypto`'s `hashPassword()` (scrypt). Seeded users can be logged into through the normal UI.

Each user gets entries in both the `user` table and the `account` table (with `providerId: "credential"`).

### Output Persistence

`up()` returns a typed output object containing all created record IDs. The CLI runner persists this to `.output/<scenario>.json`. `down()` receives this output and deletes records in reverse dependency order.

### Adding New Scenarios

1. Create `testing/seeders/scenarios/<name>.ts`
2. Export `up(db)` and `down(db, output)`
3. Run with `pnpm seed <name> up`

### Adding New Factories

1. Create or extend a file in `testing/seeders/factories/`
2. Export `F_create<Entity>(db, opts)` returning the created record
3. Use in scenarios
