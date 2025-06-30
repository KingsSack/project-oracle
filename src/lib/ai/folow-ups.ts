import { z } from 'genkit';
import { ai } from '../../ai/ai.server';

const GenerateFollowUpsInputSchema = z.object({
	model: z
		.string()
		.default('gemini-2.0-flash-lite')
		.describe('The model to use for generating follow-ups. Defaults to "gemini-2.0-flash-lite".'),
	provider: z
		.string()
		.default('googleai')
		.describe('The provider to use for the model. Defaults to "googleai".'),
	query: z.string().describe('The user query for which to generate follow-ups.')
});

const FollowUpSchema = z.object({
	query: z
		.string()
		.min(3, 'Follow-up query is required')
		.max(256, 'Follow-up query must be less than 256 characters')
		.describe('The follow-up query')
});

const GenerateFollowUpsOutputSchema = z.object({
    followUps: z.array(FollowUpSchema).describe('List of follow-up queries generated for the query')
});

export const generateFollowUpsFlow = ai.defineFlow(
    {
        name: 'generateFollowUps',
        inputSchema: GenerateFollowUpsInputSchema,
        streamSchema: GenerateFollowUpsOutputSchema,
        outputSchema: GenerateFollowUpsOutputSchema
    },
    async ({ model, provider, query }, { sendChunk }) => {
        const { stream, response } = ai.generateStream({
            prompt: `Generate potential relevant follow-up queries for the following user to choose based on the following query.
            These follow-up queries should help the user to refine or find more details about their original query.
            Return ONLY valid JSON without any markdown formatting, code blocks, or additional text.

            Query: ${query}

            Return exactly this JSON structure:
            {"followUps": [{"query": "follow-up query 1"}, {"query": "follow-up query 2"}]}

            Rules:
            - Follow-up queries should be 3-256 characters
            - Generate 1-4 relevant follow-up queries
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
                if (parsed.followUps && Array.isArray(parsed.followUps)) {
                    sendChunk(parsed);
                }
            } catch (e) {
                // Ignore JSON parse errors and continue accumulating text
                continue;
            }
        }

        const { text } = await response;

        try {
            // Clean the final output
            const cleanText = text.replace(/```json\n?|```\n?/g, '').trim();
            return JSON.parse(cleanText);
        } catch (e) {
            console.error('Failed to parse final output:', text);
            // Return a fallback response
            return { followUps: [{ query: "Provide more details" }] };
        }
    }
);
