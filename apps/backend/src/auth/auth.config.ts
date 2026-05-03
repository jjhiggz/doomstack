import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as authSchema from "../tables/auth.table";

const pool = new pg.Pool({
  connectionString: "postgresql://postgres:postgres@localhost:5434/effect_orpc",
});
const db = drizzle(pool, { schema: authSchema });

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: ["http://localhost:3000"],
});
