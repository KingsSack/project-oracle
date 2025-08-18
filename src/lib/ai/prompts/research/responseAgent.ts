import { z } from "genkit";
import { ai } from "../../../../ai/ai.server";
import { critiqueAgent } from "./critiqueAgent";

export const ResponseAgentInputSchema = z.object({
	query: z.string().describe('The user query to respond to.')
});

export const ResponseAgentChunkSchema = z.object({
	plan: z.string().describe('The plan for the response.').optional(),
	response: z.string().describe('The generated response to the user query.').optional()
});

export const ResponseAgentOutputSchema = z.object({
	plan: z.string().describe('The plan for the response.'),
	response: z.string().describe('The generated response to the user query.')
});

export const responseAgent = ai.definePrompt({
	name: 'responseAgent',
	description: 'A response agent that generates answers based on search results',
	tools: [critiqueAgent],
	system: `You are an AI response agent.
Your goal is to provide a comprehensive answer to the user's query.
Use the provided source data to compose your response.
Use the critique agent to improve your response.
Ensure your response is clear, concise, and well-structured.
Do not invent any data that is not included in the provided sources.
Before starting, create a plan for your response.

Return exactly this JSON structure:
{"plan": "<your plan here>", "response": "<your response here>"}

Return ONLY valid JSON without any additional text.
ONLY use double quotes for JSON keys and string values.
Double quotes in the output MUST be preceded by three backslashes.`,
	input: {
		schema: ResponseAgentInputSchema
	},
	output: {
		schema: ResponseAgentOutputSchema
	},
	prompt: 'Write the response for this query: {{query}}'
});