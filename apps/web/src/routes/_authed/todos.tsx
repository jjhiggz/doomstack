import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { zodValidator } from "@tanstack/zod-adapter";
import type { IRow_Todo, IIn_D_listTodos } from "@repo/shared/todos";
import { SIn_D_listTodos, S_completedFilter, S_dueDateFilter } from "@repo/shared/todos";
import { C_TodoForm } from "~/components/C_TodoForm";
import { C_DataTable } from "~/components/C_DataTable";
import { C_FilterText } from "~/components/C_FilterText";
import { C_FilterSelect } from "~/components/C_FilterSelect";
import { C_FilterDateRange } from "~/components/C_FilterDateRange";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { LogOut } from "lucide-react";
import { QO_todosList, useToggleTodo, useDeleteTodo } from "~/lib/queries/todos";

export const Route = createFileRoute("/_authed/todos")({
  validateSearch: zodValidator(SIn_D_listTodos),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(QO_todosList(deps)),
  component: C_PageTodos,
});

const completedLabels: Record<string, string> = {
  all: "All",
  true: "Completed",
  false: "Active",
};

const dueDateLabels: Record<string, string> = {
  all: "All",
  "has-date": "Has date",
  "no-date": "No date",
  overdue: "Overdue",
};

function DueDateCell({ value }: { value: Date | null }) {
  if (!value) return <span className="text-muted-foreground">-</span>;
  return <>{new Date(value).toLocaleDateString()}</>;
}

const columns: ColumnDef<IRow_Todo, unknown>[] = [
  {
    id: "completed",
    accessorKey: "completed",
    header: "Done",
    meta: { sortable: true },
    cell: ({ row }) => {
      const todo = row.original;
      return <TodoCheckbox todo={todo} />;
    },
  },
  {
    id: "title",
    accessorKey: "title",
    header: "Title",
    meta: { sortable: true },
  },
  {
    id: "dueDate",
    accessorKey: "dueDate",
    header: "Due Date",
    meta: { sortable: true },
    cell: ({ getValue }) => <DueDateCell value={getValue() as Date | null} />,
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Created",
    meta: { sortable: true },
    cell: ({ getValue }) => new Date(getValue() as Date).toLocaleDateString(),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <TodoDeleteButton todoId={row.original.id} />,
  },
];

function TodoCheckbox({ todo }: { todo: IRow_Todo }) {
  const toggleMutation = useToggleTodo();
  return (
    <Checkbox
      checked={todo.completed}
      onCheckedChange={() => toggleMutation.mutate({ id: todo.id })}
    />
  );
}

function TodoDeleteButton({ todoId }: { todoId: string }) {
  const deleteMutation = useDeleteTodo();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive"
      onClick={() => deleteMutation.mutate({ id: todoId })}
    >
      Delete
    </Button>
  );
}

function C_PageTodos() {
  const { session } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data } = useSuspenseQuery(QO_todosList(search));

  const updateSearch = useCallback(
    (updates: Partial<IIn_D_listTodos>) => {
      navigate({ search: (prev) => ({ ...prev, ...updates }) });
    },
    [navigate],
  );

  const handleSort = useCallback(
    (field: string) => {
      const isSameField = search.sortField === field;
      const nextOrder = isSameField && search.sortOrder === "asc" ? "desc" : "asc";
      updateSearch({ sortField: field as IIn_D_listTodos["sortField"], sortOrder: nextOrder });
    },
    [search.sortField, search.sortOrder, updateSearch],
  );

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <h1 className="text-lg font-semibold">Todos</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{session.user.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="size-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <C_TodoForm />
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <C_FilterText
            value={search.search}
            onChange={(v) => updateSearch({ search: v })}
            placeholder="Search todos..."
          />
          <C_FilterSelect
            value={search.completed}
            onChange={(v) => updateSearch({ completed: v as IIn_D_listTodos["completed"] })}
            options={S_completedFilter.options}
            labels={completedLabels}
            placeholder="Status"
          />
          <C_FilterSelect
            value={search.dueDate}
            onChange={(v) => updateSearch({ dueDate: v as IIn_D_listTodos["dueDate"] })}
            options={S_dueDateFilter.options}
            labels={dueDateLabels}
            placeholder="Due Date"
          />
          <C_FilterDateRange
            dateFrom={search.dateFrom?.toISOString().split("T")[0]}
            dateTo={search.dateTo?.toISOString().split("T")[0]}
            onDateFromChange={(v) => updateSearch({ dateFrom: v ? new Date(v) : undefined })}
            onDateToChange={(v) => updateSearch({ dateTo: v ? new Date(v) : undefined })}
          />
        </div>
        <div className="mt-4">
          <C_DataTable
            columns={columns}
            data={data.todos}
            sortField={search.sortField}
            sortOrder={search.sortOrder}
            onSort={handleSort}
          />
        </div>
      </main>
    </div>
  );
}
