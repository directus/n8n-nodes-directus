import type { INodeProperties } from 'n8n-workflow';
export const itemFields: INodeProperties[] = [
	{
		displayName: 'Collection Name or ID',
		name: 'collection',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCollections',
		},
		displayOptions: {
			show: {
				resource: ['item'],
			},
		},
		default: '',
		required: true,
		description:
			'The collection to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Item ID',
		name: 'itemId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['update', 'updateRaw', 'delete', 'get', 'getRaw'],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the item to operate on',
	},
	{
		displayName: 'Collection Fields',
		name: 'collectionFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'field',
						displayName: 'Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'name',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCollectionFields',
								},
								default: '',
								description:
									'Select a field from the collection. Field descriptions and required status are shown in the dropdown. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
								required: true,
							},
							{
								displayName: 'Field Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Enter the value for this field. Required fields are marked with *.',
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'JSON Data',
		name: 'jsonData',
		type: 'json',
		default: '',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['createRaw', 'updateRaw'],
			},
		},
		description: 'Raw JSON data to send to Directus',
	},
	{
		displayName: 'Fields to Return',
		name: 'itemFields',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getCollectionFields',
		},
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['get', 'getAll'],
			},
			hide: {
				collection: [''],
			},
		},
		default: [],
		description:
			'Select which fields to return in the response. Leave empty to return all fields. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Query Parameters',
		name: 'queryParameters',
		type: 'json',
		default: '{}',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['getRaw', 'getAllRaw'],
			},
		},
		description:
			'Raw JSON query parameters for the GET request. Supports all Directus query parameters including fields, filter, sort, limit, etc. Example: {"fields": ["*"], "filter": {"status": {"_eq": "published"}}, "limit": 10}',
	},
];
