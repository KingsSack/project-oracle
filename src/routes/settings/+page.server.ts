import { fail } from '@sveltejs/kit';
import { db } from '../../db/db.server';
import { modelGroups, models } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const actions = {
	'add-model': async ({ request }) => {
		const data = await request.formData();

		const model = data.get('model');
		const provider = data.get('provider');

		if (!model || !provider) {
			return fail(400, {
				error: 'Model and provider are required'
			});
		}

		try {
			await db.insert(models).values({
				model: model.toString(),
				provider: provider.toString()
			});
		} catch (error) {
			return fail(422, {
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}

		return { success: true };
	},
	'delete-model': async ({ request }) => {
		const data = await request.formData();

		const id = data.get('id');

		if (!id) {
			return fail(400, {
				error: 'id is required'
			});
		}

		try {
			await db.delete(models).where(eq(models.id, Number(id)));
		} catch (error) {
			return fail(422, {
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	},
	'add-group': async ({ request }) => {
		const data = await request.formData();

		const groupName = data.get('groupName');
		const tagsModelId = data.get('tagsModelId');
		const responseModelId = data.get('responseModelId');
		const followUpModelId = data.get('followUpModelId');

		if (!groupName || !tagsModelId || !responseModelId || !followUpModelId) {
			return fail(400, {
				error: 'All fields are required'
			});
		}

		try {
			await db.insert(modelGroups).values({
				name: groupName.toString(),
				tagsModelId: Number(tagsModelId),
				responseModelId: Number(responseModelId),
				followUpModelId: Number(followUpModelId)
			});
		} catch (error) {
			return fail(422, {
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}

		return { success: true };
	}
};

export async function load() {
	try {
		const modelsData = await db
			.select({ id: models.id, model: models.model })
			.from(models)
			.orderBy(models.model);
		const modelGroupsData = await db.select({ name: modelGroups.name }).from(modelGroups);

		return {
			models: modelsData.map((model) => ({ id: model.id, model: model.model })),
			modelGroups: modelGroupsData.map((group) => group.name)
		};
	} catch (error) {
		console.error('Error loading model groups:', error);
		throw error;
	}
}
