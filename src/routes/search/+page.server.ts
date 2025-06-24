import { sql } from 'drizzle-orm';
import { db } from '../../db/db.server';
import { queries, tags, tagsToQueries } from '../../db/schema';

export async function load({ url }) {
	try {
		const tagsData = await db.select({ name: tags.name }).from(tags).orderBy(tags.name);

		const searchParam = url.searchParams.get('search');
		const selectedTagsParam = url.searchParams.getAll('tags');

        let queriesData = db.query.queries.findMany({
            columns: {
                query: true,
                timestamp: true,
                threadId: true
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
        });

        if (searchParam) {
            queriesData = db.query.queries.findMany({
                where: sql`${queries.query} LIKE ${`%${searchParam}%`} COLLATE NOCASE`,
                columns: {
                    query: true,
                    timestamp: true,
                    threadId: true
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
            });
        }

        if (selectedTagsParam.length > 0) {
            queriesData = db.query.queries.findMany({
                where: (queries, { inArray, eq }) =>
                    selectedTagsParam.length > 0
                        ? inArray(
                            queries.id,
                            db
                                .select({ queryId: tagsToQueries.queryId })
                                .from(tagsToQueries)
                                .innerJoin(tags, eq(tagsToQueries.tagId, tags.id))
                                .where(inArray(tags.name, selectedTagsParam))
                                .groupBy(tagsToQueries.queryId)
                                .having(sql`count(DISTINCT ${tags.name}) = ${selectedTagsParam.length}`)
                        )
                        : undefined,
                columns: {
                    query: true,
                    timestamp: true,
                    threadId: true
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
            });
        }

        const filteredQueries = await queriesData

		return {
			tags: tagsData.map((tag) => tag.name),
            queries: filteredQueries,
            search: searchParam || '',
			selectedTags: selectedTagsParam
		};
	} catch (error) {
		console.error('Error loading tags:', error);
		throw error;
	}
}
