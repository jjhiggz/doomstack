import { describe, it, expect, beforeAll } from "vitest";
import { Effect, Layer, ManagedRuntime } from "effect";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import * as schema from "../db/schema";
import { Svc_Database, type DrizzleDB } from "../db";
import { Svc_TodosRepo, L_TodosRepo } from "../services/todos-repo";
import { E_TodoNotFound } from "@repo/shared";

function makeTestRuntime() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });

  // Create tables in memory
  db.run(sql`CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`);

  const L_TestDatabase = Layer.succeed(Svc_Database, db);
  const TestLayer = Layer.provideMerge(L_TodosRepo, L_TestDatabase);
  return ManagedRuntime.make(TestLayer);
}

describe("Svc_TodosRepo", () => {
  let runtime: ReturnType<typeof makeTestRuntime>;

  beforeAll(() => {
    runtime = makeTestRuntime();
  });

  it("creates a todo and lists it", async () => {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        const created = yield* repo.create("Test todo", "user-1");
        const listed = yield* repo.list();
        return { created, listed };
      })
    );

    expect(result.created.title).toBe("Test todo");
    expect(result.created.completed).toBe(false);
    expect(result.listed).toHaveLength(1);
    expect(result.listed[0].id).toBe(result.created.id);
  });

  it("toggles a todo", async () => {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        const created = yield* repo.create("Toggle me", "user-1");
        const toggled = yield* repo.toggle(created.id, "user-1");
        return toggled;
      })
    );

    expect(result.completed).toBe(true);
  });

  it("deletes a todo", async () => {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        const created = yield* repo.create("Delete me", "user-1");
        yield* repo.delete(created.id, "user-1");
        const listed = yield* repo.list();
        const found = listed.find((t) => t.id === created.id);
        return found;
      })
    );

    expect(result).toBeUndefined();
  });

  it("fails with E_TodoNotFound when toggling nonexistent todo", async () => {
    const result = await runtime.runPromiseExit(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        return yield* repo.toggle("nonexistent-id", "user-1");
      })
    );

    expect(result._tag).toBe("Failure");
  });

  it("filters by active/completed", async () => {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const repo = yield* Svc_TodosRepo;
        const t1 = yield* repo.create("Active todo", "user-2");
        const t2 = yield* repo.create("Completed todo", "user-2");
        yield* repo.toggle(t2.id, "user-2");

        const active = yield* repo.list("active");
        const completed = yield* repo.list("completed");
        return { active, completed };
      })
    );

    expect(result.active.some((t) => t.title === "Active todo")).toBe(true);
    expect(result.active.some((t) => t.title === "Completed todo")).toBe(false);
    expect(result.completed.some((t) => t.title === "Completed todo")).toBe(true);
  });
});
