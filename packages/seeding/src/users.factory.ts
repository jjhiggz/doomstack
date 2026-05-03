import { Effect } from "effect";
import { nanoid } from "nanoid";
import { hashPassword } from "better-auth/crypto";
import { Svc_Database } from "@repo/backend/db.service";
import * as authSchema from "@repo/backend/auth.table";

export interface UserSeedOpts {
  email?: string;
  name?: string;
  password?: string;
}

export interface UserSeedOutput {
  id: string;
  email: string;
  name: string;
}

export const F_createUser = (
  opts: UserSeedOpts = {},
): Effect.Effect<UserSeedOutput, never, Svc_Database> =>
  Effect.gen(function* () {
    const db = yield* Svc_Database;
    const id = nanoid();
    const email = opts.email ?? `seed-${id}@test.com`;
    const name = opts.name ?? "Seed User";
    const password = opts.password ?? "password123";
    const now = new Date();
    const hash = yield* Effect.promise(() => hashPassword(password));

    yield* Effect.promise(() =>
      db
        .insert(authSchema.user)
        .values({ id, email, name, emailVerified: false, createdAt: now, updatedAt: now }),
    );

    yield* Effect.promise(() =>
      db.insert(authSchema.account).values({
        id: nanoid(),
        accountId: id,
        providerId: "credential",
        userId: id,
        password: hash,
        createdAt: now,
        updatedAt: now,
      }),
    );

    return { id, email, name };
  });
