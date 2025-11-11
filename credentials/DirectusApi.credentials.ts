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
			description: 'Your Directus instance URL. Must start with http:// or https://',
			required: true,
		},
		{
			displayName:
				'⚠️ Important: Token Permissions Impact Functionality - Your token needs a high level of permission to use this Node. Recommended to use a token with the "Admin" role.',
			name: 'permissionNotice',
			type: 'notice',
			typeOptions: {
				noticeType: 'warning',
			},
			default: '',
		},
		{
			displayName: 'Access Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'<strong>Your Directus static access token.</strong> Go to the User Library > Pick a user and generate a static token for them.<br><br>' +
				'<strong>⚠️ Permission Requirements:</strong> The token must have appropriate permissions.<br>' +
				'Without sufficient permissions, you may encounter 403 Forbidden errors when using this integration.',
			required: true,
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
