import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { db } from '../../db/db.server';
import { projects } from '../../db/schema.js';

export async function load({ params: { project } }) {
	try {
        const projectsData = await db.query.projects.findMany({
            columns: { id: true, name: true }
        });
		
        let selectedProject;
        if (project !== 'default') {
            const selectedProjectData = await db
                .select({ name: projects.name })
                .from(projects)
                .where(eq(projects.id, parseInt(project.toString())))
                .limit(1);
            
            if (selectedProjectData.length === 0) {
                return fail(404, { message: 'Project not found' });
            }
            
            selectedProject = selectedProjectData[0].name
        } else {
            selectedProject = '';
        }

		return {
            projects: projectsData.map((project) => ({
                id: project.id,
                name: project.name
            })),
			selectedProject: selectedProject
		};
	} catch (error) {
		throw fail(500);
	}
}
