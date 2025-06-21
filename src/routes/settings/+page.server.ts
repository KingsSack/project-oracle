import { fail } from '@sveltejs/kit';
import { db } from '../../db/db.server';
import { modelGroups } from '../../db/schema';

export const actions = {
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
			await db.insert(modelGroups).values({
				name: groupName.toString(),
				tagsModel: tagsModel.toString(),
				responseModel: responseModel.toString(),
				followUpModel: followUpModel.toString()
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
		const modelGroupsData = await db
			.select({
				name: modelGroups.name,
				tagsModel: modelGroups.tagsModel,
				responseModel: modelGroups.responseModel,
				followUpModel: modelGroups.followUpModel
			})
			.from(modelGroups);

		return {
			modelGroups: modelGroupsData.map((group) => group.name)
		};
	} catch (error) {
		console.error('Error loading model groups:', error);
		throw error;
	}
}
