import { googleAI } from '@genkit-ai/googleai';
import { openAICompatible } from '@genkit-ai/compat-oai';
import { openAI } from '@genkit-ai/compat-oai/openai';
import { genkit } from 'genkit';
import { cohere } from 'genkitx-cohere';
import { github } from 'genkitx-github';

export const ai = genkit({
	plugins: [
		openAICompatible({
			name: 'openaicompat',
			apiKey: process.env.OPENAI_API_KEY || 'none',
			baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
		}),
		googleAI(),
		openAI({ apiKey: process.env.OPENAI_API_KEY || 'none' }),
		cohere({ apiKey: process.env.COHERE_API_KEY || 'none' }),
		github({ githubToken: process.env.GITHUB_TOKEN || 'none' })
	]
});
