import { z } from 'genkit';
import { ai } from '../../ai/ai.server';
import { and, eq } from 'drizzle-orm';
import { db } from '../../db/db.server';
import { followUps, tags, tagsToQueries, threads } from '../../db/schema';
import { storeThreadEmbedding } from '$lib/services/searchService';
import { runPromptStream } from '$lib/utils/streaming';
import { GenerateTagsChunkSchema, GenerateTagsInputSchema, GenerateTagsOutputSchema } from './prompts/generateTags';
import { GenerateFollowUpsChunkSchema, GenerateFollowUpsInputSchema, GenerateFollowUpsOutputSchema } from './prompts/generateFollowUps';
import { GenerateTitleChunkSchema, GenerateTitleInputSchema, GenerateTitleOutputSchema } from './prompts/generateTitle';

const QueryInputSchema = z.object({
	tagsModel: z.object({
		model: z.string(),
		provider: z.string()
	}),
	followUpModel: z.object({
		model: z.string(),
		provider: z.string()
	}),
	titleModel: z.object({
		model: z.string(),
		provider: z.string()
	}),
	query: z.string().describe('The user query.'),
	response: z.string().describe('The response to the user query.'),
	queryId: z.number(),
	threadId: z.number(),
	messages: z
		.object({
			content: z
				.object({
					text: z.string().describe('The content of the message.')
				})
				.array(),
			role: z.enum(['user', 'model', 'system']).describe('The role of the message author.')
		})
		.array()
		.describe('The thread of previous queries and results, if any.')
		.optional()
});

const QueryStreamSchema = z.object({
	tags: z
		.array(
			z.object({
				name: z
					.string()
					.min(2, 'Tag name is required')
					.max(32, 'Tag name must be less than 32 characters')
					.describe('The tag name')
			})
		)
		.describe('The generated tags')
		.optional(),
	followUps: z
		.array(
			z.object({
				query: z
					.string()
					.min(3, 'Follow-up query is required')
					.max(256, 'Follow-up query must be less than 256 characters')
					.describe('The follow-up query')
			})
		)
		.describe('The generated follow-ups')
		.optional(),
	title: z
		.object({
			title: z
				.string()
				.min(4, 'Title is required')
				.max(64, 'Title must be less than 64 characters')
				.describe('A short and descriptive title for the thread')
		})
		.optional()
});

const QueryOutputSchema = z.object({
	tags: z
		.array(
			z.object({
				name: z
					.string()
					.min(2, 'Tag name is required')
					.max(32, 'Tag name must be less than 32 characters')
					.describe('The tag name')
			})
		)
		.describe('The generated tags'),
	followUps: z
		.array(
			z.object({
				query: z
					.string()
					.min(3, 'Follow-up query is required')
					.max(256, 'Follow-up query must be less than 256 characters')
					.describe('The follow-up query')
			})
		)
		.describe('The generated follow-ups'),
	title: z.object({
		title: z
			.string()
			.min(4, 'Title is required')
			.max(64, 'Title must be less than 64 characters')
			.describe('A short and descriptive title for the thread')
	})
});

export const queryFlow = ai.defineFlow(
	{
		name: 'query',
		inputSchema: QueryInputSchema,
		streamSchema: QueryStreamSchema,
		outputSchema: QueryOutputSchema
	},
	async (
		{ tagsModel, followUpModel, titleModel, query, response, queryId, threadId, messages },
		{ sendChunk }
	) => {
		const generateTagsOutput = await runPromptStream<
			z.infer<typeof GenerateTagsInputSchema>,
			z.infer<typeof GenerateTagsChunkSchema>,
			z.infer<typeof GenerateTagsOutputSchema>
		>(
			'generateTags',
			{ query, response },
			{ model: tagsModel.provider + '/' + tagsModel.model },
			(chunk) => {
				if (chunk) {
					sendChunk({ tags: chunk });
				}
			}
		);

		for (const tag of generateTagsOutput) {
			try {
				let existingTag = await db.query.tags.findFirst({
					where: eq(tags.name, tag.name)
				});

				let tagId;
				if (existingTag) {
					tagId = existingTag.id;
				} else {
					const [newTag] = await db
						.insert(tags)
						.values({ name: tag.name })
						.returning({ id: tags.id });
					tagId = newTag.id;
				}

				const existingAssociation = await db.query.tagsToQueries.findFirst({
					where: and(eq(tagsToQueries.queryId, queryId), eq(tagsToQueries.tagId, tagId))
				});

				if (!existingAssociation) {
					await db.insert(tagsToQueries).values({
						queryId: queryId,
						tagId: tagId
					});
				}
			} catch (dbError) {
				console.error('Database error inserting tag:', tag.name, dbError);
			}
		}

		const generateFollowUpsOutput = await runPromptStream<
			z.infer<typeof GenerateFollowUpsInputSchema>,
			z.infer<typeof GenerateFollowUpsChunkSchema>,
			z.infer<typeof GenerateFollowUpsOutputSchema>
		>(
			'generateFollowUps',
			{ query, response },
			{ model: followUpModel.provider + '/' + followUpModel.model },
			(chunk) => {
				if (chunk) {
					sendChunk({ followUps: chunk });
				}
			}
		);

		for (const followUp of generateFollowUpsOutput) {
			try {
				await db.insert(followUps).values({
					query: followUp.query,
					queryId: queryId
				});
			} catch (dbError) {
				console.error('Database error inserting follow-up:', followUp.query, dbError);
			}
		}

		const threadArray = [
			...(messages ?? [])
				.filter((m) => m.role === 'user' || m.role === 'model')
				.flatMap((m) =>
					m.content.map((c) => ({
						role: m.role === 'user' ? 'query' : 'response',
						content: c.text
					}))
				),
			{ role: 'query', content: query },
			{ role: 'response', content: response }
		];

		const threadMessages = { thread: threadArray };

		const generateTitleOutput = await runPromptStream<
			z.infer<typeof GenerateTitleInputSchema>,
			z.infer<typeof GenerateTitleChunkSchema>,
			z.infer<typeof GenerateTitleOutputSchema>
		>(
			'generateTitle',
			{ thread: JSON.stringify(threadMessages) },
			{ model: titleModel.provider + '/' + titleModel.model },
			(chunk) => {
				if (chunk) {
					sendChunk({ title: chunk });
				}
			}
		);

		try {
			await db
				.update(threads)
				.set({ title: generateTitleOutput.title })
				.where(eq(threads.id, threadId));
		} catch (dbError) {
			console.error('Database error updating thread title:', generateTitleOutput.title, dbError);
		}

		try {
			await storeThreadEmbedding(threadId);
		} catch (e) {
			console.error('Error storing thread embedding:', e);
		}

        return {
            tags: generateTagsOutput,
            followUps: generateFollowUpsOutput,
            title: generateTitleOutput
        }
	}
);
