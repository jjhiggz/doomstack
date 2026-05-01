import type { I_Todo } from "@repo/shared";
import { C_TodoItem } from "./C_TodoItem";

export function C_TodoList({ todos }: { todos: I_Todo[] }) {
  if (todos.length === 0) {
    return <p>No todos yet. Add one above!</p>;
  }

  return (
    <ul>
      {todos.map((todo) => (
        <C_TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}
