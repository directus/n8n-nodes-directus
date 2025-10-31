import type { INodeProperties } from 'n8n-workflow';

export const fileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a file',
				action: 'Delete a file',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single file',
				action: 'Get a file',
			},
			{
				name: 'Get (Raw JSON)',
				value: 'getRaw',
				description: 'Get a single file using raw JSON query parameters',
				action: 'Get a file with raw JSON',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many files',
				action: 'Get many files',
			},
			{
				name: 'Get Many (Raw JSON)',
				value: 'getAllRaw',
				description: 'Get many files using raw JSON query parameters',
				action: 'Get many files with raw JSON',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update file metadata',
				action: 'Update a file',
			},
			{
				name: 'Update (Raw JSON)',
				value: 'updateRaw',
				description: 'Update file metadata using raw JSON data',
				action: 'Update a file with raw JSON',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a new file',
				action: 'Upload a file',
			},
		],
		default: 'upload',
	},
];
