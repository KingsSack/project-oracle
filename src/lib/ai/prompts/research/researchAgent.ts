import { search } from '$lib/ai/tools/search';
import { z } from 'genkit';
import { ai } from '../../../../ai/ai.server';

export const ResearchAgentInputSchema = z.object({
	prompt: z.string().describe('The research prompt'),
	plan: z.string().describe('The research plan.')
});

export const ResearchAgentChunkSchema = z.object({
	result: z.string().describe('A brief description of the result of the research').optional(),
	sources: z
		.array(
			z
				.object({
					name: z.string().describe('Name of the source'),
					url: z.string().url().describe('URL of the source'),
					content: z.string().describe('Data from the source')
				})
				.describe('A source to be used in the report')
		)
		.describe('A list of sources to be used in the report')
		.optional()
});

export const ResearchAgentOutputSchema = z.object({
	result: z.string().describe('A brief description of the result of the research'),
	sources: z
		.array(
			z
				.object({
					name: z.string().describe('Name of the source'),
					url: z.string().url().describe('URL of the source'),
					content: z.string().describe('Data from the source')
				})
				.describe('A source to be used in the report')
		)
		.describe('A list of sources to be used in the report')
});

export const researchAgent = ai.definePrompt({
	name: 'researchAgent',
	description: 'A research agent that performs web searches based on provided prompts',
	tools: [search],
	system: `You are an AI research agent.
Your goal is to execute the research plan.
Make 3-12 search queries using the search tool.
Output relevant results to the sources array.
If you do not find relevant results, do not make up data.
If you find relevant results, do not make up url's or content. Only use direct quotes.

Return exactly this JSON output:
{"result": "Found one example source", "sources": [{"name": "Example source", "url": "https://example.com", "content": "The source content"}]}

If no relevant sources are found, return this:
{"result": "No relevant sources found", "sources": []}

Return ONLY valid JSON without any additional text.
ONLY use double quotes for JSON keys and string values.
You MUST return something.`,
	input: {
		schema: ResearchAgentInputSchema
	},
	output: {
		schema: ResearchAgentOutputSchema
	},
	prompt: 'Research sources based on this: {{prompt}} use this research plan: {{plan}}'
});
