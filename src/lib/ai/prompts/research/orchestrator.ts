import { z } from 'genkit';
import { ai } from '../../../../ai/ai.server';

export const OrchestratorInputSchema = z.object({
	query: z.string().describe('The initial research query from the user.')
});

export const OrchestratorChunkSchema = z.object({
	plan: z.string().describe('A detailed plan outlining the research approach.').optional(),
	prompts: z.array(z.string()).describe('A list of prompts to guide the research process.').optional()
});

export const OrchestratorOutputSchema = z.object({
	plan: z.string().describe('A detailed plan outlining the research approach.'),
	prompts: z.array(z.string()).describe('A list of prompts to guide the research process.')
});

export const orchestrator = ai.definePrompt({
	name: 'orchestrator',
	system: `You are tasked with researching the user's query.
First, develop a plan outlining the prompts you might use.
Use your plan to form a list of 1-5 prompts that will guide the research process.
For simple queries, like asking for a definition, only one prompt is needed.
Five prompts should only be used for complex multi-step queries.
These prompts will be used by research agents to carry out the research tasks.
For each prompt a research agent will perform 3-12 web searches.

Example output:
{"plan": "I will use two research agents, the first will research \\\"How to run LLMs on an Intel GPU\\\", the second will research \\\"How to run LLMs locally\\\"", "prompts": ["How to run LLMs on an Intel GPU", "How to run LLMs locally"]}

Return ONLY valid JSON without any additional text.
ONLY use double quotes for JSON keys and string values.
Double quotes in the output MUST be preceded by three backslashes (\\\).`,
	input: {
		schema: OrchestratorInputSchema
	},
	output: {
		schema: OrchestratorOutputSchema
	},
	prompt: 'Research this query: {{query}}'
});
