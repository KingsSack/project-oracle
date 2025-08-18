import { z } from "genkit";
import { ai } from "../../../ai/ai.server";

export const ExtendPromptInputSchema = z.object({
    query: z.string().describe('The search query to extend.')
});

export const ExtendPromptOutputSchema = z.object({
    extendedQuery: z.string().describe('The extended search query.')
});

export const extendPrompt = ai.definePrompt({
    name: 'extendPrompt',
    system: `You are an expert that extends a given search query with additional context and instructions.

Example output:
{ "extendedQuery": "Explain the fundamental principles of quantum computing, its differences from classical computing, and provide real-world applications and current research trends." }

Return ONLY valid JSON without any additional text.`,
    input: {
        schema: ExtendPromptInputSchema
    },
    output: {
        schema: ExtendPromptOutputSchema
    },
    prompt: 'Extend this query: {{query}}'
})