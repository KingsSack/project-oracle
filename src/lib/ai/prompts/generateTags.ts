import { z } from 'genkit';
import { ai } from '../../../ai/ai.server';

export const GenerateTagsInputSchema = z.object({
	query: z.string().describe('The query to generate tags for.'),
	response: z.string().describe('The response to generate tags for.')
});

export const GenerateTagsChunkSchema = z
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
	.optional();

export const GenerateTagsOutputSchema = z
	.array(
		z.object({
			name: z
				.string()
				.min(2, 'Tag name is required')
				.max(32, 'Tag name must be less than 32 characters')
				.describe('The tag name')
		})
	)
	.describe('The generated tags');

ai.definePrompt({
	name: 'generateTags',
	system: `Generate relevant tags for the following query and its response.
    Make sure the tags are concise and RELEVANT to the content of the query and response.
    If more than two tags is not necessary, generate only the most relevant ones.
    Return ONLY valid JSON without any markdown formatting, code blocks, or additional text.
    
    Return exactly this JSON array structure:
    [{"name": "tag1"}, {"name": "tag2"}]

    Rules:
    - Tags should be 2-32 characters
    - Generate 2-5 relevant tags
    - No markdown formatting
    - No code blocks or backticks
    - Pure JSON only`,
	input: {
		schema: GenerateTagsInputSchema
	},
	output: {
		schema: GenerateTagsOutputSchema
	},
	prompt: "Generate tags for this query: '{{query}}' and its result: '{{response}}'"
});
