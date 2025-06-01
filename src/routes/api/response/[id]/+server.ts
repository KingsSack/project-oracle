import { eq } from 'drizzle-orm';
import { db } from '../../../../db/db.server';
import { queries, threads } from '../../../../db/schema';
import { ai } from '../../../../ai/ai.server';

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
					const { stream, response } = ai.generateStream(query.query.toString());

					for await (const chunk of stream) {
						controller.enqueue(
							`data: ${JSON.stringify({ type: 'chunk', content: chunk.text })}\n\n`
						);
					}

					const { text } = await response;

					controller.enqueue(`data: ${JSON.stringify({ type: 'complete', content: text })}\n\n`);

					await db.update(queries).set({ result: text }).where(eq(queries.id, query.id));
				} catch (error) {
					controller.enqueue(
						`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`
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
