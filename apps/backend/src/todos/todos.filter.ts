import { eq, and, ilike, isNull, isNotNull, lt, gte, lte, between, asc, desc } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { match, P } from "ts-pattern";
import type { IIn_D_listTodos } from "@repo/shared/todos";
import { T_todos } from "../tables/todos.table";

export function buildCompletedFilter(value: IIn_D_listTodos["completed"]): SQL | undefined {
  return match(value)
    .with("true", () => eq(T_todos.completed, true))
    .with("false", () => eq(T_todos.completed, false))
    .otherwise(() => undefined);
}

export function buildDueDateFilter(value: IIn_D_listTodos["dueDate"]): SQL | undefined {
  return match(value)
    .with("no-date", () => isNull(T_todos.dueDate))
    .with("has-date", () => isNotNull(T_todos.dueDate))
    .with("overdue", () => and(isNotNull(T_todos.dueDate), lt(T_todos.dueDate, new Date())))
    .otherwise(() => undefined);
}

export function buildDateRangeFilter(
  dateFrom: IIn_D_listTodos["dateFrom"],
  dateTo: IIn_D_listTodos["dateTo"],
): SQL | undefined {
  return match({ dateFrom, dateTo })
    .with({ dateFrom: P.nonNullable, dateTo: P.nonNullable }, ({ dateFrom, dateTo }) =>
      between(T_todos.createdAt, dateFrom, dateTo),
    )
    .with({ dateFrom: P.nonNullable }, ({ dateFrom }) => gte(T_todos.createdAt, dateFrom))
    .with({ dateTo: P.nonNullable }, ({ dateTo }) => lte(T_todos.createdAt, dateTo))
    .otherwise(() => undefined);
}

export function buildSearchFilter(search: IIn_D_listTodos["search"]): SQL | undefined {
  return match(search?.trim())
    .with(P.string.minLength(1), (search) => {
      const words = search.split(/\s+/);
      return and(...words.map((w) => ilike(T_todos.title, `%${w}%`)));
    })
    .otherwise(() => undefined);
}

export function buildSortClause(
  sortField: IIn_D_listTodos["sortField"],
  sortOrder: IIn_D_listTodos["sortOrder"],
): SQL {
  return match({ field: sortField, order: sortOrder })
    .with({ field: "title", order: "asc" }, () => asc(T_todos.title))
    .with({ field: "title", order: "desc" }, () => desc(T_todos.title))
    .with({ field: "createdAt", order: "asc" }, () => asc(T_todos.createdAt))
    .with({ field: "createdAt", order: "desc" }, () => desc(T_todos.createdAt))
    .with({ field: "completed", order: "asc" }, () => asc(T_todos.completed))
    .with({ field: "completed", order: "desc" }, () => desc(T_todos.completed))
    .with({ field: "dueDate", order: "asc" }, () => asc(T_todos.dueDate))
    .with({ field: "dueDate", order: "desc" }, () => desc(T_todos.dueDate))
    .otherwise(() => desc(T_todos.createdAt));
}
