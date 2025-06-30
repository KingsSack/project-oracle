import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/db.server';
import { followUps, queries } from '../../../db/schema';

export const actions = {
	'follow-up': async ({ request }) => {
		const data = await request.formData();

		const userQuery = data.get('query');
		const threadId = data.get('threadId');
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

		try {
			await db.delete(followUps).where(eq(followUps.queryId, parseInt(queryId.toString())));

			const queryData = await db
				.insert(queries)
				.values({
					query: userQuery.toString(),
					timestamp: new Date().toISOString(),
					threadId: parseInt(threadId.toString())
				})
				.returning({
					id: queries.id
				});

			throw redirect(303, `/query/${queryData[0].id}`);
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

export async function load({ params: { id } }) {
	try {
		const query = await db.query.queries.findFirst({
			where: eq(queries.id, parseInt(id)),
			columns: {
				id: true,
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
				toolCalls: {
					columns: {
						name: true,
						input: true,
						output: true
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
			queries: queriesData
		};
	} catch (error) {
		throw fail(404);
	}
}
