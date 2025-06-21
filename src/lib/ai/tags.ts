import { z } from 'genkit';
import { ai } from '../../ai/ai.server';
import googleAI from '@genkit-ai/googleai';

const GenerateTagsInputSchema = z.object({
	model: z.string().default('gemini-2.0-flash-lite').describe('The model to use for generating tags. Defaults to "gemini-2.0-flash-lite".'),
	provider: z.string().default('googleai').describe('The provider to use for the model. Defaults to "googleai".'),
	query: z.string().describe('The user query for which to generate tags.')
});

const TagSchema = z.object({
	name: z
		.string()
		.min(3, 'Tag name is required')
		.max(32, 'Tag name must be less than 32 characters')
		.describe('The name of the tag')
});

const GenerateTagsOutputSchema = z.object({
	tags: z.array(TagSchema).describe('List of tags generated for the query')
});

export const generateTagsFlow = ai.defineFlow(
	{
		name: 'generateTags',
		inputSchema: GenerateTagsInputSchema,
		streamSchema: GenerateTagsOutputSchema,
		outputSchema: GenerateTagsOutputSchema
	},
	async ({ model, provider, query }, { sendChunk }) => {
		const { stream, response } = ai.generateStream({
			prompt: `Generate relevant tags for the following query. Return ONLY valid JSON without any markdown formatting, code blocks, or additional text.

			Query: ${query}

			Return exactly this JSON structure:
			{"tags": [{"name": "tag1"}, {"name": "tag2"}]}

			Rules:
			- Tags should be 3-32 characters
			- Generate 2-5 relevant tags
			- No markdown formatting
			- No code blocks or backticks
			- Pure JSON only`,
			model: provider + '/' + model
		});

		let accumulatedText = '';
		for await (const chunk of stream) {
			accumulatedText += chunk.text;
			
			// Try to parse accumulated text as JSON
			try {
				// Clean the text by removing any potential markdown formatting
				const cleanText = accumulatedText.replace(/```json\n?|```\n?/g, '').trim();
				const parsed = JSON.parse(cleanText);
				
				// Validate the structure
				if (parsed.tags && Array.isArray(parsed.tags)) {
					sendChunk(parsed);
				}
			} catch (e) {
				// Continue accumulating if not valid JSON yet
				continue;
			}
		}

		const { text } = await response;
		
		try {
			// Clean the final response text
			const cleanText = text.replace(/```json\n?|```\n?/g, '').trim();
			return JSON.parse(cleanText);
		} catch (e) {
			console.error('Failed to parse final response:', text);
			// Return a fallback response
			return { tags: [{ name: "general" }] };
		}
	}
);
