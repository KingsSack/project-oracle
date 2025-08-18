import { z } from 'genkit';
import { ai } from '../../../../ai/ai.server';

export const ResearchOrchestratorInputSchema = z.object({
	query: z.string().describe('The initial research query from the user.')
});

export const ResearchOrchestratorChunkSchema = z
	.array(
		z
			.object({
				prompt: z.string().describe('The research prompt for the research agent').optional(),
				plan: z
					.string()
					.describe('A basic plan outlining the research approach for the research agent.')
					.optional()
			})
			.describe('A prompt and plan for a research agent.')
			.optional()
	)
	.describe('An array describing research agents to perform research.')
	.optional();

export const ResearchOrchestratorOutputSchema = z
	.array(
		z
			.object({
				prompt: z.string().describe('The research prompt for the research agent'),
				plan: z
					.string()
					.describe('A basic plan outlining the research approach for the research agent.')
			})
			.describe('A prompt and plan for a research agent.')
	)
	.describe('An array describing research agents to perform research.');

export const researchOrchestrator = ai.definePrompt({
	name: 'researchOrchestrator',
	system: `You are tasked with orchestrating 1-5 research agents to assist with the user's query.
For simple queries, like asking for a definition, only one research agent is needed.
For each research agent define a research prompt and research plan to guide the research.
Each research agent will perform 3-12 web searches.

Example output:
[{"prompt": "Find the definition of 'quantum computing'.", "plan": "Search for the definition of quantum computing on Wikipedia and other reliable sources."}]

Return ONLY valid JSON without any additional text.
ONLY use double quotes for JSON keys and string values.
Double quotes in the output MUST be preceded by three backslashes.`,
	input: {
		schema: ResearchOrchestratorInputSchema
	},
	output: {
		schema: ResearchOrchestratorOutputSchema
	},
	prompt: 'Research this query: {{query}}'
});
