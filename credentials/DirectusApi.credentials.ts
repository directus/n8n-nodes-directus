import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class DirectusApi implements ICredentialType {
	name = 'directusApi';
	displayName = 'Directus API';
	icon: Icon = 'file:directus.svg';
	documentationUrl = 'https://docs.directus.io/reference/authentication/';
	properties: INodeProperties[] = [
		{
			displayName: 'Directus URL',
			name: 'url',
			type: 'string',
			default: 'https://your-directus.app',
			placeholder: 'https://your-directus.app',
			description:
				'Your Directus instance URL. Must start with http:// or https:// and do not include a trailing slash.',
			required: true,
		},
		{
			displayName: 'Access Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Your Directus static access token. Go to the User Library > Pick a user and generate a static token for them.',
			required: true,
		},
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			options: [
				{
					name: 'Cloud',
					value: 'cloud',
				},
				{
					name: 'Self-hosted',
					value: 'self-hosted',
				},
			],
			default: 'cloud',
			description: 'The type of Directus instance you are connecting to',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.token}}',
				'Content-Type': 'application/json',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}',
			url: '/users/me',
			method: 'GET',
		},
	};
}
