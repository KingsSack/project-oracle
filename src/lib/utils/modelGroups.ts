import { db } from '../../db/db.server';

/**
 * Determines which model group to use when "Auto" is selected.
 * This function implements the logic for automatic model group selection.
 * You can customize this logic based on your needs.
 */
export async function resolveAutoModelGroup(): Promise<number> {
	const defaultModelGroup = await db.query.modelGroups.findFirst({
		orderBy: (modelGroups, { asc }) => asc(modelGroups.id)
	});
	
	if (!defaultModelGroup) {
		throw new Error('No model groups available');
	}
	
	return defaultModelGroup.id;
}

/**
 * Resolves a model group name to its database ID.
 * Handles the special "Auto" case.
 */
export async function resolveModelGroupId(modelGroupName: string): Promise<number> {
	if (modelGroupName === 'Auto') {
		return resolveAutoModelGroup();
	}
	
	const modelGroup = await db.query.modelGroups.findFirst({
		where: (modelGroups, { eq }) => eq(modelGroups.name, modelGroupName)
	});
	
	if (!modelGroup) {
		throw new Error(`Model group "${modelGroupName}" not found`);
	}
	
	return modelGroup.id;
}
