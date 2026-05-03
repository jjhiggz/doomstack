import type { IRow_Todo } from "@repo/shared/todos";
import { C_TodoItem } from "./C_TodoItem";

export function C_TodoList({ todos }: { todos: IRow_Todo[] }) {
  if (todos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No todos yet. Add one above!</p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-2">
      {todos.map((todo) => (
        <C_TodoItem key={todo.id} todo={todo} />
      ))}
    </div>
  );
}
