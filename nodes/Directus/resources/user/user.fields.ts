import type { INodeProperties } from 'n8n-workflow';

export const userFields: INodeProperties[] = [
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['update', 'updateRaw', 'delete', 'get', 'getRaw'],
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
	{
		displayName: 'JSON Data',
		name: 'jsonData',
		type: 'json',
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['updateRaw'],
			},
		},
		description: 'Raw JSON data to send to Directus',
	},
	{
		displayName: 'Fields to Return',
		name: 'userFieldsToReturn',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getUserFields',
		},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get', 'getAll'],
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
				resource: ['user'],
				operation: ['getRaw', 'getAllRaw'],
			},
		},
		description:
			'Raw JSON query parameters for the GET request. Supports all Directus query parameters including fields, filter, sort, limit, etc. Example: {"fields": ["*"], "filter": {"status": {"_eq": "active"}}, "limit": 10}',
	},
];
