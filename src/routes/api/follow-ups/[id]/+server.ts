import { eq } from 'drizzle-orm';
import { generateFollowUpsFlow } from "$lib/ai/folow-ups";
import { db } from "../../../../db/db.server";
import { followUps, queries } from "../../../../db/schema";

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
                            followUpModel: {
                                columns: {
                                    model: true,
                                    provider: true
                                }
                            }
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

    const model = query.thread.modelGroups.followUpModel;

    return new Response(
        new ReadableStream({
            async start(controller) {
                try {
                    const response = generateFollowUpsFlow.stream({
                        model: model.model,
                        provider: model.provider,
                        query: query.query.toString()
                    });

                    for await (const chunk of response.stream) {
                        controller.enqueue(
                            `data: ${JSON.stringify({ type: 'chunk', content: chunk.followUps })}\n\n`
                        );
                    }

                    const output = await response.output;

                    controller.enqueue(
                        `data: ${JSON.stringify({ type: 'complete', content: output.followUps })}\n\n`
                    );

                    for (const followUp of output.followUps) {
                        try {
                            await db.insert(followUps).values({
                                query: followUp.query,
                                queryId: query.id
                            });
                        } catch (dbError) {
                            console.error('Database error inserting follow ups:', followUp.query, dbError);
                        }
                    }
                } catch (error) {
                    console.error('Follow ups generation error:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    controller.enqueue(
                        `data: ${JSON.stringify({ type: 'error', content: `Follow ups generation failed: ${errorMessage}` })}\n\n`
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
