import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { db } from '../../../db/db.server';
import { projects, tags, threads } from '../../../db/schema';
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

		let threadsData = db.query.threads.findMany({
			where: eq(threads.projectsId, Number(projectsId)),
			columns: {
				id: true,
                title: true
			},
			with: {
				queries: {
					columns: {
						id: true,
						query: true,
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

		if (searchParam) {
			threadsData = db.query.threads.findMany({
				where: sql`${threads.title} LIKE ${`%${searchParam}%`} COLLATE NOCASE`,
				columns: {
					id: true,
                    title: true
				},
				with: {
					queries: {
						columns: {
							id: true,
							query: true,
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
		}

		const filteredThreads = await threadsData;

		return {
			currentProject: currentProject,
			tags: tagsData.map((tag) => tag.name),
			threads: filteredThreads,
			search: searchParam || '',
			selectedTags: selectedTagsParam
		};
	} catch (error) {
		console.error('Error loading threads:', error);
		throw error;
	}
}
