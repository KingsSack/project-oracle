import { eq } from 'drizzle-orm';
import { db } from '../../../../../db/db.server';
import { threads } from '../../../../../db/schema';
import { answerFlow } from '$lib/ai/answer';
import { queryFlow } from '$lib/ai/query';

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

					const result = answerFlow.stream({
						responseModel: modelGroup.responseModel,
						query: queryString,
						queryId: query.id,
						messages: history.length > 0 ? history : undefined
					});

					for await (const chunk of result.stream) {
						if (chunk.steps) {
							controller.enqueue(
								`data: ${JSON.stringify({ type: 'steps', content: chunk.steps })}\n\n`
							);
						}
						if (chunk.sources) {
							controller.enqueue(
								`data: ${JSON.stringify({ type: 'sources', content: chunk.sources })}\n\n`
							);
						}
						if (chunk.response) {
							controller.enqueue(
								`data: ${JSON.stringify({ type: 'response', content: chunk.response })}\n\n`
							);
						}
					}

					const output = await result.output;

					const { output: queryFlowOutput, stream: queryFlowStream } = queryFlow.stream({
						tagsModel: modelGroup.tagsModel,
						followUpModel: modelGroup.followUpModel,
						titleModel: modelGroup.followUpModel,
						query: queryString,
						response: output.response,
						queryId: query.id,
						threadId: thread.id,
						messages: history
					});

					for await (const chunk of queryFlowStream) {
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

					const queryFlowResult = await queryFlowOutput;

					const combined = { ...output, ...queryFlowResult };

					controller.enqueue(`data: ${JSON.stringify({ type: 'complete', content: combined })}\n\n`);
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
