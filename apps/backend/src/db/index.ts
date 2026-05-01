import { Context, Layer, Effect } from "effect";
import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type DrizzleDB = BetterSQLite3Database<typeof schema>;

export class Svc_Database extends Context.Tag("Svc_Database")<
  Svc_Database,
  DrizzleDB
>() {}

export const L_Database = (dbPath: string) =>
  Layer.sync(Svc_Database, () => {
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    return drizzle(sqlite, { schema });
  });
