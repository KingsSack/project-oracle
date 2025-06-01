import { eq } from 'drizzle-orm';
import { db } from '../../../../db/db.server';
import { queries, threads } from '../../../../db/schema';
import { generateResponseFlow } from '$lib/responses';

export async function GET({ params: { id } }) {
	const thread = await db.query.threads.findFirst({
		where: eq(threads.id, parseInt(id)),
		with: {
			queries: true
		}
	});

	if (!thread) {
		return new Response('Thread not found', { status: 404 });
	}

	const query = thread.queries[0];

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
					const response = generateResponseFlow.stream({ query: query.query.toString() });

					for await (const chunk of response.stream) {
						if (chunk.toolRequests && chunk.toolRequests.length > 0) {
							for (const toolRequest of chunk.toolRequests) {
								controller.enqueue(
									`data: ${JSON.stringify({ type: 'tool_request', content: toolRequest })}\n\n`
								);
							}
						}
						controller.enqueue(
							`data: ${JSON.stringify({ type: 'chunk', content: chunk.text })}\n\n`
						);
					}

					const output = await response.output;

					controller.enqueue(`data: ${JSON.stringify({ type: 'complete', content: output })}\n\n`);

					await db.update(queries).set({ result: output }).where(eq(queries.id, query.id));
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
