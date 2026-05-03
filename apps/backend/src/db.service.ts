import { Context, Layer } from "effect";
import pg from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./tables/todos.table";

export type DrizzleDB = NodePgDatabase<typeof schema>;

export class Svc_Database extends Context.Tag("Svc_Database")<Svc_Database, DrizzleDB>() {}

export const L_Database = (connectionString: string) =>
  Layer.sync(Svc_Database, () => {
    const pool = new pg.Pool({ connectionString });
    return drizzle(pool, { schema });
  });
