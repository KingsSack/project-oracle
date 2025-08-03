import { googleAI } from '@genkit-ai/googleai';
import openAI from '@genkit-ai/compat-oai';
import { genkit } from 'genkit';
import { cohere } from 'genkitx-cohere';
import { github } from 'genkitx-github';

export const ai = genkit({
	plugins: [
		googleAI(),
		cohere({ apiKey: process.env.COHERE_API_KEY }),
		openAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_API_BASE_URL }),
		github({ githubToken: process.env.GITHUB_TOKEN })
	],
	model: googleAI.model('gemini-2.0-flash')
});
