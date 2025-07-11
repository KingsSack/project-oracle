import { eq } from 'drizzle-orm';
import { db } from '../../../db/db.server';
import { projects, tags, threads } from '../../../db/schema';
import { enhancedSearch } from '../../../lib/services/searchService';
import { fail } from '@sveltejs/kit';

export async function load({ parent, url }) {
	try {
		const parentData = await parent();

		const currentProject = parentData.selectedProject || 'Default';

		let projectsId: number | undefined;
		if (currentProject !== 'Default') {
			const projectResult = await db
				.select({ id: projects.id })
				.from(projects)
				.where(eq(projects.name, currentProject.toString()))
				.limit(1);

			if (projectResult.length === 0) {
				return fail(404, {
					error: `Project "${currentProject}" not found`
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
			const threadsData = await db.query.threads.findMany({
				where: projectsId ? eq(threads.projectsId, projectsId) : undefined,
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
			currentProject: currentProject,
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
}
