import { eq, and } from 'drizzle-orm';
import { db } from '../../../../db/db.server';
import { queries, tags, tagsToQueries } from '../../../../db/schema';
import { generateTagsFlow } from '$lib/ai/tags';

export async function GET({ params: { id } }) {
	const query = await db.query.queries.findFirst({
		where: eq(queries.id, parseInt(id)),
		columns: {
			id: true,
			query: true
		},
		with: {
			thread: {
				with: {
					modelGroups: {
						with: {
							tagsModel: {
								columns: {
									model: true,
									provider: true
								}
							}
						}
					}
				}
			},
			tagsToQueries: {
				with: {
					tag: {
						columns: {
							name: true
						}
					}
				}
			}
		}
	});

	if (!query) {
		return new Response('Query not found', { status: 404 });
	}

	if (!query.thread) {
		return new Response('Thread not found for this query', { status: 404 });
	}

	const model = query.thread.modelGroups.tagsModel;
	
	const existingTags = query.tagsToQueries.map(t => t.tag.name);

	return new Response(
		new ReadableStream({
			async start(controller) {
				if (!query) {
					controller.enqueue(
						`data: ${JSON.stringify({ type: 'error', content: 'Query not found' })}\n\n`
					);
					controller.close();
					return;
				}

				if (existingTags.length > 0) {
					controller.enqueue(
						`data: ${JSON.stringify({ type: 'complete', content: existingTags })}\n\n`
					);
					controller.close();
					return;
				}

				try {
					const response = generateTagsFlow.stream({
						model: model.model,
						provider: model.provider,
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
