import { z } from 'genkit';
import { ai } from '../../ai/ai.server';
import { search } from './tools/search';
import { eq } from 'drizzle-orm';
import { db } from '$db/db.server';
import { queries, querySteps, sources } from '$db/schema';

const AnswerInputSchema = z.object({
	responseModel: z.object({
		model: z.string(),
		provider: z.string()
	}),
	query: z.string().describe('The user query to process'),
	queryId: z.number().describe('The ID of the query in the database'),
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

const AnswerStreamSchema = z.object({
	steps: z
		.array(
			z.object({
				step: z.string(),
				content: z.array(z.string().optional()).optional()
			})
		)
		.describe('The steps taken to answer the query.')
		.optional(),
	sources: z
		.array(
			z.object({
				title: z.string(),
				url: z.string(),
				description: z.string().optional()
			})
		)
		.describe('The sources used to answer the query.')
		.optional(),
	response: z.string().describe('The generated response').optional()
});

const AnswerOutputSchema = z.object({
	steps: z
		.array(
			z.object({
				step: z.string(),
				content: z.array(z.string().optional()).optional()
			})
		)
		.describe('The steps taken to answer the query.'),
	sources: z
		.array(
			z.object({
				title: z.string(),
				url: z.string(),
				description: z.string().optional()
			})
		)
		.describe('The sources used to answer the query.'),
	response: z.string().describe('The generated response')
});

interface Step {
	step: string;
	content?: string[];
}

interface Source {
	title: string;
	url: string;
	description?: string;
}

interface SearchInput {
	query: string;
}

interface SearchOutput {
	query: string;
	results?: {
		title: string;
		url: string;
		content?: string;
		publishedDate?: string;
	}[];
	totalResults?: number;
	suggestions?: string[];
	error?: string;
	timestamp: string;
}

export const answerFlow = ai.defineFlow(
	{
		name: 'answer',
		inputSchema: AnswerInputSchema,
		streamSchema: AnswerStreamSchema,
		outputSchema: AnswerOutputSchema
	},
	async ({ responseModel, query, queryId, messages }, { sendChunk }) => {
		try {
			let steps: Step[] = [];

			let sites: Source[] = [];

			const responseFlow = ai.generateStream({
				prompt: `Generate a quick response to the following query.
				Use the search tool to find relevant information if needed for your response.
				Use multiple search queries if necessary.

				Query: ${query}

				Keep the response concise and let the user decide whether they would like to see more details.`,
				messages: messages || [],
				tools: [search],
				model: responseModel.provider + '/' + responseModel.model
			});

			for await (const chunk of responseFlow.stream) {
				if (chunk.toolRequests) {
					for (const toolRequest of chunk.toolRequests) {
						const toolCall = toolRequest.toolRequest;
						if (toolCall.name === 'search') {
							const input = toolCall.input as SearchInput;

							const step = {
								step: `Searching for "${input?.query}"`
							};

							steps.push(step);
							sendChunk({ steps: steps });

							try {
								await db.insert(querySteps).values({
									title: step.step,
									queryId
								});
							} catch (dbError) {
								console.error('Database error inserting step:', toolCall.name, dbError);
							}
						}
					}
				}
				for (const content of chunk.content) {
					if (!content.toolResponse) {
						continue;
					}

					if (content.toolResponse.name !== 'search') {
						console.warn('Unexpected tool response:', content.toolResponse.name);
						continue;
					}

					const output = content.toolResponse.output as SearchOutput;

					if (output && Array.isArray(output.results)) {
						const siteMap = new Map<string, Source>();
						const insertPromises: Promise<any>[] = [];

						for (const result of output.results) {
							if (siteMap.has(result.url)) {
								continue;
							}

							siteMap.set(result.url, {
								title: result.title,
								url: result.url,
								description: result.content || ''
							});

							insertPromises.push(
								db
									.insert(sources)
									.values({
										type: 'web',
										title: result.title,
										url: result.url,
										content: result.content || '',
										queryId
									})
									.catch((dbError) => {
										console.error('Database error inserting source:', dbError);
									})
							);
						}

						sites = Array.from(siteMap.values());
						sendChunk({ sources: sites });

						await Promise.all(insertPromises);
					}
				}

				if (!chunk.text) {
					continue;
				}

				sendChunk({ response: chunk.text });
			}

			const finalResponse = (await responseFlow.response).text;

			try {
				await db.update(queries).set({ result: finalResponse }).where(eq(queries.id, queryId));
			} catch (dbError) {
				console.error('Database error updating query result:', dbError);
			}

			return {
				steps,
				sources: sites,
				response: finalResponse
			};
		} catch (error) {
			console.error('Error in query generation flow:', error);
			throw error;
		}
	}
);
