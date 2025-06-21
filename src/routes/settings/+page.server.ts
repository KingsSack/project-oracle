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

			console.log(`Model ${model} with provider ${provider} added successfully.`);
		} catch (error) {
			return fail(422, {
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}

		return { success: true };
	},
	'add-group': async ({ request }) => {
		const data = await request.formData();

		const groupName = data.get('groupName');
		const tagsModel = data.get('tagsModel');
		const responseModel = data.get('responseModel');
		const followUpModel = data.get('followUpModel');

		if (!groupName || !tagsModel || !responseModel || !followUpModel) {
			return fail(400, {
				error: 'All fields are required'
			});
		}

		try {
			const tagsModelId = await db
				.select({ id: models.id })
				.from(models)
				.where(eq(models.model, tagsModel.toString()));

			const responseModelId = await db
				.select({ id: models.id })
				.from(models)
				.where(eq(models.model, responseModel.toString()));

			const followUpModelId = await db
				.select({ id: models.id })
				.from(models)
				.where(eq(models.model, followUpModel.toString()));

			await db.insert(modelGroups).values({
				name: groupName.toString(),
				tagsModelId: tagsModelId[0].id,
				responseModelId: responseModelId[0].id,
				followUpModelId: followUpModelId[0].id
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
			.select({ model: models.model })
			.from(models)
			.orderBy(models.model);
		const modelGroupsData = await db.select({ name: modelGroups.name }).from(modelGroups);

		console.log('Models:', modelsData);
		console.log('Model Groups:', modelGroupsData);

		return {
			models: modelsData.map((model) => model.model),
			modelGroups: modelGroupsData.map((group) => group.name)
		};
	} catch (error) {
		console.error('Error loading model groups:', error);
		throw error;
	}
}
