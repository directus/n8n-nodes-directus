import type { INodeProperties } from 'n8n-workflow';

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
				name: 'Get (Raw JSON)',
				value: 'getRaw',
				description: 'Get a single user using raw JSON query parameters',
				action: 'Get a user with raw JSON',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many users',
				action: 'Get many users',
			},
			{
				name: 'Get Many (Raw JSON)',
				value: 'getAllRaw',
				description: 'Get many users using raw JSON query parameters',
				action: 'Get many users with raw JSON',
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
			{
				name: 'Update (Raw JSON)',
				value: 'updateRaw',
				description: 'Update an existing user using raw JSON data',
				action: 'Update a user with raw JSON',
			},
		],
		default: 'invite',
	},
];
