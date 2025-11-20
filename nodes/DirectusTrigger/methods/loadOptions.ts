import { ILoadOptionsFunctions, NodeOperationError } from 'n8n-workflow';
import { getCollections } from '../../Directus/methods/fields';

export async function getCollectionsLoadOptions(
	this: ILoadOptionsFunctions,
): Promise<Array<{ name: string; value: string }>> {
	try {
		const collections = await getCollections(this);
		return collections.map((collection: { collection: string }) => ({
			name: collection.collection,
			value: collection.collection,
		}));
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to load collections: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
