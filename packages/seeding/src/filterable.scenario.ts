import { Effect } from "effect";
import type { IRow_Todo } from "@repo/shared/todos";
import { Svc_Database } from "@repo/backend/db.service";
import { F_createUser, type UserSeedOutput } from "./users.factory";
import { F_createTodo } from "./todos.factory";
import { truncateAll } from "./teardown";

export interface FilterableOutput {
  user: UserSeedOutput;
  todos: IRow_Todo[];
}

const TODOS: { title: string; completed: boolean; dueDate: Date | null; createdAt?: Date }[] = [
  // Completed + has due date (past — not overdue since completed)
  {
    title: "Set up project scaffolding",
    completed: true,
    dueDate: new Date("2026-01-15"),
    createdAt: new Date("2026-01-02"),
  },
  {
    title: "Configure CI/CD pipeline",
    completed: true,
    dueDate: new Date("2026-01-20"),
    createdAt: new Date("2026-01-05"),
  },
  {
    title: "Write unit tests for auth",
    completed: true,
    dueDate: new Date("2026-02-01"),
    createdAt: new Date("2026-01-10"),
  },
  {
    title: "Design database schema",
    completed: true,
    dueDate: new Date("2026-02-10"),
    createdAt: new Date("2026-01-12"),
  },
  {
    title: "Implement user registration",
    completed: true,
    dueDate: new Date("2026-02-15"),
    createdAt: new Date("2026-01-20"),
  },
  {
    title: "Add password reset flow",
    completed: true,
    dueDate: new Date("2026-02-28"),
    createdAt: new Date("2026-02-01"),
  },
  {
    title: "Create seed data script",
    completed: true,
    dueDate: new Date("2026-03-01"),
    createdAt: new Date("2026-02-10"),
  },
  {
    title: "Set up error monitoring",
    completed: true,
    dueDate: new Date("2026-03-10"),
    createdAt: new Date("2026-02-15"),
  },

  // Completed + no due date
  {
    title: "Research Effect-TS patterns",
    completed: true,
    dueDate: null,
    createdAt: new Date("2026-01-03"),
  },
  {
    title: "Evaluate UI component libraries",
    completed: true,
    dueDate: null,
    createdAt: new Date("2026-01-08"),
  },
  {
    title: "Set up linting rules",
    completed: true,
    dueDate: null,
    createdAt: new Date("2026-02-05"),
  },
  {
    title: "Document API conventions",
    completed: true,
    dueDate: null,
    createdAt: new Date("2026-02-20"),
  },

  // Active + overdue (due date in the past)
  {
    title: "Fix flaky integration test",
    completed: false,
    dueDate: new Date("2026-03-15"),
    createdAt: new Date("2026-03-01"),
  },
  {
    title: "Migrate legacy endpoints",
    completed: false,
    dueDate: new Date("2026-03-20"),
    createdAt: new Date("2026-03-05"),
  },
  {
    title: "Update onboarding docs",
    completed: false,
    dueDate: new Date("2026-04-01"),
    createdAt: new Date("2026-03-10"),
  },
  {
    title: "Resolve security audit findings",
    completed: false,
    dueDate: new Date("2026-04-10"),
    createdAt: new Date("2026-03-15"),
  },
  {
    title: "Refactor notification service",
    completed: false,
    dueDate: new Date("2026-04-15"),
    createdAt: new Date("2026-03-20"),
  },
  {
    title: "Optimize database queries",
    completed: false,
    dueDate: new Date("2026-04-20"),
    createdAt: new Date("2026-04-01"),
  },
  {
    title: "Add rate limiting middleware",
    completed: false,
    dueDate: new Date("2026-04-25"),
    createdAt: new Date("2026-04-05"),
  },
  {
    title: "Review accessibility compliance",
    completed: false,
    dueDate: new Date("2026-04-30"),
    createdAt: new Date("2026-04-10"),
  },

  // Active + future due date
  {
    title: "Build dashboard analytics page",
    completed: false,
    dueDate: new Date("2026-06-01"),
    createdAt: new Date("2026-04-15"),
  },
  {
    title: "Implement WebSocket notifications",
    completed: false,
    dueDate: new Date("2026-06-15"),
    createdAt: new Date("2026-04-18"),
  },
  {
    title: "Add export to CSV feature",
    completed: false,
    dueDate: new Date("2026-06-20"),
    createdAt: new Date("2026-04-20"),
  },
  {
    title: "Create user settings page",
    completed: false,
    dueDate: new Date("2026-07-01"),
    createdAt: new Date("2026-04-22"),
  },
  {
    title: "Implement dark mode toggle",
    completed: false,
    dueDate: new Date("2026-07-10"),
    createdAt: new Date("2026-04-25"),
  },
  {
    title: "Add keyboard shortcuts",
    completed: false,
    dueDate: new Date("2026-07-15"),
    createdAt: new Date("2026-04-28"),
  },
  {
    title: "Write end-to-end test suite",
    completed: false,
    dueDate: new Date("2026-08-01"),
    createdAt: new Date("2026-05-01"),
  },
  {
    title: "Set up staging environment",
    completed: false,
    dueDate: new Date("2026-08-15"),
    createdAt: new Date("2026-05-02"),
  },
  {
    title: "Plan Q3 roadmap",
    completed: false,
    dueDate: new Date("2026-09-01"),
    createdAt: new Date("2026-05-02"),
  },
  {
    title: "Integrate payment provider",
    completed: false,
    dueDate: new Date("2026-09-15"),
    createdAt: new Date("2026-05-02"),
  },

  // Active + no due date
  {
    title: "Explore caching strategies",
    completed: false,
    dueDate: null,
    createdAt: new Date("2026-03-01"),
  },
  {
    title: "Investigate memory leak in worker",
    completed: false,
    dueDate: null,
    createdAt: new Date("2026-03-10"),
  },
  {
    title: "Prototype mobile layout",
    completed: false,
    dueDate: null,
    createdAt: new Date("2026-03-25"),
  },
  {
    title: "Benchmark API response times",
    completed: false,
    dueDate: null,
    createdAt: new Date("2026-04-05"),
  },
  {
    title: "Spike on GraphQL federation",
    completed: false,
    dueDate: null,
    createdAt: new Date("2026-04-12"),
  },
  {
    title: "Clean up unused dependencies",
    completed: false,
    dueDate: null,
    createdAt: new Date("2026-04-18"),
  },
  {
    title: "Audit logging for admin actions",
    completed: false,
    dueDate: null,
    createdAt: new Date("2026-04-22"),
  },
  {
    title: "Research serverless deployment",
    completed: false,
    dueDate: null,
    createdAt: new Date("2026-04-28"),
  },
  {
    title: "Draft RFC for plugin system",
    completed: false,
    dueDate: null,
    createdAt: new Date("2026-05-01"),
  },
  {
    title: "Sketch data migration plan",
    completed: false,
    dueDate: null,
    createdAt: new Date("2026-05-02"),
  },
];

export const up: Effect.Effect<FilterableOutput, never, Svc_Database> = Effect.gen(function* () {
  const user = yield* F_createUser({
    email: "user@user.com",
    name: "Demo User",
    password: "password",
  });

  const todos = yield* Effect.all(TODOS.map((t) => F_createTodo({ userId: user.id, ...t })));

  return { user, todos };
});

export const down: Effect.Effect<void, never, Svc_Database> = truncateAll;
