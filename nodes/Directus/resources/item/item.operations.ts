import type { INodeProperties } from 'n8n-workflow';

export const itemOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['item'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new item',
				action: 'Create an item',
			},
			{
				name: 'Create (Raw JSON)',
				value: 'createRaw',
				description: 'Create a new item using raw JSON data',
				action: 'Create an item with raw JSON',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an item',
				action: 'Delete an item',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single item',
				action: 'Get an item',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many items from a collection',
				action: 'Get many items',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing item',
				action: 'Update an item',
			},
			{
				name: 'Update (Raw JSON)',
				value: 'updateRaw',
				description: 'Update an existing item using raw JSON data',
				action: 'Update an item with raw JSON',
			},
		],
		default: 'create',
	},
];
