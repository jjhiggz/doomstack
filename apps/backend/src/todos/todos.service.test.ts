import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Effect, Layer, ManagedRuntime } from "effect";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../tables/todos.table";
import { Svc_Database } from "../db.service";
import { Svc_TodosRepo, L_TodosRepo } from "./todos.service";

const CONNECTION_STRING = "postgresql://postgres:postgres@localhost:5434/effect_orpc";

const state = (() => {
  const pool = new pg.Pool({ connectionString: CONNECTION_STRING });
  const db = drizzle(pool, { schema });

  const L_TestDatabase = Layer.succeed(Svc_Database, db);
  const TestLayer = Layer.provideMerge(L_TodosRepo, L_TestDatabase);
  const runtime = ManagedRuntime.make(TestLayer);

  return { pool, runtime };
})();

beforeAll(async () => {
  await state.pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT false,
      user_id TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL,
      due_date TIMESTAMP
    )
  `);
  await state.pool.query(`DELETE FROM todos`);
});

afterAll(async () => {
  await state.pool.query(`DELETE FROM todos`);
  await state.pool.end();
});

describe("Svc_TodosRepo", () => {
  it("creates a todo and lists it", async () => {
    const result = await state.runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        const created = yield* repo.create("Test todo", "user-1");
        const listed = yield* repo.list({});
        return { created, listed };
      }),
    );

    expect(result.created.title).toBe("Test todo");
    expect(result.created.completed).toBe(false);
    expect(result.created.dueDate).toBeNull();
    expect(result.listed.length).toBeGreaterThanOrEqual(1);
    expect(result.listed).toContainEqual(expect.objectContaining({ id: result.created.id }));
  });

  it("creates a todo with dueDate", async () => {
    const dueDate = new Date("2026-06-15T00:00:00Z");
    const result = await state.runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        return yield* repo.create("Due date todo", "user-1", dueDate);
      }),
    );

    expect(result.dueDate).toEqual(dueDate);
  });

  it("toggles a todo", async () => {
    const result = await state.runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        const created = yield* repo.create("Toggle me", "user-1");
        const toggled = yield* repo.toggle(created.id, "user-1");
        return toggled;
      }),
    );

    expect(result.completed).toBe(true);
  });

  it("deletes a todo", async () => {
    const result = await state.runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        const created = yield* repo.create("Delete me", "user-1");
        yield* repo.delete(created.id, "user-1");
        const listed = yield* repo.list({});
        const found = listed.find((t) => t.id === created.id);
        return found;
      }),
    );

    expect(result).toBeUndefined();
  });

  it("fails with E_TodoNotFound when toggling nonexistent todo", async () => {
    const result = await state.runtime.runPromiseExit(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        return yield* repo.toggle("nonexistent-id", "user-1");
      }),
    );

    expect(result._tag).toBe("Failure");
  });

  it("filters by completed status", async () => {
    await state.pool.query(`DELETE FROM todos`);

    const result = await state.runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        yield* repo.create("Active todo", "user-2");
        const t2 = yield* repo.create("Completed todo", "user-2");
        yield* repo.toggle(t2.id, "user-2");

        const active = yield* repo.list({ completed: "false" });
        const completed = yield* repo.list({ completed: "true" });
        return { active, completed };
      }),
    );

    expect(result.active.some((t) => t.title === "Active todo")).toBe(true);
    expect(result.active.some((t) => t.title === "Completed todo")).toBe(false);
    expect(result.completed.some((t) => t.title === "Completed todo")).toBe(true);
  });

  it("filters by dueDate presence", async () => {
    await state.pool.query(`DELETE FROM todos`);

    const result = await state.runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        yield* repo.create("No due date", "user-3");
        yield* repo.create("Has due date", "user-3", new Date("2026-12-01"));

        const noDates = yield* repo.list({ dueDate: "no-date" });
        const hasDates = yield* repo.list({ dueDate: "has-date" });
        return { noDates, hasDates };
      }),
    );

    expect(result.noDates.every((t) => t.dueDate === null)).toBe(true);
    expect(result.hasDates.every((t) => t.dueDate !== null)).toBe(true);
  });

  it("searches by title", async () => {
    await state.pool.query(`DELETE FROM todos`);

    const result = await state.runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        yield* repo.create("Buy groceries", "user-4");
        yield* repo.create("Read a book", "user-4");
        yield* repo.create("Buy milk", "user-4");

        return yield* repo.list({ search: "buy" });
      }),
    );

    expect(result).toHaveLength(2);
    expect(result.every((t) => t.title.toLowerCase().includes("buy"))).toBe(true);
  });

  it("sorts by title ascending", async () => {
    await state.pool.query(`DELETE FROM todos`);

    const result = await state.runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        yield* repo.create("Charlie", "user-5");
        yield* repo.create("Alpha", "user-5");
        yield* repo.create("Bravo", "user-5");

        return yield* repo.list({ sortField: "title", sortOrder: "asc" });
      }),
    );

    expect(result.map((t) => t.title)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });
});
