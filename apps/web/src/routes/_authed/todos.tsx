import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ORPCError } from "@orpc/client";
import { match, P } from "ts-pattern";
import { orpc } from "~/lib/orpc";
import { C_TodoList } from "~/components/C_TodoList";
import { C_TodoForm } from "~/components/C_TodoForm";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/_authed/todos")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(
      orpc.todos.list.queryOptions({ input: {} }),
    );
  },
  component: C_PageTodos,
});

function C_PageTodos() {
  const { session } = Route.useRouteContext();
  const { data, error } = useSuspenseQuery(
    orpc.todos.list.queryOptions({ input: {} }),
  );

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  if (error) {
    return match(error)
      .with(P.instanceOf(ORPCError), (e) =>
        match(e.code)
          .with("E_DATABASE", () => (
            <div>
              <h1>Database Error</h1>
              <p>{e.message}</p>
            </div>
          ))
          .otherwise(() => (
            <div>
              <h1>Something went wrong</h1>
              <p>{e.message}</p>
            </div>
          )),
      )
      .otherwise(() => (
        <div>
          <h1>Something went wrong</h1>
        </div>
      ));
  }

  return (
    <div>
      <header>
        <h1>Todos</h1>
        <span>{session.user.email}</span>
        <button onClick={handleLogout}>Logout</button>
      </header>
      <C_TodoForm />
      <C_TodoList todos={data.todos} />
    </div>
  );
}
