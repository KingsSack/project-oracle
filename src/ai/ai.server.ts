import { googleAI } from '@genkit-ai/googleai';
import { compatOaiModelRef, defineCompatOpenAIModel, openAICompatible } from '@genkit-ai/compat-oai';
import { openAI } from '@genkit-ai/compat-oai/openai';
import { genkit, modelRef } from 'genkit';
import { cohere } from 'genkitx-cohere';
import { github } from 'genkitx-github';

export const ai = genkit({
	plugins: [
		openAICompatible({
			name: 'openaicompat',
			apiKey: process.env.OPENAI_API_KEY,
			baseURL: process.env.OPENAI_BASE_URL,
			initializer: async (ai, client) => {
				defineCompatOpenAIModel({
					ai,
					name: `openaicompat/gemma3-270M`,
					client,
					modelRef: compatOaiModelRef({
						name: 'openaicompat/gemma3-270M'
					})
				});

				defineCompatOpenAIModel({
					ai,
					name: `openaicompat/smollm2`,
					client,
					modelRef: compatOaiModelRef({
						name: 'openaicompat/smollm2'
					})
				});
			}
		}),
		googleAI(),
		openAI({ apiKey: process.env.OPENAI_API_KEY }),
		cohere({ apiKey: process.env.COHERE_API_KEY }),
		github({ githubToken: process.env.GITHUB_TOKEN })
	]
});
