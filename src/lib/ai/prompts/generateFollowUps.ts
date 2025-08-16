import { z } from 'genkit';
import { ai } from '../../../ai/ai.server';

export const GenerateFollowUpsInputSchema = z.object({
	query: z.string().describe('The original query to generate follow-ups for.'),
	response: z.string().describe('The response to the original query.')
});

export const GenerateFollowUpsChunkSchema = z
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
	.optional();

export const GenerateFollowUpsOutputSchema = z
	.array(
		z.object({
			query: z
				.string()
				.min(3, 'Follow-up query is required')
				.max(256, 'Follow-up query must be less than 256 characters')
				.describe('The follow-up query')
		})
	)
	.describe('The generated follow-ups');

ai.definePrompt({
	name: 'generateFollowUps',
	system: `Generate potential relevant follow-up queries based on the following query and response.
    These follow-up queries should help the user to refine or find more details 
    about their original query that have not been covered in the response.
    Return ONLY valid JSON without any markdown formatting, code blocks, or additional text.

    Return exactly this JSON array structure:
    [{"query": "follow-up query 1"}, {"query": "follow-up query 2"}]

    Rules:
    - Follow-up queries should be 3-256 characters
    - Generate 1-4 relevant follow-up queries
    - No markdown formatting
    - No code blocks or backticks
    - Pure JSON only`,
	input: {
		schema: GenerateFollowUpsInputSchema
	},
	output: {
		schema: GenerateFollowUpsOutputSchema
	},
	prompt:
		"Generate follow-up queries for this original query: '{{query}}' and its response: '{{response}}'"
});
