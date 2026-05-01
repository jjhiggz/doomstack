import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ORPCError } from "@orpc/client";
import { match, P } from "ts-pattern";
import { orpc } from "~/lib/orpc";
import type { I_Todo } from "@repo/shared";

export function C_TodoItem({ todo }: { todo: I_Todo }) {
  const queryClient = useQueryClient();
  const listQueryKey = orpc.todos.list.queryOptions({ input: {} }).queryKey;

  const toggleMutation = useMutation({
    ...orpc.todos.toggle.mutationOptions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listQueryKey }),
  });

  const deleteMutation = useMutation({
    ...orpc.todos.delete.mutationOptions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listQueryKey }),
  });

  const error = toggleMutation.error ?? deleteMutation.error;

  return (
    <li>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => toggleMutation.mutate({ id: todo.id })}
        disabled={toggleMutation.isPending}
      />
      <span
        style={{ textDecoration: todo.completed ? "line-through" : "none" }}
      >
        {todo.title}
      </span>
      <button
        onClick={() => deleteMutation.mutate({ id: todo.id })}
        disabled={deleteMutation.isPending}
      >
        x
      </button>
      {error &&
        match(error)
          .with(
            P.instanceOf(ORPCError),
            (e) =>
              match(e.code)
                .with("E_TODO_NOT_FOUND", () => <span> Todo not found</span>)
                .with("E_DATABASE", () => (
                  <span> DB error: {e.message}</span>
                ))
                .otherwise(() => <span> Error: {e.message}</span>),
          )
          .otherwise(() => <span> Something went wrong</span>)}
    </li>
  );
}
