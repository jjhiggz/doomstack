import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const T_todos = pgTable("todos", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull(),
  dueDate: timestamp("due_date"),
});

export type Row_Todo = typeof T_todos.$inferSelect;
export type RowInsert_Todo = typeof T_todos.$inferInsert;
