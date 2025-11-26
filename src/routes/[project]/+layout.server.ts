import { fail } from '@sveltejs/kit';
import { db } from '../../db/db.server';

export async function load({ params: { project } }) {
	try {
		const projectsData = await db.query.projects.findMany({
			columns: {
				id: true,
				name: true,
				description: false,
				banner: false,
				createdAt: false,
				updatedAt: false,
				userId: false
			}
		});

		return {
			projects: projectsData.map((project) => ({
				id: project.id,
				name: project.name
			})),
			selectedProject: project
		};
	} catch (error) {
		throw fail(500);
	}
}
