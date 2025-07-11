import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../../db/db.server';
import { threads } from '../../db/schema';
import { threadVectorSearch, storeEmbedding } from '../utils/vectorSearch';

export interface EnhancedSearchResult {
	threads: Array<{
		id: number;
		title: string | null;
		similarity?: number;
		queries: Array<{
			id: number;
			query: string;
			result: string | null;
			timestamp: string;
			tagsToQueries: Array<{
				tag: {
					name: string;
				};
			}>;
		}>;
	}>;
	totalResults: number;
}

export async function enhancedSearch(
	searchQuery: string,
	projectId?: number,
	selectedTags: string[] = [],
	limit: number = 20
): Promise<EnhancedSearchResult> {
	try {
		const threadResults = await performThreadVectorSearch(
			searchQuery,
			projectId,
			selectedTags,
			limit
		);

		return {
			threads: threadResults,
			totalResults: threadResults.length
		};
	} catch (error) {
		console.error('Error in enhanced search:', error);
		throw error;
	}
}

async function performThreadVectorSearch(
	searchQuery: string,
	projectId?: number,
	selectedTags: string[] = [],
	limit: number = 20
) {
	try {
		const vectorResults = await threadVectorSearch(searchQuery);

		if (vectorResults.length === 0) {
			return [];
		}

		const threadIds = vectorResults.map((r) => r.threadId);

		const whereConditions = [inArray(threads.id, threadIds)];

		if (selectedTags.length > 0) {
			whereConditions.push();
		}

		if (projectId) {
			whereConditions.push(eq(threads.projectsId, projectId));
		}

		// Fetch thread details with all related data
		const threadsData = await db.query.threads.findMany({
			where: and(...whereConditions),
			columns: {
				id: true,
				title: true
			},
			with: {
				queries: {
					columns: {
						id: true,
						query: true,
						result: true,
						timestamp: true
					},
					with: {
						tagsToQueries: {
							columns: {
								queryId: false,
								tagId: false
							},
							with: {
								tag: {
									columns: {
										name: true
									}
								}
							}
						}
					}
				}
			},
			limit: limit
		});

		const threadsWithSimilarity = threadsData
			.map((thread) => {
				const vectorResult = vectorResults.find((r) => r.threadId === thread.id);
				return {
					...thread,
					similarity: vectorResult?.similarity || 0
				};
			})
			.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

		return threadsWithSimilarity;
	} catch (error) {
		console.error('Error in thread vector search:', error);
		return [];
	}
}

async function generateThreadCombinedText(threadId: number): Promise<string> {
	const threadData = await db.query.threads.findFirst({
		where: eq(threads.id, threadId),
		columns: {
			id: true,
			title: true
		},
		with: {
			queries: {
				columns: {
					id: true,
					query: true,
					result: true
				},
				with: {
					tagsToQueries: {
						columns: {
							queryId: false,
							tagId: false
						},
						with: {
							tag: {
								columns: {
									name: true
								}
							}
						}
					}
				}
			}
		}
	});

	if (!threadData) {
		return '';
	}

	const textParts: string[] = [];

	if (threadData.title) {
		textParts.push(threadData.title);
	}

	for (const query of threadData.queries) {
		textParts.push(query.query);
	}

	for (const query of threadData.queries) {
		if (query.result) {
			textParts.push(query.result);
		}
	}

	const allTags = new Set<string>();
	for (const query of threadData.queries) {
		for (const tagToQuery of query.tagsToQueries) {
			allTags.add(tagToQuery.tag.name);
		}
	}
	textParts.push(...Array.from(allTags));

	return textParts.filter((text) => text.trim().length > 0).join(' ');
}

export async function storeThreadEmbedding(threadId: number): Promise<void> {
	try {
		const combinedText = await generateThreadCombinedText(threadId);

		if (combinedText.trim().length > 0) {
			await storeEmbedding(threadId, combinedText);
		}
	} catch (error) {
		console.error(`Error storing thread embedding for thread ${threadId}:`, error);
		throw error;
	}
}
