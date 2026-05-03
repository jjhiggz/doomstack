import { makeEffectORPC } from "effect-orpc";
import { RT_main } from "../runtime";
import { os_withHeaders, MW_authed } from "../auth/auth.middleware";
import { Svc_TodosRepo } from "./todos.service";
import {
  SIn_D_listTodos,
  SOut_D_listTodos,
  SIn_D_createTodo,
  SOut_D_createTodo,
  SIn_D_toggleTodo,
  SOut_D_toggleTodo,
  SIn_D_deleteTodo,
  SOut_D_deleteTodo,
  E_Database,
  E_TodoNotFound,
  E_TodoValidation,
} from "@repo/shared/todos";

const authedEffectOs = makeEffectORPC(RT_main, os_withHeaders.use(MW_authed));

export const D_listTodos = authedEffectOs
  .errors({ E_Database })
  .input(SIn_D_listTodos)
  .output(SOut_D_listTodos)
  .effect(function* ({ input }) {
    const repo = yield* Svc_TodosRepo;
    const todos = yield* repo.list(input);
    return { todos };
  });

export const D_createTodo = authedEffectOs
  .errors({ E_TodoValidation, E_Database })
  .input(SIn_D_createTodo)
  .output(SOut_D_createTodo)
  .effect(function* ({ input, context }) {
    const repo = yield* Svc_TodosRepo;
    return yield* repo.create(input.title, context.session.user.id, input.dueDate);
  });

export const D_toggleTodo = authedEffectOs
  .errors({ E_TodoNotFound, E_Database })
  .input(SIn_D_toggleTodo)
  .output(SOut_D_toggleTodo)
  .effect(function* ({ input, context }) {
    const repo = yield* Svc_TodosRepo;
    return yield* repo.toggle(input.id, context.session.user.id);
  });

export const D_deleteTodo = authedEffectOs
  .errors({ E_TodoNotFound, E_Database })
  .input(SIn_D_deleteTodo)
  .output(SOut_D_deleteTodo)
  .effect(function* ({ input, context }) {
    const repo = yield* Svc_TodosRepo;
    yield* repo.delete(input.id, context.session.user.id);
    return { success: true };
  });
