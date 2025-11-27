import { db } from '$db/db.server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params: { project } }) => {
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
};
