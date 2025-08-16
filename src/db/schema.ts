import { query } from '$app/server';
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
	(t) => [
		check(
			'provider_check',
			sql`(${t.provider} IN ('openaicompat', 'googleai', 'openai', 'cohere', 'github'))`
		)
	]
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
	projectsId: int().references(() => projects.id, { onDelete: 'cascade' }),
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
	queries: many(queries),
	user: one(users, {
		fields: [threads.userId],
		references: [users.id]
	})
}));

export const queries = sqliteTable(
	'queries_table',
	{
		id: int().primaryKey({ autoIncrement: true }),
		type: text().notNull(),
		query: text().notNull(),
		result: text(),
		timestamp: text().notNull(),
		userId: int().references(() => users.id, { onDelete: 'cascade' }),
		threadId: int().references(() => threads.id, { onDelete: 'cascade' })
	},
	(t) => [check('type_check', sql`(${t.type} IN ('answer', 'research'))`)]
);

export const queryRelations = relations(queries, ({ one, many }) => ({
	thread: one(threads, {
		fields: [queries.threadId],
		references: [threads.id]
	}),
	user: one(users, {
		fields: [queries.userId],
		references: [users.id]
	}),
	tagsToQueries: many(tagsToQueries),
	steps: many(querySteps),
	sources: many(sources),
	followUps: many(followUps)
}));

export const querySteps = sqliteTable('query_steps_table', {
	id: int().primaryKey({ autoIncrement: true }),
	title: text().notNull(),
	content: text(),
	queryId: int()
		.references(() => queries.id, { onDelete: 'cascade' })
		.notNull()
});

export const queryStepsRelations = relations(querySteps, ({ one }) => ({
	query: one(queries, {
		fields: [querySteps.queryId],
		references: [queries.id]
	})
}));

export const sources = sqliteTable('sources_table', {
	id: int().primaryKey({ autoIncrement: true }),
	type: text().notNull(),
	title: text().notNull(),
	url: text().notNull(),
	content: text(),
	queryId: int()
		.references(() => queries.id, { onDelete: 'cascade' })
		.notNull()
});

export const sourcesRelations = relations(sources, ({ one }) => ({
	query: one(queries, {
		fields: [sources.queryId],
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

export const tagRelations = relations(tags, ({ one, many }) => ({
	user: one(users, {
		fields: [tags.userId],
		references: [users.id]
	}),
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

export const embeddings = sqliteTable('embeddings_table', {
	id: int().primaryKey({ autoIncrement: true }),
	embedding: text().notNull(),
	createdAt: int({ mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: int({ mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	userId: int().references(() => users.id, { onDelete: 'cascade' }),
	threadId: int()
		.references(() => threads.id, { onDelete: 'cascade' })
		.notNull()
});

export const embeddingRelations = relations(embeddings, ({ one }) => ({
	user: one(users, {
		fields: [embeddings.userId],
		references: [users.id]
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

export const projectRelations = relations(projects, ({ one, many }) => ({
	user: one(users, {
		fields: [projects.userId],
		references: [users.id]
	}),
	threads: many(threads)
}));
