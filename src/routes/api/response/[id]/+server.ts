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
					const queryString = query.query.toString();
					console.log('Processing query:', queryString);
					
					const response = generateResponseFlow.stream({ query: queryString });

					for await (const chunk of response.stream) {
						if (chunk.toolRequests && chunk.toolRequests.length > 0) {
							for (const toolRequest of chunk.toolRequests) {
								try {
									controller.enqueue(
										`data: ${JSON.stringify({ type: 'tool_request', content: toolRequest })}\n\n`
									);
								} catch (jsonError) {
									console.error('Failed to serialize tool request:', jsonError);
									controller.enqueue(
										`data: ${JSON.stringify({ type: 'tool_request', content: { name: toolRequest.name || 'unknown', error: 'Failed to serialize request' } })}\n\n`
									);
								}
							}
						}
						if (chunk.toolResponses && chunk.toolResponses.length > 0) {
							for (const toolResponse of chunk.toolResponses) {
								try {
									console.log('Processing tool response:', toolResponse.name, 'with output type:', typeof toolResponse.output);
									
									// Safely serialize the tool response, handling potential circular references or non-serializable data
									const safeToolResponse = {
										name: toolResponse.name,
										output: typeof toolResponse.output === 'object' && toolResponse.output !== null 
											? JSON.parse(JSON.stringify(toolResponse.output)) // Deep clone to avoid circular refs
											: toolResponse.output
									};
									
									const serializedData = JSON.stringify({ type: 'tool_response', content: safeToolResponse });
									console.log('Serialized tool response length:', serializedData.length);
									
									controller.enqueue(`data: ${serializedData}\n\n`);
								} catch (jsonError) {
									console.error('Failed to serialize tool response:', jsonError, 'Tool:', toolResponse.name, 'Output:', toolResponse.output);
									controller.enqueue(
										`data: ${JSON.stringify({ type: 'tool_response', content: { name: toolResponse.name || 'unknown', output: 'Failed to serialize response', error: true } })}\n\n`
									);
								}
							}
						}
						if (chunk.text) {
							try {
								controller.enqueue(
									`data: ${JSON.stringify({ type: 'chunk', content: chunk.text })}\n\n`
								);
							} catch (jsonError) {
								console.error('Failed to serialize chunk text:', jsonError);
								controller.enqueue(
									`data: ${JSON.stringify({ type: 'error', content: 'Failed to serialize response chunk' })}\n\n`
								);
							}
						}
					}

					const output = await response.output;

					try {
						controller.enqueue(`data: ${JSON.stringify({ type: 'complete', content: output })}\n\n`);
					} catch (jsonError) {
						console.error('Failed to serialize final output:', jsonError);
						controller.enqueue(`data: ${JSON.stringify({ type: 'error', content: 'Failed to serialize final response' })}\n\n`);
					}

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
