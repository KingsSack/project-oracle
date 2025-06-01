import { relations, sql } from 'drizzle-orm';
import { int, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users_table', {
	id: int().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	email: text().notNull().unique()
});

export const threads = sqliteTable('threads_table', {
	id: int().primaryKey({ autoIncrement: true }),
	timestamp: text().notNull(),
	userId: int().references(() => users.id, { onDelete: 'cascade' })
});

export const threadRelations = relations(threads, ({ many }) => ({
	queries: many(queries)
}));

export const queries = sqliteTable('queries_table', {
	id: int().primaryKey({ autoIncrement: true }),
	query: text().notNull(),
	result: text(),
	timestamp: text().notNull(),
	userId: int().references(() => users.id, { onDelete: 'cascade' }),
	threadId: int().references(() => threads.id, { onDelete: 'cascade' })
});

export const queryRelations = relations(queries, ({ one, many }) => ({
	thread: one(threads, {
		fields: [queries.threadId],
		references: [threads.id]
	}),
	tagsToQueries: many(tagsToQueries)
}));

export const tags = sqliteTable('tags_table', {
	id: int().primaryKey({ autoIncrement: true }),
	name: text({ length: 100 }).notNull().unique(),
	createdAt: int({ mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	userId: int().references(() => users.id, { onDelete: 'cascade' })
});

export const tagRelations = relations(tags, ({ many }) => ({
	tagsToQueries: many(tagsToQueries)
}));

export const tagsToQueries = sqliteTable(
	'query_tags_table',
	{
		queryId: int()
			.references(() => queries.id, { onDelete: 'cascade' })
			.notNull(),
		tagId: int()
			.references(() => tags.id, { onDelete: 'cascade' })
			.notNull()
	},
	(t) => [primaryKey({ columns: [t.tagId, t.queryId] })]
);

export const tagsToQueriesRelations = relations(tagsToQueries, ({ one }) => ({
	query: one(queries, {
		fields: [tagsToQueries.queryId],
		references: [queries.id]
	}),
	tag: one(tags, {
		fields: [tagsToQueries.tagId],
		references: [tags.id]
	})
}));

export const projects = sqliteTable('projects_table', {
	id: int().primaryKey({ autoIncrement: true }),
	name: text({ length: 255 }).notNull(),
	description: text({ length: 1000 }),
	banner: text({ length: 500 }),
	createdAt: int({ mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: int({ mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	userId: int()
		.references(() => users.id, { onDelete: 'cascade' })
		.notNull()
});
