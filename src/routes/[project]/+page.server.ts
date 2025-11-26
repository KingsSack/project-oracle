import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { modelGroups, projects, queries, threads } from '../../db/schema';
import { db } from '../../db/db.server';
import { users } from '../../db/schema.js';
import { resolveModelGroupId } from '$lib/utils/modelGroups';

export const actions = {
	createProject: async ({ request }) => {
        const formData = await request.formData();
        const projectName = (formData.get('name')?.toString() ?? '').trim();

        if (!projectName) {
            return fail(400, { message: 'Project name is required.' });
        }

        try {
            const existingProject = await db
                .select({ id: projects.id })
                .from(projects)
                .where(eq(projects.name, projectName))
                .limit(1);

            if (existingProject.length > 0) {
                return fail(409, { message: 'A project with that name already exists.' });
            }

            const usersResult = await db.query.users.findMany({
                columns: { id: true },
                limit: 1
            });

            let userId = usersResult[0]?.id;

            if (!userId) {
                await db.insert(users).values({
                    name: 'Default user',
                    email: 'default@project-oracle.local'
                });

                const createdUser = await db.query.users.findMany({
                    columns: { id: true },
                    limit: 1
                });

                userId = createdUser[0]?.id;
            }

            if (!userId) {
                return fail(500, { message: 'Unable to assign a user to the project.' });
            }

            await db.insert(projects).values({ name: projectName, userId });

            return { success: true };
        } catch (error) {
            console.error('Unable to create project', error);
            return fail(500, { message: 'Unable to create project.' });
        }
    },
	query: async ({ request }) => {
		const data = await request.formData();

		const project = data.get('project') || 'Default';
		const source = data.get('source');
		const responseType = data.get('responseType') || 'answer';
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
			const selectedModelGroupId = await resolveModelGroupId(modelGroup.toString());

			let projectsId: number | undefined;
			if (project !== 'Default') {
				const projectResult = await db
					.select({ id: projects.id })
					.from(projects)
					.where(eq(projects.name, project.toString()))
					.limit(1);

				if (projectResult.length === 0) {
					return fail(404, {
						error: `Project "${project}" not found`
					});
				}
				projectsId = projectResult[0].id;
			}

			const threadData = await db
				.insert(threads)
				.values({ modelGroupsId: selectedModelGroupId, projectsId, timestamp: new Date().toISOString() })
				.returning({ id: threads.id });

			const id = threadData[0].id;

			const queryData = await db
				.insert(queries)
				.values({
					type: responseType.toString(),
					query: userQuery.toString(),
					timestamp: new Date().toISOString(),
					threadId: id
				})
				.returning({ id: queries.id });

			throw redirect(303, `/${project.toString().toLowerCase()}/query/${queryData[0].id}`);
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

export async function load({ parent }) {
	try {
		const parentData = await parent();

		const projects = parentData.projects || [];
		projects.slice(0, 6);

		const currentProject = parentData.selectedProject || 'Default';
		
		const modelGroupsData = await db.select({ name: modelGroups.name }).from(modelGroups);

		const modelGroupNames = ['Auto', ...modelGroupsData.map((group) => group.name)];

		return {
			projects: projects,
			currentProject: currentProject,
			modelGroups: modelGroupNames
		};
	} catch (error) {
		return fail(500);
	}
}
