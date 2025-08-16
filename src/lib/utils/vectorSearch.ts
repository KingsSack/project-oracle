import { embeddings } from '../../db/schema';
import { db } from '../../db/db.server';
import { eq, sql } from 'drizzle-orm';
import { layer_norm, pipeline, Tensor } from '@huggingface/transformers';

export let extractor: any = null;

export interface ThreadSearchResult {
	threadId: number;
	similarity: number;
}

export function cosineSimilarity(a: number[], b: number[]): number {
	let dot = 0,
		normA = 0,
		normB = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}
	return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function getExtractor() {
	if (!extractor) {
		try {
			extractor = await pipeline('feature-extraction', 'nomic-ai/nomic-embed-text-v1.5');
		} catch (error) {
			console.error('Error initializing embedding pipeline:', error);
			throw error;
		}
	}
	return extractor;
}

async function generateEmbedding(text: string): Promise<number[]> {
	try {
		extractor = await getExtractor();

		let embeddings = await extractor(text, {
			pooling: 'mean'
		});

		const matryoshka_dim = 512;
		embeddings = layer_norm(embeddings, [embeddings.dims[1]])
			.slice(null, [0, matryoshka_dim])
			.normalize(2, -1);

		return embeddings.tolist();
	} catch (error) {
		console.error('Error generating embedding:', error);
		throw error;
	}
}

export async function storeEmbedding(threadId: number, text: string): Promise<void> {
	try {
		const embedding = await generateEmbedding(text);
		const embeddingJson = JSON.stringify(embedding);

		const existingEmbedding = await db
			.select()
			.from(embeddings)
			.where(eq(embeddings.threadId, threadId))
			.limit(1);

		if (existingEmbedding.length > 0) {
			await db
				.update(embeddings)
				.set({
					embedding: embeddingJson,
					updatedAt: sql`(unixepoch())`
				})
				.where(eq(embeddings.id, existingEmbedding[0].id));
		} else {
			await db.insert(embeddings).values({
				threadId,
				embedding: embeddingJson
			});
		}
	} catch (error) {
		console.error('Error storing embedding:', error);
		throw error;
	}
}

export async function threadVectorSearch(query: string): Promise<ThreadSearchResult[]> {
	try {
		const queryEmbedding = await generateEmbedding('search_query: ' + query);

		const threadEmbeddings = await db
			.select({ threadId: embeddings.threadId, embedding: embeddings.embedding })
			.from(embeddings);

		const flatQueryEmbedding = Array.isArray(queryEmbedding[0])
			? queryEmbedding[0]
			: queryEmbedding;

		const results: ThreadSearchResult[] = threadEmbeddings
			.map((embedding) => {
				let storedEmbedding = JSON.parse(embedding.embedding);
				storedEmbedding = Array.isArray(storedEmbedding[0]) ? storedEmbedding[0] : storedEmbedding;
				return {
					threadId: embedding.threadId,
					similarity: cosineSimilarity(flatQueryEmbedding, storedEmbedding)
				};
			})
			.filter((result) => result.similarity >= 0.5);

		return results.sort((a, b) => b.similarity - a.similarity);
	} catch (error) {
		console.error('Error performing thread vector search:', error);
		throw error;
	}
}
