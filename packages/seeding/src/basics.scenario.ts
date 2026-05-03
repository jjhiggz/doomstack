import { Effect } from "effect";
import type { IRow_Todo } from "@repo/shared/todos";
import { Svc_Database } from "@repo/backend/db.service";
import { F_createUser, type UserSeedOutput } from "./users.factory";
import { F_createTodo } from "./todos.factory";
import { truncateAll } from "./teardown";

export interface BasicsOutput {
  user: UserSeedOutput;
  todos: IRow_Todo[];
}

const TODOS: { title: string; completed: boolean; dueDate: Date | null }[] = [
  { title: "Buy groceries", completed: true, dueDate: new Date("2026-05-10") },
  { title: "Read Effect documentation", completed: false, dueDate: null },
  { title: "Set up CI pipeline", completed: true, dueDate: new Date("2026-04-01") },
  { title: "Write integration tests", completed: false, dueDate: new Date("2026-06-15") },
  { title: "Review pull request", completed: false, dueDate: null },
  { title: "Update dependencies", completed: true, dueDate: new Date("2026-03-20") },
  { title: "Fix login redirect bug", completed: false, dueDate: new Date("2026-05-01") },
  { title: "Deploy to staging", completed: false, dueDate: null },
  { title: "Write API documentation", completed: true, dueDate: new Date("2026-07-01") },
  { title: "Plan sprint retrospective", completed: false, dueDate: new Date("2026-05-05") },
];

export const up: Effect.Effect<BasicsOutput, never, Svc_Database> = Effect.gen(function* () {
  const user = yield* F_createUser({
    email: "seed@test.com",
    name: "Seed User",
    password: "password123",
  });

  const todos = yield* Effect.all(TODOS.map((t) => F_createTodo({ userId: user.id, ...t })));

  return { user, todos };
});

export const down: Effect.Effect<void, never, Svc_Database> = truncateAll;
