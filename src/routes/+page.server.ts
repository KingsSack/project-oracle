import { fail, redirect } from '@sveltejs/kit';
import { modelGroups, projects, queries, threads } from '../db/schema';
import { db } from '../db/db.server';
import { resolveModelGroupId } from '$lib/utils/modelGroups';

export const actions = {
	query: async ({ request }) => {
		const data = await request.formData();

		const source = data.get('source');
		const modelGroup = data.get('modelGroup');
		const userQuery = data.get('query');

		if (!source || !modelGroup) {
			return fail(400, {
				error: 'Source and model group are required'
			});
		}
		if (!userQuery) {
			return fail(400, {
				error: 'No query provided'
			});
		}

		try {
			// Resolve the model group ID (handles "Auto" case)
			const selectedModelGroupId = await resolveModelGroupId(modelGroup.toString());

			const threadData = await db
				.insert(threads)
				.values({
					modelGroupsId: selectedModelGroupId,
					timestamp: new Date().toISOString()
				})
				.returning({ id: threads.id });

			const id = threadData[0].id;

			await db
				.insert(queries)
				.values({
					query: userQuery.toString(),
					timestamp: new Date().toISOString(),
					threadId: id
				})
				.returning({ id: queries.id });

			throw redirect(303, `/thread/${id}`);
		} catch (error) {
			if (error && typeof error === 'object' && 'status' in error && error.status === 303) {
				throw error;
			}

			return fail(422, {
				description: userQuery,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}
};

export async function load() {
	try {
		const projectsData = await db
			.select({ name: projects.name, banner: projects.banner })
			.from(projects)
			.limit(6);
		
		const modelGroupsData = await db.select({ name: modelGroups.name }).from(modelGroups);

		const modelGroupNames = ['Auto', ...modelGroupsData.map((group) => group.name)];

		return {
			projects: projectsData.map((project) => ({
				name: project.name,
				image: project.banner
			})),
			modelGroups: modelGroupNames
		};
	} catch (error) {
		return fail(500);
	}
}
