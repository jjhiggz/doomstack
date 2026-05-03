import { z } from "zod";
import { ORPCTaggedError } from "effect-orpc";

// ── Row Schema (matches T_todos exactly) ──

export const SRow_Todo = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  dueDate: z.coerce.date().nullable(),
});

export type IRow_Todo = z.infer<typeof SRow_Todo>;

// ── Filter Enums ──

export const S_completedFilter = z.enum(["all", "true", "false"]);
export const S_dueDateFilter = z.enum(["all", "has-date", "no-date", "overdue"]);
export const S_todoSortField = z.enum(["title", "createdAt", "completed", "dueDate"]);
export const S_sortOrder = z.enum(["asc", "desc"]);

// ── Endpoint Schemas ──

export const SIn_D_listTodos = z.object({
  search: z.string().optional(),
  completed: S_completedFilter.optional(),
  dueDate: S_dueDateFilter.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortField: S_todoSortField.optional(),
  sortOrder: S_sortOrder.optional(),
});
export const SOut_D_listTodos = z.object({
  todos: z.array(SRow_Todo),
});

export const SIn_D_createTodo = z.object({
  title: z.string().min(1).max(255),
  dueDate: z.coerce.date().nullable().optional(),
});
export const SOut_D_createTodo = SRow_Todo;

export const SIn_D_toggleTodo = z.object({
  id: z.string(),
});
export const SOut_D_toggleTodo = SRow_Todo;

export const SIn_D_deleteTodo = z.object({
  id: z.string(),
});
export const SOut_D_deleteTodo = z.object({
  success: z.literal(true),
});

// ── Inferred Types ──

export type IIn_D_listTodos = z.infer<typeof SIn_D_listTodos>;
export type IOut_D_listTodos = z.infer<typeof SOut_D_listTodos>;
export type IIn_D_createTodo = z.infer<typeof SIn_D_createTodo>;
export type IOut_D_createTodo = z.infer<typeof SOut_D_createTodo>;
export type IIn_D_toggleTodo = z.infer<typeof SIn_D_toggleTodo>;
export type IOut_D_toggleTodo = z.infer<typeof SOut_D_toggleTodo>;
export type IIn_D_deleteTodo = z.infer<typeof SIn_D_deleteTodo>;
export type IOut_D_deleteTodo = z.infer<typeof SOut_D_deleteTodo>;

// ── Error Classes ──

export class E_TodoNotFound extends ORPCTaggedError("E_TodoNotFound", {
  status: 404,
}) {}

export class E_TodoValidation extends ORPCTaggedError("E_TodoValidation", {
  status: 400,
}) {}

export class E_Database extends ORPCTaggedError("E_Database", {
  status: 500,
}) {}
