import { z } from "genkit";
import { ai } from "../../ai/ai.server";

export const search = ai.defineTool(
    {
        name: "search",
        description: "Search for information on the web",
        inputSchema: z.object({
            query: z.string().describe("The search query to perform")
        }),
    },
    async (input) => {
        const response = await fetch(`${process.env.SEARCH_ENGINE_URL}/search?q=${input.query}`);
        const data = await response.json();
        return data;
    }
);