import { error, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/db.server';
import { threads } from '../../../db/schema';

export async function load({ params: { id } }) {
	try {
		const thread = await db.query.threads.findFirst({
			where: eq(threads.id, parseInt(id)),
			columns: {
				id: false,
				timestamp: false,
				userId: false	
			},
			with: {
				queries: {
					columns: {
						query: true,
						result: true
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
						}
					}
				}
			}
		});

		if (!thread) {
			error(404, 'Thread not found');
		}

		if (!thread.queries || thread.queries.length === 0) {
			error(404, 'No queries found for this thread');
		}

		return {
			name: thread.queries[0].query,
			result: thread.queries[0].result,
			tags: thread.queries[0].tagsToQueries.map((tagToQuery) => ({
				name: tagToQuery.tag.name
			}))
		};
	} catch (error) {
		throw fail(404);
	}
}
