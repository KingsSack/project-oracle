import { and, eq, inArray } from 'drizzle-orm';
import { db } from '$db/db.server';
import { projects, queries, tags, tagsToQueries, threads } from '$db/schema';
import { enhancedSearch } from '$services/searchService';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, url }) => {
	try {
		const { selectedProject } = await parent();

		let projectsId: number | undefined;
		if (selectedProject !== 'default') {
			const projectResult = await db
				.select({ id: projects.id })
				.from(projects)
				.where(eq(projects.name, selectedProject))
				.limit(1);

			if (projectResult.length === 0) {
				return fail(404, {
					error: `Project "${selectedProject}" not found`
				});
			}
			projectsId = projectResult[0].id;
		}

		const tagsData = await db.select({ name: tags.name }).from(tags).orderBy(tags.name);

		const searchParam = url.searchParams.get('search');
		const selectedTagsParam = url.searchParams.getAll('tags');

		let searchResults;

		if (searchParam) {
			searchResults = await enhancedSearch(searchParam, projectsId, selectedTagsParam, 20);
		} else {
			const whereConditions = [];

			if (selectedTagsParam.length > 0) {
				const threadsWithSelectedTags = db
					.select({ threadId: queries.threadId })
					.from(queries)
					.innerJoin(tagsToQueries, eq(queries.id, tagsToQueries.queryId))
					.innerJoin(tags, eq(tagsToQueries.tagId, tags.id))
					.where(inArray(tags.name, selectedTagsParam))
					.groupBy(queries.threadId);

				whereConditions.push(inArray(threads.id, threadsWithSelectedTags));
			}

			if (projectsId) {
				whereConditions.push(eq(threads.projectsId, projectsId));
			}

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
				}
			});

			searchResults = {
				threads: threadsData,
				totalResults: threadsData.length
			};
		}

		return {
			currentProject: selectedProject,
			tags: tagsData.map((tag) => tag.name),
			threads: searchResults.threads,
			search: searchParam || '',
			selectedTags: selectedTagsParam,
			totalResults: searchResults.totalResults
		};
	} catch (error) {
		console.error('Error loading threads:', error);
		throw error;
	}
};
