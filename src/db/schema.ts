import { sql } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users_table', {
	id: int().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	email: text().notNull().unique()
});

export const queries = sqliteTable('queries_table', {
	id: int().primaryKey({ autoIncrement: true }),
	query: text().notNull(),
	result: text().notNull(),
	timestamp: text().notNull(),
	userId: int().references(() => users.id, { onDelete: 'cascade' })
});

export const threads = sqliteTable('threads_table', {
	id: int().primaryKey({ autoIncrement: true }),
	queryId: int().references(() => queries.id, { onDelete: 'cascade' }),
	timestamp: text().notNull(),
	userId: int().references(() => users.id, { onDelete: 'cascade' })
});

export const projects = sqliteTable('projects_table', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text({ length: 255 }).notNull(),
  description: text({ length: 1000 }),
  banner: text({ length: 500 }),
  createdAt: int({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: int({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  userId: int().references(() => users.id, { onDelete: 'cascade' }).notNull()
});
