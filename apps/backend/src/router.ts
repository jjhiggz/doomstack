import { D_listTodos, D_createTodo, D_toggleTodo, D_deleteTodo } from "./routes/todos";

export const R_todos = {
  list: D_listTodos,
  create: D_createTodo,
  toggle: D_toggleTodo,
  delete: D_deleteTodo,
};

export const R_root = {
  todos: R_todos,
};
