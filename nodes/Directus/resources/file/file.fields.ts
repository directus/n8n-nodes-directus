import type { INodeProperties } from 'n8n-workflow';

export const fileFields: INodeProperties[] = [
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['update', 'updateRaw', 'delete', 'get', 'getRaw'],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the file to operate on',
	},
	{
		displayName: 'Upload a File: Requires binary data from a previous node',
		name: 'uploadNotice',
		type: 'notice',
		typeOptions: {
			noticeType: 'info',
		},
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
		default: '',
	},
	{
		displayName: 'File',
		name: 'file',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['import'],
			},
		},
		default: '',
		required: true,
		description: 'Public URL to fetch the file from. Example: "https://example.com/image.jpg".',
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
	{
		displayName: 'JSON Data',
		name: 'jsonData',
		type: 'json',
		default: '',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['updateRaw'],
			},
		},
		description: 'Raw JSON data to send to Directus',
	},
	{
		displayName: 'Fields to Return',
		name: 'fileFieldsToReturn',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getFileFields',
		},
		displayOptions: {
			show: {
				resource: ['file'],
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
				resource: ['file'],
				operation: ['getRaw', 'getAllRaw'],
			},
		},
		description:
			'Raw JSON query parameters for the GET request. Supports all Directus query parameters including fields, filter, sort, limit, etc. Example: {"fields": ["*"], "filter": {"type": {"_in": ["image/jpeg", "image/png"]}}, "limit": 10}',
	},
];
