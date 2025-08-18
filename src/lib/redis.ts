import { createClient, SCHEMA_FIELD_TYPE, SCHEMA_VECTOR_FIELD_ALGORITHM } from 'redis';
import { ai } from '../ai/ai.server';
import { z } from 'genkit';
import { getExtractor } from './utils/vectorSearch';
import { CommonRetrieverOptionsSchema } from 'genkit/retriever';
import { runPromptStream } from './utils/streaming';
import { ExtendPromptInputSchema, ExtendPromptOutputSchema } from './ai/prompts/extendPrompt';

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
			},
			flow: {
				type: SCHEMA_FIELD_TYPE.TAG
			}
		},
		{
			ON: 'HASH',
			PREFIX: 'doc:'
		}
	);
}

resetCache()

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
				const flow = doc.metadata?.flow ?? 'global';
				const id = doc.metadata?.id ?? `${flow}:${Math.random().toString(36).slice(2, 9)}`;
				const key = `doc:flow:${flow}:${id}`;

				await redis.hSet(key, {
					content: doc.text,
					embedding: Buffer.from(
						(await pipe(doc.text, { pooling: 'mean', normalize: true })).data.buffer
					),
					metadata: JSON.stringify(doc.metadata),
					flow: String(flow)
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

		const flow = (query as any)?.metadata?.flow;

		const filter = flow ? `(@flow:{${String(flow)}})` : '*';

		const q = `${filter}=>[KNN ${config.k} @embedding $B AS score]`;

		const similar = (await redis.ft.search('vector_idx', q, {
			PARAMS: {
				B: Buffer.from((await pipe(query.text, { pooling: 'mean', normalize: true })).data.buffer)
			},
			RETURN: ['score', 'content', 'metadata', 'flow'],
			SORTBY: 'score',
			LIMIT: { from: 0, size: config.k },
			DIALECT: 2
		})) as RedisSearchResult | null;

		if (!similar || !similar.documents || similar.total === 0) {
			console.warn('No similar documents found in Redis for query:', query.text);
			return docs.slice(0, config.k);
		}

		for (const doc of similar.documents) {
			const metadata = doc.value?.metadata ? JSON.parse(doc.value.metadata) : {};
			const distance = Number(doc.value?.score) || Number.POSITIVE_INFINITY;
			const similarity = 1 / (1 + distance);
			docs.push({
				text: doc.value.content,
				title: metadata.title,
				url: metadata.url,
				similarity
			});
		}

		docs.sort((a, b) => b.similarity - a.similarity);
		return docs.slice(0, config.k);
	}
);

const redisRerankedRetrieverOptions = CommonRetrieverOptionsSchema.extend({
	preRerankK: z.number().max(1000),
	extendPromptModel: z.object({
		model: z.string(),
		provider: z.string()
	}),
	rerankerModel: z.object({
		model: z.string(),
		provider: z.string()
	})
});

export const redisRankedRetriever = ai.defineRetriever(
	{
		name: 'redisRankedRetriever',
		configSchema: redisRerankedRetrieverOptions
	},
	async (input, options) => {
		if (!input.content?.[0]?.text) {
			return { documents: [] };
		}

		const extendedPrompt = (
			await runPromptStream<
				z.infer<typeof ExtendPromptInputSchema>,
				typeof String,
				z.infer<typeof ExtendPromptOutputSchema>
			>(
				'extendPrompt',
				{ query: input.content[0].text },
				{ model: options.extendPromptModel.provider + '/' + options.extendPromptModel.model }
			)
		).extendedQuery;
		const documents = await ai.retrieve({
			retriever: redisRetriever,
			query: { content: [{ text: extendedPrompt }], metadata: input.metadata },
			options: { k: options.preRerankK || 10 }
		});

		// const rerankedDocs = await ai.rerank({
		// 	reranker: options.rerankerModel.provider + '/' + options.rerankerModel.model,
		// 	query: extendedPrompt,
		// 	documents
		// });
		return { documents: documents.slice(0, options.k || 3) };
	}
);
