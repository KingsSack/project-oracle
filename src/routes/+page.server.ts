import { fail, redirect } from '@sveltejs/kit';
import { projects, queries, threads } from '../db/schema';
import { db } from '../db/db.server';

export const actions = {
	query: async ({ cookies, request, url }) => {
		const data = await request.formData();
		const userQuery = data.get('query');

		if (!userQuery) {
			return fail(400, {
				error: 'No query provided'
			});
		}

		try {
			const threadData = await db
				.insert(threads)
				.values({
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
			if (error?.status == 303) {
				throw error;
			}

			return fail(422, {
				description: userQuery,
				error: error?.message
			});
		}
	}
};

export async function load() {
	try {
		const data = await db.select().from(projects).limit(6);

		return {
			projects: data.map((project) => ({
				name: project.name,
				image: project.banner
			}))
		};
	} catch (error) {
		return fail(500);
	}
}
