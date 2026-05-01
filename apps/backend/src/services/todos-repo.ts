import { Context, Effect, Layer } from "effect";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { I_Todo } from "@repo/shared";
import { E_TodoNotFound, E_Database } from "@repo/shared";
import { Svc_Database } from "../db";
import { T_todos } from "../db/schema";

export class Svc_TodosRepo extends Context.Tag("Svc_TodosRepo")<
  Svc_TodosRepo,
  {
    list: (filter?: string) => Effect.Effect<I_Todo[], E_Database>;
    create: (
      title: string,
      userId: string
    ) => Effect.Effect<I_Todo, E_Database>;
    toggle: (
      id: string,
      userId: string
    ) => Effect.Effect<I_Todo, E_TodoNotFound | E_Database>;
    delete: (
      id: string,
      userId: string
    ) => Effect.Effect<void, E_TodoNotFound | E_Database>;
  }
>() {}

function rowToTodo(row: typeof T_todos.$inferSelect): I_Todo {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed,
    createdAt: row.createdAt,
  };
}

export const L_TodosRepo = Layer.effect(
  Svc_TodosRepo,
  Effect.gen(function* () {
    const db = yield* Svc_Database;

    return {
      list: (filter) =>
        Effect.try({
          try: () => {
            let query = db.select().from(T_todos);
            if (filter === "active") {
              query = query.where(eq(T_todos.completed, false));
            } else if (filter === "completed") {
              query = query.where(eq(T_todos.completed, true));
            }
            return query.all().map(rowToTodo);
          },
          catch: (error) =>
            new E_Database({ message: String(error) }),
        }),

      create: (title, userId) =>
        Effect.try({
          try: () => {
            const id = nanoid();
            const now = new Date();
            db.insert(T_todos)
              .values({ id, title, completed: false, userId, createdAt: now })
              .run();
            return { id, title, completed: false, createdAt: now };
          },
          catch: (error) =>
            new E_Database({ message: String(error) }),
        }),

      toggle: (id, userId) =>
        Effect.gen(function* () {
          const existing = yield* Effect.try({
            try: () =>
              db
                .select()
                .from(T_todos)
                .where(and(eq(T_todos.id, id), eq(T_todos.userId, userId)))
                .get(),
            catch: (error) =>
              new E_Database({ message: String(error) }),
          });

          if (!existing) {
            return yield* Effect.fail(new E_TodoNotFound({ id }));
          }

          const newCompleted = !existing.completed;
          yield* Effect.try({
            try: () =>
              db
                .update(T_todos)
                .set({ completed: newCompleted })
                .where(eq(T_todos.id, id))
                .run(),
            catch: (error) =>
              new E_Database({ message: String(error) }),
          });

          return rowToTodo({ ...existing, completed: newCompleted });
        }),

      delete: (id, userId) =>
        Effect.gen(function* () {
          const existing = yield* Effect.try({
            try: () =>
              db
                .select()
                .from(T_todos)
                .where(and(eq(T_todos.id, id), eq(T_todos.userId, userId)))
                .get(),
            catch: (error) =>
              new E_Database({ message: String(error) }),
          });

          if (!existing) {
            return yield* Effect.fail(new E_TodoNotFound({ id }));
          }

          yield* Effect.try({
            try: () => db.delete(T_todos).where(eq(T_todos.id, id)).run(),
            catch: (error) =>
              new E_Database({ message: String(error) }),
          });
        }),
    };
  })
);
