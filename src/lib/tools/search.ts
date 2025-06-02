import { z } from 'genkit';
import { ai } from '../../ai/ai.server';

export const search = ai.defineTool(
	{
		name: 'search',
		description: 'Search for information on the web',
		inputSchema: z.object({
			query: z.string().describe('The search query to perform')
		})
	},
	async (input) => {
		try {
			const searchEngineUrl = process.env.SEARCH_ENGINE_URL;
			
			if (!searchEngineUrl) {
				console.warn('SEARCH_ENGINE_URL environment variable not set');
				return {
					query: input.query,
					error: 'Search engine not configured. Please set SEARCH_ENGINE_URL environment variable.',
					timestamp: new Date().toISOString()
				};
			}
			
			// Properly encode the query parameter to handle special characters
			const encodedQuery = encodeURIComponent(input.query);
			const url = `${searchEngineUrl}/search?q=${encodedQuery}&format=json`;
			
			const response = await fetch(url, {
				headers: {
					'Accept': 'application/json',
					'User-Agent': 'Project-Oracle/1.0'
				}
			});
			
			if (!response.ok) {
				throw new Error(`Search API returned ${response.status}: ${response.statusText}`);
			}
			
			// Get the raw response text first to inspect it
			const responseText = await response.text();
			
			let data;
			try {
				data = JSON.parse(responseText);
			} catch (parseError) {
				console.error('Failed to parse search API response as JSON:', parseError);
				
				// Return a structured error response instead of throwing
				return {
					query: input.query,
					error: `Search API returned invalid JSON. Response: ${responseText.substring(0, 200)}...`,
					rawResponse: responseText.substring(0, 1000), // Include raw response for debugging
					timestamp: new Date().toISOString()
				};
			}
			
			// Process and clean the SearXNG response
			const searchResults = {
				query: input.query,
				totalResults: data.number_of_results || 0,
				results: (data.results || []).slice(0, 10).map((result: any) => ({
					title: result.title,
					url: result.url,
					content: result.content,
					publishedDate: result.publishedDate
				})),
				suggestions: data.suggestions || [],
				timestamp: new Date().toISOString()
			};
			
			// Ensure the response is serializable
			return searchResults;
		} catch (error) {
			console.error('Search tool error:', error);
			// Return a safe, serializable error response
			return {
				query: input.query,
				error: error instanceof Error ? error.message : 'Unknown search error',
				timestamp: new Date().toISOString()
			};
		}
	}
);
