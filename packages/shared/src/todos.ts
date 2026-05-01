import { z } from "zod";
import { ORPCTaggedError } from "effect-orpc";

// ── Domain Object Schema ──

export const S_Todo = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  createdAt: z.coerce.date(),
});

export type I_Todo = z.infer<typeof S_Todo>;

// ── Endpoint Schemas ──

export const SIn_D_listTodos = z.object({
  filter: z.enum(["all", "active", "completed"]).optional(),
});
export const SOut_D_listTodos = z.object({
  todos: z.array(S_Todo),
});

export const SIn_D_createTodo = z.object({
  title: z.string().min(1).max(255),
});
export const SOut_D_createTodo = S_Todo;

export const SIn_D_toggleTodo = z.object({
  id: z.string(),
});
export const SOut_D_toggleTodo = S_Todo;

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
}) {
  readonly id!: string;
}

export class E_TodoValidation extends ORPCTaggedError("E_TodoValidation", {
  status: 400,
}) {
  readonly message!: string;
}

export class E_Database extends ORPCTaggedError("E_Database", {
  status: 500,
}) {
  readonly message!: string;
}
