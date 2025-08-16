import type { PromptGenerateOptions } from 'genkit';
import { ai } from '../../ai/ai.server';

type StreamCallback<T> = (chunk: T) => void;

export async function runPromptStream<Input, ChunkOutput, FinalOutput>(
	promptName: string,
	input: Input,
	opts: PromptGenerateOptions,
	onChunk?: StreamCallback<ChunkOutput>
): Promise<FinalOutput> {
	const prompt = ai.prompt(promptName);
	const { response, stream } = prompt.stream(input, opts);
	for await (const chunk of stream) {
		try {
			onChunk?.(chunk.output as ChunkOutput);
		} catch (e) {
			console.error(`Error in chunk handler for ${promptName}`, e);
		}
	}
	try {
		return (await response).output as FinalOutput;
	} catch (e) {
		console.error(`Error waiting for ${promptName} response`, e);
		throw e;
	}
}
