import { Layer, ManagedRuntime } from "effect";
import { L_Database } from "./db";
import { L_TodosRepo } from "./services/todos-repo";

const MainLayer = L_TodosRepo.pipe(
  Layer.provide(L_Database("./local.db"))
);

export const RT_main = ManagedRuntime.make(MainLayer);
