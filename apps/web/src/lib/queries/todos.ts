import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { IIn_D_listTodos } from "@repo/shared/todos";
import { orpc } from "~/lib/orpc";

// ── Query Options ──

export const QO_todosList = (input: IIn_D_listTodos = {}) =>
  orpc.todos.list.queryOptions({ input });

// ── Mutation Hooks ──

export function useCreateTodo() {
  const qc = useQueryClient();
  return useMutation({
    ...orpc.todos.create.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: orpc.todos.key() }),
  });
}

export function useToggleTodo() {
  const qc = useQueryClient();
  return useMutation({
    ...orpc.todos.toggle.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: orpc.todos.key() }),
  });
}

export function useDeleteTodo() {
  const qc = useQueryClient();
  return useMutation({
    ...orpc.todos.delete.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: orpc.todos.key() }),
  });
}
