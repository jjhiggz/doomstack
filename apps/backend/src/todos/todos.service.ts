import { Context, Effect, Layer } from "effect";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { IRow_Todo, IIn_D_listTodos } from "@repo/shared/todos";
import { E_TodoNotFound, E_Database } from "@repo/shared/todos";
import { Svc_Database } from "../db.service";
import { T_todos } from "../tables/todos.table";
import {
  buildCompletedFilter,
  buildDueDateFilter,
  buildDateRangeFilter,
  buildSearchFilter,
  buildSortClause,
} from "./todos.filter";

export class Svc_TodosRepo extends Context.Tag("Svc_TodosRepo")<
  Svc_TodosRepo,
  {
    list: (input: IIn_D_listTodos) => Effect.Effect<IRow_Todo[], E_Database>;
    create: (
      title: string,
      userId: string,
      dueDate?: Date | null,
    ) => Effect.Effect<IRow_Todo, E_Database>;
    toggle: (id: string, userId: string) => Effect.Effect<IRow_Todo, E_TodoNotFound | E_Database>;
    delete: (id: string, userId: string) => Effect.Effect<void, E_TodoNotFound | E_Database>;
  }
>() {}

export const L_TodosRepo = Layer.effect(
  Svc_TodosRepo,
  Effect.gen(function* () {
    const db = yield* Svc_Database;

    return {
      list: (input) =>
        Effect.tryPromise({
          try: async () => {
            const completedWhere = buildCompletedFilter(input.completed);
            const dueDateWhere = buildDueDateFilter(input.dueDate);
            const dateWhere = buildDateRangeFilter(input.dateFrom, input.dateTo);
            const searchWhere = buildSearchFilter(input.search);
            const sortClause = buildSortClause(input.sortField, input.sortOrder);

            const rows = await db
              .select()
              .from(T_todos)
              .where(and(completedWhere, dueDateWhere, dateWhere, searchWhere))
              .orderBy(sortClause);

            return rows;
          },
          catch: (error) => new E_Database({ message: `${error}` }),
        }),

      create: (title, userId, dueDate) =>
        Effect.tryPromise({
          try: async () => {
            const id = nanoid();
            const now = new Date();
            await db.insert(T_todos).values({
              id,
              title,
              completed: false,
              userId,
              createdAt: now,
              dueDate: dueDate ?? null,
            });
            return {
              id,
              title,
              completed: false,
              userId,
              createdAt: now,
              dueDate: dueDate ?? null,
            };
          },
          catch: (error) => new E_Database({ message: `${error}` }),
        }),

      toggle: (id, userId) =>
        Effect.gen(function* () {
          const rows = yield* Effect.tryPromise({
            try: () =>
              db
                .select()
                .from(T_todos)
                .where(and(eq(T_todos.id, id), eq(T_todos.userId, userId))),
            catch: (error) => new E_Database({ message: `${error}` }),
          });

          const existing = rows[0];
          if (!existing) {
            return yield* Effect.fail(new E_TodoNotFound({ message: `Todo ${id} not found` }));
          }

          const newCompleted = !existing.completed;
          yield* Effect.tryPromise({
            try: () =>
              db.update(T_todos).set({ completed: newCompleted }).where(eq(T_todos.id, id)),
            catch: (error) => new E_Database({ message: `${error}` }),
          });

          return { ...existing, completed: newCompleted };
        }),

      delete: (id, userId) =>
        Effect.gen(function* () {
          const rows = yield* Effect.tryPromise({
            try: () =>
              db
                .select()
                .from(T_todos)
                .where(and(eq(T_todos.id, id), eq(T_todos.userId, userId))),
            catch: (error) => new E_Database({ message: `${error}` }),
          });

          const existing = rows[0];
          if (!existing) {
            return yield* Effect.fail(new E_TodoNotFound({ message: `Todo ${id} not found` }));
          }

          yield* Effect.tryPromise({
            try: () => db.delete(T_todos).where(eq(T_todos.id, id)),
            catch: (error) => new E_Database({ message: `${error}` }),
          });
        }),
    };
  }),
);
