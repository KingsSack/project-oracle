import { z } from 'genkit';
import { ai } from '../../ai/ai.server';
import { search } from '../tools/search';

const GenerateResponseInputSchema = z.object({
	model: z.string().default('gemini-2.0-flash').describe('The model to use for generating the response. Defaults to "gemini-2.0-flash".'),
	provider: z.string().default('googleai').describe('The provider to use for the model. Defaults to "googleai".'),
	query: z.string().describe('The user query for which to generate a response.')
});

export const generateResponseFlow = ai.defineFlow(
	{
		name: 'generateResponse',
		inputSchema: GenerateResponseInputSchema,
		outputSchema: z.string().describe('The generated response to the user query.')
	},
	async ({ model, provider, query }, { sendChunk }) => {
		const { stream, response } = ai.generateStream({
			prompt: `Generate a quick response to the following query.
            Use the search tool to find relevant information if needed for your response.
			Use multiple search queries if necessary.

			Query: ${query}

            Keep the response concise and let the user decide whether they would like to see more details.`,
			model: provider + '/' + model,
			tools: [search]
		});

		for await (const chunk of stream) {
			sendChunk(chunk);
		}

		const { text } = await response;

		return text;
	}
);
