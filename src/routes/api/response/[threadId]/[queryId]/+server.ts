import { eq } from 'drizzle-orm';
import { db } from '../../../../../db/db.server';
import { threads } from '../../../../../db/schema';
import { queryGenerationFlow } from '$lib/ai/queryGeneration';

export async function GET({ params: { threadId, queryId } }) {
	const thread = await db.query.threads.findFirst({
		where: eq(threads.id, parseInt(threadId)),
		with: {
			modelGroups: {
				with: {
					responseModel: {
						columns: {
							model: true,
							provider: true
						}
					},
					tagsModel: {
						columns: {
							model: true,
							provider: true
						}
					},
					followUpModel: {
						columns: {
							model: true,
							provider: true
						}
					}
				}
			},
			queries: {
				columns: {
					id: true,
					query: true,
					result: true
				}
			}
		}
	});

	if (!thread) {
		return new Response('Thread not found', { status: 404 });
	}

	const query = thread.queries.find((q) => q.id === parseInt(queryId));

	if (!query) {
		return new Response('Query not found in thread', { status: 404 });
	}

	const history = thread.queries
		.filter((q) => q.id !== query.id && q.result !== null)
		.flatMap((q) => [
			{ content: [{ text: q.query }], role: 'user' as const },
			{ content: [{ text: q.result as string }], role: 'model' as const }
		]);

	const modelGroup = thread.modelGroups;

	return new Response(
		new ReadableStream({
			async start(controller) {
				if (query.result !== null) {
					controller.enqueue(
						`data: ${JSON.stringify({ type: 'complete', content: query.result })}\n\n`
					);
					controller.close();
					return;
				}

				try {
					const queryString = query.query.toString();
					console.log('Processing query:', queryString);

					const result = queryGenerationFlow.stream({
						responseModel: modelGroup.responseModel,
						tagsModel: modelGroup.tagsModel,
						followUpModel: modelGroup.followUpModel,
						titleModel: modelGroup.followUpModel,
						query: queryString,
						queryId: query.id,
						threadId: thread.id,
						messages: history.length > 0 ? history : undefined
					});

					for await (const chunk of result.stream) {
						if (chunk.toolRequest) {
							controller.enqueue(
								`data: ${JSON.stringify({ type: 'tool_request', content: chunk.toolRequest })}\n\n`
							);
						}
						if (chunk.response) {
							controller.enqueue(
								`data: ${JSON.stringify({ type: 'response', content: chunk.response })}\n\n`
							);
						}
						if (chunk.tags) {
							controller.enqueue(
								`data: ${JSON.stringify({ type: 'tags', content: chunk.tags })}\n\n`
							);
						}
						if (chunk.followUps) {
							controller.enqueue(
								`data: ${JSON.stringify({ type: 'follow_ups', content: chunk.followUps })}\n\n`
							);
						}
						if (chunk.title) {
							controller.enqueue(
								`data: ${JSON.stringify({ type: 'title', content: chunk.title })}\n\n`
							);
						}
					}

					const output = await result.output;

					controller.enqueue(
						`data: ${JSON.stringify({ type: 'complete', content: output })}\n\n`
					);
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
					controller.enqueue(
						`data: ${JSON.stringify({ type: 'error', content: errorMessage })}\n\n`
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
