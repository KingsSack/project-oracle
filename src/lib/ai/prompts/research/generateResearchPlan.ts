import { z } from 'genkit';
import { ai } from '../../../../ai/ai.server';

export const GenerateResearchPlanInputSchema = z.object({
	prompt: z.string().describe('The research prompt.')
});

export const GenerateResearchPlanChunkSchema = z.object({
	plan: z.string().describe('Your research plan.').optional()
});

export const GenerateResearchPlanOutputSchema = z.object({
	plan: z.string().describe('Your research plan.')
});

export const generateResearchPlan = ai.definePrompt({
	name: 'generateResearchPlan',
	system: `Generate a simple research plan for an AI research agent to execute.
The plan should follow the prompt and act as a guide for the web searches the agent will make.
The goal is for the agent to find relevant information for research that includes this prompt.

Return exactly this JSON output:
{"plan": "Research plan"}

Return ONLY valid JSON without any additional text.
ONLY use double quotes for JSON keys and string values.
Double quotes in the output MUST be preceded by three backslashes (\\\).`,
	input: {
		schema: GenerateResearchPlanInputSchema
	},
	output: {
		schema: GenerateResearchPlanOutputSchema
	},
	prompt: 'Generate a researchplan for this prompt: {{prompt}}'
});
