import { SRow_Todo } from "./todos.schema";
import { makeStub } from "./utils/stub-builder";

export const ST_Todo = makeStub(SRow_Todo, {
  generators: {
    id: ({ index = 0 }) => `todo-${index + 1}`,
    title: ({ index = 0 }) => `Todo ${index + 1}`,
    completed: () => false,
    userId: () => "user-1",
    createdAt: () => new Date("2025-01-01T00:00:00Z"),
    dueDate: () => null,
  },
});
