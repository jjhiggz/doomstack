import { Effect } from "effect";
import { sql } from "drizzle-orm";
import { Svc_Database } from "@repo/backend/db.service";

export const truncateAll: Effect.Effect<void, never, Svc_Database> = Effect.gen(function* () {
  const db = yield* Svc_Database;
  yield* Effect.promise(() =>
    db.execute(sql`TRUNCATE todos, account, "user", session, verification CASCADE`),
  );
});
