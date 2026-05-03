import { Layer, ManagedRuntime } from "effect";
import { L_Database } from "./db.service";
import { L_TodosRepo } from "./todos/todos.service";

const MainLayer = L_TodosRepo.pipe(
  Layer.provide(L_Database("postgresql://postgres:postgres@localhost:5434/effect_orpc")),
);

export const RT_main = ManagedRuntime.make(MainLayer);
