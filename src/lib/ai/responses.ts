import { z } from 'genkit';
import { ai } from '../../ai/ai.server';
import { search } from '../tools/search';
import googleAI from '@genkit-ai/googleai';

const GenerateResponseInputSchema = z.object({
	model: z.string().default('gemini-2.0-flash').describe('The model to use for generating the response. Defaults to "gemini-2.0-flash".'),
	query: z.string().describe('The user query for which to generate a response.')
});

export const generateResponseFlow = ai.defineFlow(
	{
		name: 'generateResponse',
		inputSchema: GenerateResponseInputSchema,
		outputSchema: z.string().describe('The generated response to the user query.')
	},
	async ({ model, query }, { sendChunk }) => {
		const { stream, response } = ai.generateStream({
			prompt: `Generate a quick response to the following query.
            Use the search tool to find relevant information if needed for your response.

			Query: ${query}

            Keep the response concise and let the user decide whether they would like to see more details.`,
			model: googleAI.model(model),
			tools: [search]
		});

		for await (const chunk of stream) {
			sendChunk(chunk);
		}

		const { text } = await response;

		return text;
	}
);
