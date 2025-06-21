import { eq, and } from 'drizzle-orm';
import { db } from '../../../../db/db.server';
import { tags, tagsToQueries, threads } from '../../../../db/schema';
import { generateTagsFlow } from '$lib/ai/tags';

export async function GET({ params: { id } }) {
	const thread = await db.query.threads.findFirst({
		where: eq(threads.id, parseInt(id)),
		with: {
			modelGroups: {
				columns: {
					tagsModel: true
				}
			},
			queries: {
				with: {
					tagsToQueries: {
						with: {
							tag: true
						}
					}
				}
			}
		}
	});

	if (!thread) {
		return new Response('Thread not found', { status: 404 });
	}

	const query = thread.queries[0];
	const queryTags = thread.queries[0].tagsToQueries;

	return new Response(
		new ReadableStream({
			async start(controller) {
				if (queryTags.length > 0) {
					controller.enqueue(
						`data: ${JSON.stringify({ type: 'complete', content: queryTags })}\n\n`
					);
					controller.close();
					return;
				}

				try {
					const response = generateTagsFlow.stream({
						model: thread.modelGroups.tagsModel,
						query: query.query.toString()
					});

					for await (const chunk of response.stream) {
						controller.enqueue(
							`data: ${JSON.stringify({ type: 'chunk', content: chunk.tags })}\n\n`
						);
					}

					const output = await response.output;

					controller.enqueue(
						`data: ${JSON.stringify({ type: 'complete', content: output.tags })}\n\n`
					);

					for (const tag of output.tags) {
						try {
							// First, try to find existing tag
							let existingTag = await db.query.tags.findFirst({
								where: eq(tags.name, tag.name)
							});

							let tagId;
							if (existingTag) {
								tagId = existingTag.id;
							} else {
								// Create new tag if it doesn't exist
								const [newTag] = await db
									.insert(tags)
									.values({ name: tag.name })
									.returning({ id: tags.id });
								tagId = newTag.id;
							}

							// Check if the tag is already associated with this query
							const existingAssociation = await db.query.tagsToQueries.findFirst({
								where: and(eq(tagsToQueries.queryId, query.id), eq(tagsToQueries.tagId, tagId))
							});

							if (!existingAssociation) {
								await db.insert(tagsToQueries).values({
									queryId: query.id,
									tagId: tagId
								});
							}
						} catch (dbError) {
							console.error('Database error inserting tag:', tag.name, dbError);
						}
					}
				} catch (error) {
					console.error('Tag generation error:', error);
					const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
					controller.enqueue(
						`data: ${JSON.stringify({ type: 'error', content: `Tag generation failed: ${errorMessage}` })}\n\n`
					);
				} finally {
					controller.close();
				}
			}
		}),
		{
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		}
	);
}
