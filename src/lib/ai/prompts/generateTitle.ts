import { z } from 'genkit';
import { ai } from '../../../ai/ai.server';

export const GenerateTitleInputSchema = z.object({
	thread: z
		.array(
			z.object({
				role: z.enum(['query', 'response']).describe('The type of message'),
				content: z
					.string()
					.min(1, 'Message content required')
					.describe('Plain text content of the message')
			})
		)
		.min(1, 'At least one message is required')
		.describe('Chronological thread history including user and assistant messages')
});

export const GenerateTitleChunkSchema = z.object({
	title: z
		.string()
		.min(4, 'Title is required')
		.max(64, 'Title must be less than 64 characters')
		.describe('A short and descriptive title for the thread')
		.optional()
});

export const GenerateTitleOutputSchema = z.object({
	title: z
		.string()
		.min(4, 'Title is required')
		.max(64, 'Title must be less than 64 characters')
		.describe('A short and descriptive title for the thread')
});

ai.definePrompt({
	name: 'generateTitle',
	system: `Generate a concise and descriptive title for the following thread.
    The title should summarize the main topic or question addressed by the query and response.
    Return ONLY valid JSON without any markdown formatting, code blocks, or additional text.

    Return exactly this JSON structure:
    {"title": "Generated Title"}

    Rules:
    - Title should be 4-64 characters
    - No markdown formatting
    - No code blocks or backticks
    - Pure JSON only`,
	input: {
		schema: GenerateTitleInputSchema
	},
	output: {
		schema: GenerateTitleOutputSchema
	},
	prompt: "Generate a concise title for this thread: '{{thread}}'"
});
