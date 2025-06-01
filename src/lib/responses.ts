import { z } from 'genkit';
import { ai } from '../ai/ai.server';
import { search } from './tools/search';

const GenerateResponseInputSchema = z.object({
	query: z.string().describe('The user query for which to generate a response.')
});

export const generateResponseFlow = ai.defineFlow(
	{
		name: 'generateResponse',
		inputSchema: GenerateResponseInputSchema,
        outputSchema: z.string().describe('The generated response to the user query.'),
    },
	async ({ query }, { sendChunk }) => {
		const { stream, response } = ai.generateStream({
			prompt: `Generate a quick response to the following query.
            Use the search tool to find relevant information if needed for your response.

			Query: ${query}

            Highlight the key points and let the user decide whether they would like to see more details.`,
            tools: [search]
		});

		for await (const chunk of stream) {
            sendChunk(chunk);
		}

		const { text } = await response;
		
        return text;
	}
);
