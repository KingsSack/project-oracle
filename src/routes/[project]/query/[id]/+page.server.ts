import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '../../../../db/db.server';
import { followUps, projects, queries, threads } from '../../../../db/schema';

export const actions = {
	'follow-up': async ({ request }) => {
		const data = await request.formData();

		const project = data.get('project') || 'Default';
		const userQuery = data.get('query');
		let threadId = data.get('threadId');
		const queryId = data.get('queryId');

		if (!userQuery) {
			return fail(400, {
				error: 'No query provided'
			});
		}

		if (!threadId || isNaN(parseInt(threadId.toString()))) {
			return fail(400, {
				error: 'Invalid thread ID'
			});
		}

		if (!queryId || isNaN(parseInt(queryId.toString()))) {
			return fail(400, {
				error: 'Invalid query ID'
			});
		}

		const isNewThread = data.get('createNewThread') === 'true' || false;

		try {
			await db.delete(followUps).where(eq(followUps.queryId, parseInt(queryId.toString())));

			if (isNewThread) {
				const currentThreadData = await db
					.select({
						modelGroupsId: threads.modelGroupsId,
						projectsId: threads.projectsId
					})
					.from(threads)
					.where(eq(threads.id, parseInt(threadId.toString())))
					.limit(1);
				
				if (currentThreadData.length === 0) {
					return fail(404, {
						error: 'Original thread not found'
					});
				}

				const { modelGroupsId, projectsId } = currentThreadData[0];

				const newThreadData = await db
					.insert(threads)
					.values({
						modelGroupsId: modelGroupsId,
						projectsId: projectsId,
						timestamp: new Date().toISOString()
					})
					.returning({ id: threads.id });
				
				threadId = newThreadData[0].id.toString();
			}

			const queryData = await db
				.insert(queries)
				.values({
					type: 'answer',
					query: userQuery.toString(),
					timestamp: new Date().toISOString(),
					threadId: parseInt(threadId.toString())
				})
				.returning({
					id: queries.id
				});

			throw redirect(303, `/${project.toString().toLowerCase()}/query/${queryData[0].id}`);
		} catch (error) {
			if (error && typeof error === 'object' && 'status' in error && error.status === 303) {
				throw error;
			}

			return fail(422, {
				description: userQuery,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}
};

export async function load({ params: { id }, parent }) {
	try {
		const parentData = await parent();

		const currentProject = parentData.selectedProject || 'Default';

		const query = await db.query.queries.findFirst({
			where: eq(queries.id, parseInt(id)),
			columns: {
				id: true,
				type: true,
				query: true,
				result: true,
				threadId: true
			},
			with: {
				tagsToQueries: {
					columns: {
						queryId: false,
						tagId: false
					},
					with: {
						tag: {
							columns: {
								name: true
							}
						}
					}
				},
				steps: {
					columns: {
						queryId: false
					}
				},
				sources: {
					columns: {
						queryId: false
					}
				},
				followUps: {
					columns: {
						query: true
					}
				}
			}
		});

		if (!query) {
			throw error(404, 'Query not found');
		}

		if (!query.threadId) {
			throw error(404, 'Thread not found for this query');
		}

		const queriesData = await db.query.queries.findMany({
			where: eq(queries.threadId, query.threadId),
			columns: {
				id: true,
				query: true
			}
		});

		if (!queriesData || queriesData.length === 0) {
			throw error(404, 'No queries found for this thread');
		}

		return {
			query: query,
			queries: queriesData,
			currentProject: currentProject
		};
	} catch (error) {
		throw fail(404);
	}
}
