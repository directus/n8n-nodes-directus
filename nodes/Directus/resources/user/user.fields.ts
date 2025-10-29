import type { INodeProperties } from 'n8n-workflow';

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
