import { fail, redirect } from '@sveltejs/kit';
import { projects, queries, threads } from '../db/schema';
import { db } from '../db/db.server';
import { ai } from '../ai/ai.server';

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
			const { text } = await ai.generate(userQuery.toString());
			if (!text) {
				return fail(500, {
					error: 'Failed to generate a response'
				});
			}
			
			const query = await db.insert(queries).values({
				query: userQuery.toString(),
				result: text,
				timestamp: new Date().toISOString()
			}).returning({ id: queries.id });

			const thread = await db.insert(threads).values({
				queryId: query[0].id,
				timestamp: new Date().toISOString()
			}).returning({ id: threads.id });

			throw redirect(303, `/thread/${thread[0].id}`);
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
			})),
        }
    } catch (error) {
        return fail(500);
    }
}
