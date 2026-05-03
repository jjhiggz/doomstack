import { Effect } from "effect";
import { nanoid } from "nanoid";
import { Svc_Database } from "@repo/backend/db.service";
import { T_todos } from "@repo/backend/todos.table";
import type { IRow_Todo } from "@repo/shared/todos";
import { ST_Todo } from "@repo/shared/todos.stub";

type TodoSeedOpts = Parameters<typeof ST_Todo.one>[0] & { userId: string };

export type { TodoSeedOpts };

export const F_createTodo = (opts: TodoSeedOpts): Effect.Effect<IRow_Todo, never, Svc_Database> =>
  Effect.gen(function* () {
    const db = yield* Svc_Database;
    const { userId, ...overrides } = opts;
    const stub = ST_Todo.one({ id: nanoid(), userId, ...overrides });

    yield* Effect.promise(() =>
      db.insert(T_todos).values({
        id: stub.id,
        title: stub.title,
        completed: stub.completed,
        userId: stub.userId,
        createdAt: stub.createdAt,
        dueDate: stub.dueDate,
      }),
    );

    return stub;
  });
