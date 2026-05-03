import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: ["./src/tables/todos.table.ts", "./src/tables/auth.table.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://postgres:postgres@localhost:5434/effect_orpc",
  },
});
