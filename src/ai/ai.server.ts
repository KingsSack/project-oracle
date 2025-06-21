import { googleAI } from '@genkit-ai/googleai';
import { genkit, z } from 'genkit';
import { cohere } from 'genkitx-cohere';
import { openAI } from 'genkitx-openai';

export const ai = genkit({
	plugins: [
		googleAI(),
		cohere({ apiKey: process.env.COHERE_API_KEY }),
		openAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_API_BASE_URL })
	],
	model: googleAI.model('gemini-2.0-flash')
});
