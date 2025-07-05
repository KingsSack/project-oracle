import { relations, sql } from 'drizzle-orm';
import { check, int, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users_table', {
	id: int().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	email: text().notNull().unique()
});

export const models = sqliteTable(
	'models_table',
	{
		id: int().primaryKey({ autoIncrement: true }),
		model: text().notNull(),
		provider: text().notNull(),
		userId: int().references(() => users.id, { onDelete: 'cascade' })
	},
	(t) => [check('provider_check', sql`(${t.provider} IN ('googleai', 'openai', 'cohere'))`)]
);

export const modelGroups = sqliteTable('model_groups_table', {
	id: int().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	tagsModelId: int()
		.notNull()
		.references(() => models.id, { onDelete: 'cascade' }),
	responseModelId: int()
		.notNull()
		.references(() => models.id, { onDelete: 'cascade' }),
	followUpModelId: int()
		.notNull()
		.references(() => models.id, { onDelete: 'cascade' }),
	userId: int().references(() => users.id, { onDelete: 'cascade' })
});

export const modelGroupRelations = relations(modelGroups, ({ one }) => ({
	tagsModel: one(models, {
		fields: [modelGroups.tagsModelId],
		references: [models.id]
	}),
	responseModel: one(models, {
		fields: [modelGroups.responseModelId],
		references: [models.id]
	}),
	followUpModel: one(models, {
		fields: [modelGroups.followUpModelId],
		references: [models.id]
	})
}));

export const threads = sqliteTable('threads_table', {
	id: int().primaryKey({ autoIncrement: true }),
	title: text(),
	modelGroupsId: int()
		.notNull()
		.references(() => modelGroups.id, { onDelete: 'cascade' }),
	projectsId: int()
		.references(() => projects.id, { onDelete: 'cascade' }),
	timestamp: text().notNull(),
	userId: int().references(() => users.id, { onDelete: 'cascade' })
});

export const threadRelations = relations(threads, ({ one, many }) => ({
	modelGroups: one(modelGroups, {
		fields: [threads.modelGroupsId],
		references: [modelGroups.id]
	}),
	projects: one(projects, {
		fields: [threads.projectsId],
		references: [projects.id]
	}),
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
	tagsToQueries: many(tagsToQueries),
	toolCalls: many(toolCalls),
	followUps: many(followUps)
}));

export const toolCalls = sqliteTable('tool_calls_table', {
	id: int().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	input: text().notNull(), // JSON string
	output: text(), // JSON string, nullable since it might not be available immediately
	timestamp: text().notNull(),
	queryId: int()
		.references(() => queries.id, { onDelete: 'cascade' })
		.notNull()
});

export const toolCallRelations = relations(toolCalls, ({ one }) => ({
	query: one(queries, {
		fields: [toolCalls.queryId],
		references: [queries.id]
	})
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

export const followUps = sqliteTable('follow_ups_table', {
	id: int().primaryKey({ autoIncrement: true }),
	query: text().notNull(),
	createdAt: int({ mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	usersId: int().references(() => users.id, { onDelete: 'cascade' }),
	queryId: int()
		.references(() => queries.id, { onDelete: 'cascade' })
		.notNull()
});

export const followUpsRelations = relations(followUps, ({ one }) => ({
	query: one(queries, {
		fields: [followUps.queryId],
		references: [queries.id]
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
