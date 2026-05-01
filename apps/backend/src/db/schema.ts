import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const T_todos = sqliteTable("todos", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  userId: text("user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type Row_Todo = typeof T_todos.$inferSelect;
export type RowInsert_Todo = typeof T_todos.$inferInsert;
