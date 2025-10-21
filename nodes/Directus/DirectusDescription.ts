import { INodeProperties } from 'n8n-workflow';

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

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a user',
				action: 'Delete a user',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single user',
				action: 'Get a user',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many users',
				action: 'Get many users',
			},
			{
				name: 'Invite User',
				value: 'invite',
				description: 'Invite a new user via email',
				action: 'Invite a user',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing user',
				action: 'Update a user',
			},
		],
		default: 'invite',
	},
];

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
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many files',
				action: 'Get many files',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update file metadata',
				action: 'Update a file',
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
				operation: ['update', 'updateRaw', 'delete', 'get'],
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
];

export const userFields: INodeProperties[] = [
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['update', 'delete', 'get'],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the user to operate on',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'e.g. name@email.com',
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['invite'],
			},
		},
		required: true,
		description: 'User email address - they will receive an invite email at this address',
	},
	{
		displayName: 'Role Name or ID',
		name: 'role',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getRoles',
		},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['invite'],
			},
		},
		default: '',
		description:
			'User role - if not provided, the default role will be assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Custom Invite URL',
		name: 'invite_url',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['invite'],
			},
		},
		description:
			'Optional custom URL for the invite link. If not provided, the default Directus invite URL will be used. Must be configured in USER_INVITE_URL_ALLOW_LIST environment variable.',
	},
	{
		displayName: 'User Fields',
		name: 'userFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['update'],
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
									loadOptionsMethod: 'getUserFields',
								},
								default: '',
								description:
									'Select a user field to update. Field descriptions and required status are shown in the dropdown. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
];

export const fileFields: INodeProperties[] = [
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['update', 'delete', 'get'],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the file to operate on',
	},
	{
		displayName: 'File',
		name: 'file',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
		default: '',
		required: true,
		description: 'The file to upload (binary data or file path)',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
		default: '',
		description: 'Title for the uploaded file',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
		default: '',
		description: 'Description for the uploaded file',
	},
	{
		displayName: 'Folder',
		name: 'folder',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
		default: '',
		description: 'Folder ID to upload the file to',
	},
	{
		displayName: 'File Fields',
		name: 'fileFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['update'],
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
									loadOptionsMethod: 'getFileFields',
								},
								default: '',
								description:
									'Select a file field to update. Field descriptions and required status are shown in the dropdown. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
];

export const sharedFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['item', 'user', 'file'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['item', 'user', 'file'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['user', 'file'],
				operation: ['getAll'],
			},
		},
		default: false,
		description:
			'Whether to return a simplified version of the response with only essential fields',
	},
];

export const directusFields: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Item',
				value: 'item',
			},
			{
				name: 'User',
				value: 'user',
			},
			{
				name: 'File',
				value: 'file',
			},
		],
		default: 'item',
	},
	...itemOperations,
	...userOperations,
	...fileOperations,
	...itemFields,
	...userFields,
	...fileFields,
	...sharedFields,
];
