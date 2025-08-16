import { createClient, SCHEMA_FIELD_TYPE, SCHEMA_VECTOR_FIELD_ALGORITHM } from 'redis';
import { ai } from '../ai/ai.server';
import { z } from 'genkit';
import { getExtractor } from './utils/vectorSearch';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = createClient({
	url: redisUrl
});

redis.on('error', (err) => console.error('Redis Client Error', err));

await redis.connect();

export async function resetCache() {
	try {
		await redis.ft.dropIndex('vector_idx');
	} catch (e) {
		// Index doesn't exist, which is fine
	}

	await redis.ft.create(
		'vector_idx',
		{
			content: {
				type: SCHEMA_FIELD_TYPE.TEXT
			},
			embedding: {
				type: SCHEMA_FIELD_TYPE.VECTOR,
				TYPE: 'FLOAT32',
				ALGORITHM: SCHEMA_VECTOR_FIELD_ALGORITHM.HNSW,
				DISTANCE_METRIC: 'L2',
				DIM: 768
			},
			metadata: {
				type: SCHEMA_FIELD_TYPE.TEXT
			}
		},
		{
			ON: 'HASH',
			PREFIX: 'doc:'
		}
	);
}

export const redisIndexer = ai.defineIndexer(
	{
		name: 'redisIndexer'
	},
	async (docs) => {
		for (const doc of docs) {
			if (!doc.text || !doc.metadata) {
				console.warn('Skipping document due to missing fields:', doc);
				continue;
			}

			const pipe = await getExtractor();

			try {
				await redis.hSet(`doc:${doc.metadata.id}`, {
					content: doc.text,
					embedding: Buffer.from(
						(await pipe(doc.text, { pooling: 'mean', normalize: true })).data.buffer
					),
					metadata: JSON.stringify(doc.metadata)
				});
			} catch (error) {
				console.error('Error storing document in Redis:', error);
			}
		}
	}
);

interface RedisDocument {
	id: string;
	value: {
		content: string;
		score: string;
		[key: string]: any;
	};
}

interface RedisSearchResult {
	total: number;
	documents: RedisDocument[];
}

interface Doc {
	text: string;
	title?: string;
	url?: string;
	similarity: number;
}

export const redisRetriever = ai.defineSimpleRetriever(
	{
		name: 'redisRetriever',
		configSchema: z.object({ k: z.number().default(3) }),
		content: 'text',
		metadata: ['title', 'url']
	},
	async (query, config) => {
		const docs: Doc[] = [];

		const pipe = await getExtractor();

		const similar = (await redis.ft.search(
			'vector_idx',
			`*=>[KNN ${config.k} @embedding $B AS score]`,
			{
				PARAMS: {
					B: Buffer.from(
						(await pipe(query.text, { pooling: 'mean', normalize: true })).data.buffer
					)
				},
				RETURN: ['score', 'content', 'metadata'],
				DIALECT: 2
			}
		)) as RedisSearchResult | null;

		if (!similar || !similar.documents || similar.total === 0) {
			console.warn('No similar documents found in Redis for query:', query.text);
			return docs.slice(0, config.k);
		}

		for (const doc of similar.documents) {
			const metadata = doc.value?.metadata ? JSON.parse(doc.value.metadata) : {};
			docs.push({
				text: doc.value.content,
				title: metadata.title,
				url: metadata.url,
				similarity: Number(doc.value.score)
			});
		}

		docs.sort((a, b) => b.similarity - a.similarity);
		return docs.slice(0, config.k);
	}
);

// const redisRerankedRetrieverOptions = CommonRetrieverOptionsSchema.extend({
// 	preRerankK: z.number().max(1000)
// });

// export const redisRankedRetriever = ai.defineRetriever(
// 	{
// 		name: 'redisRankedRetriever',
// 		configSchema: redisRerankedRetrieverOptions
// 	},
// 	async (input, options) => {
// 		const extendedPrompt = await extendPrompt(input);
// 		const docs = await ai.retrieve({
// 			retriever: redisRetriever,
// 			query: extendedPrompt,
// 			options: { k: options.preRerankK || 10 }
// 		});

// 		const rerankedDocs = await rerank(docs);
// 		return rerankedDocs.slice(0, options.k || 3);
// 	}
// );
