import { z } from 'genkit';
import { ai } from '../../ai/ai.server';
import { search } from '../tools/search';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/db.server';
import { tags, tagsToQueries, followUps, threads, queries, toolCalls, topics } from '../../db/schema';
import { storeThreadEmbedding } from '$lib/services/searchService';

const QueryGenerationInputSchema = z.object({
	responseModel: z.object({
		model: z.string(),
		provider: z.string()
	}),
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
	query: z.string().describe('The user query to process'),
	queryId: z.number().describe('The ID of the query in the database'),
	threadId: z.number().describe('The ID of the thread'),
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

const QueryGenerationStreamSchema = z.object({
	toolRequest: z
		.object({
			name: z.string().describe('The name of the tool being requested'),
			input: z.unknown().optional().describe('The input parameters for the tool')
		})
		.optional(),
	response: z.string().describe('The generated response').optional(),
	topics: z
		.array(
			z.object({
				topic: z
					.string()
					.describe('A topic from the response that the user might want to learn more about')
			})
		)
		.describe('The generated topics')
		.optional(),
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

const QueryGenerationOutputSchema = z.object({
	response: z.string().describe('The generated response'),
	topics: z
		.array(
			z.object({
				topic: z
					.string()
					.describe('A topic from the response that the user might want to learn more about')
			})
		)
		.describe('The generated topics'),
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

export const queryGenerationFlow = ai.defineFlow(
	{
		name: 'queryGeneration',
		inputSchema: QueryGenerationInputSchema,
		streamSchema: QueryGenerationStreamSchema,
		outputSchema: QueryGenerationOutputSchema
	},
	async (
		{ responseModel, tagsModel, followUpModel, titleModel, query, queryId, threadId, messages },
		{ sendChunk }
	) => {
		try {
			const responseFlow = ai.generateStream({
				prompt: `Generate a quick response to the following query.
				Use the search tool to find relevant information if needed for your response.
				Use multiple search queries if necessary.

				Query: ${query}

				Keep the response concise and let the user decide whether they would like to see more details.`,
				messages: messages,
				tools: [search],
				model: responseModel.provider + '/' + responseModel.model
			});

			let responseText = '';
			for await (const chunk of responseFlow.stream) {
				if (chunk.toolRequests) {
					for (const toolRequest of chunk.toolRequests) {
						const toolCall = toolRequest.toolRequest;
						sendChunk({ toolRequest: toolCall });
						try {
							await db.insert(toolCalls).values({
								name: toolCall.name || 'unknown',
								input: JSON.stringify(toolCall.input),
								timestamp: new Date().toISOString(),
								queryId: queryId
							});
						} catch (dbError) {
							console.error('Database error inserting tool call:', toolCall.name, dbError);
						}
					}
				}
				if (chunk.text) {
					sendChunk({ response: chunk.text });
					responseText += chunk.text;
				}
			}

			const finalResponse = await responseFlow.response;
			responseText = finalResponse.text;

			try {
				await db.update(queries).set({ result: responseText }).where(eq(queries.id, queryId));

				const queryText = `${query}\n\n${responseText}`;
			} catch (dbError) {
				console.error('Database error updating query result:', dbError);
			}

			const topicsFlow = ai.generateStream({
				prompt: `Generate a list of key words or topics that are part of this response to a user's query.
				These should be topics that the user might want to learn more about, based on their query.
				Make sure the topics you generate are words or phrases that are present in the response.
				Return ONLY valid JSON without any markdown formatting, code blocks, or additional text.
				
				Query: ${query}
				Response: ${responseText}
				
				Return exactly this JSON structure:
				{"topics": [{"topic": "topic1"}, {"topic": "topic2"}]}
				
				Rules:
				- Topics must be present in the response
				- Generate an amount of topics that makes sense for the response length
				- No markdown formatting
				- No code blocks or backticks
				- Pure JSON only`,
				model: followUpModel.provider + '/' + followUpModel.model
			});

			let topicsText = '';
			for await (const chunk of topicsFlow.stream) {
				topicsText += chunk.text;
				try {
					const cleanTopicsText = topicsText.replace(/```json\n?|```\n?/g, '').trim();
					const parsedTopics = JSON.parse(cleanTopicsText);
					sendChunk({ topics: parsedTopics });
				} catch (e) {
					continue;
				}
			}

			const topicsResult = await topicsFlow.response;
			topicsText = topicsResult.text;

			let generatedTopics;
			try {
				const cleanTopicsText = topicsText.replace(/```json\n?|```\n?/g, '').trim();
				generatedTopics = JSON.parse(cleanTopicsText);
			} catch (e) {
				console.error('Failed to parse topics:', topicsText);
				generatedTopics = {};
			}

			for (const topic of generatedTopics.topics || []) {
				try {
					await db.insert(topics).values({
						topic: topic.topic,
						queryId: queryId
					});
				} catch (dbError) {
					console.error('Database error inserting topic:', topic.topic, dbError);
				}
			}

			const tagsFlow = ai.generateStream({
				prompt: `Generate relevant tags for the following query and its response.
				Make sure the tags are concise and RELEVANT to the content of the query and response.
				If more than two tags is not necessary, generate only the most relevant ones.
				Return ONLY valid JSON without any markdown formatting, code blocks, or additional text.

				Query: ${query}
				Response: ${responseText}

				Return exactly this JSON structure:
				{"tags": [{"name": "tag1"}, {"name": "tag2"}]}

				Rules:
				- Tags should be 2-32 characters
				- Generate 2-5 relevant tags
				- No markdown formatting
				- No code blocks or backticks
				- Pure JSON only`,
				model: tagsModel.provider + '/' + tagsModel.model
			});

			let tagsText = '';
			for await (const chunk of tagsFlow.stream) {
				tagsText += chunk.text;
				try {
					const cleanTagsText = tagsText.replace(/```json\n?|```\n?/g, '').trim();
					const parsedTags = JSON.parse(cleanTagsText);
					sendChunk({ tags: parsedTags });
				} catch (e) {
					continue;
				}
			}

			const tagsResult = await tagsFlow.response;
			tagsText = tagsResult.text;

			let generatedTags;
			try {
				const cleanTagsText = tagsText.replace(/```json\n?|```\n?/g, '').trim();
				generatedTags = JSON.parse(cleanTagsText);
			} catch (e) {
				console.error('Failed to parse tags:', tagsText);
				generatedTags = { tags: [{ name: 'general' }] };
			}

			for (const tag of generatedTags.tags) {
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

			const followUpsFlow = ai.generateStream({
				prompt: `Generate potential relevant follow-up queries based on the following query and response.
				These follow-up queries should help the user to refine or find more details about their original query.
				Return ONLY valid JSON without any markdown formatting, code blocks, or additional text.

				Query: ${query}
				Response: ${responseText}

				Return exactly this JSON structure:
				{"followUps": [{"query": "follow-up query 1"}, {"query": "follow-up query 2"}]}

				Rules:
				- Follow-up queries should be 3-256 characters
				- Generate 1-4 relevant follow-up queries
				- No markdown formatting
				- No code blocks or backticks
				- Pure JSON only`,
				model: followUpModel.provider + '/' + followUpModel.model
			});

			let followUpsText = '';
			for await (const chunk of followUpsFlow.stream) {
				followUpsText += chunk.text;
				try {
					const cleanFollowUpsText = followUpsText.replace(/```json\n?|```\n?/g, '').trim();
					const parsedFollowUps = JSON.parse(cleanFollowUpsText);
					sendChunk({ followUps: parsedFollowUps });
				} catch (e) {
					continue;
				}
			}

			const followUpsResult = await followUpsFlow.response;
			followUpsText = followUpsResult.text;

			let generatedFollowUps;
			try {
				const cleanFollowUpsText = followUpsText.replace(/```json\n?|```\n?/g, '').trim();
				generatedFollowUps = JSON.parse(cleanFollowUpsText);
			} catch (e) {
				console.error('Failed to parse follow-ups:', followUpsText);
				generatedFollowUps = { followUps: [{ query: 'Provide more details' }] };
			}

			for (const followUp of generatedFollowUps.followUps) {
				try {
					await db.insert(followUps).values({
						query: followUp.query,
						queryId: queryId
					});
				} catch (dbError) {
					console.error('Database error inserting follow-up:', followUp.query, dbError);
				}
			}

			const threadMessages = (messages ?? []).map((m) => `${m.role}: ${m.content[0].text}`);
			threadMessages.push(`user: ${query}`);
			threadMessages.push(`model: ${responseText}`);

			const titleFlow = ai.generateStream({
				prompt: `Generate a concise and descriptive title for a thread based on the following thread.
				The title should summarize the main topic or question addressed by the query and response.
				Return ONLY valid JSON without any markdown formatting, code blocks, or additional text.

				Thread: ${threadMessages.join('\n')}

				Return exactly this JSON structure:
				{"title": "Generated Title"}

				Rules:
				- Title should be 4-64 characters
				- No markdown formatting
				- No code blocks or backticks
				- Pure JSON only`,
				model: titleModel.provider + '/' + titleModel.model
			});

			let titleText = '';
			for await (const chunk of titleFlow.stream) {
				titleText += chunk.text;
				try {
					const cleanTitleText = titleText.replace(/```json\n?|```\n?/g, '').trim();
					const parsedTitle = JSON.parse(cleanTitleText);
					sendChunk({ title: parsedTitle });
				} catch (e) {
					continue;
				}
			}

			const titleResult = await titleFlow.response;
			titleText = titleResult.text;

			let generatedTitle;
			try {
				const cleanTitleText = titleText.replace(/```json\n?|```\n?/g, '').trim();
				generatedTitle = JSON.parse(cleanTitleText);
			} catch (e) {
				console.error('Failed to parse title:', titleText);
				generatedTitle = { title: 'Untitled' };
			}

			try {
				await db
					.update(threads)
					.set({ title: generatedTitle.title })
					.where(eq(threads.id, threadId));
			} catch (dbError) {
				console.error('Database error updating thread title:', generatedTitle.title, dbError);
			}

			storeThreadEmbedding(threadId);

			return {
				response: responseText,
				topics: generatedTopics.topics,
				tags: generatedTags.tags,
				followUps: generatedFollowUps.followUps,
				title: generatedTitle
			};
		} catch (error) {
			console.error('Error in query generation flow:', error);
			throw error;
		}
	}
);
