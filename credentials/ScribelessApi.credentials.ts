import type {
	Icon,
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ScribelessApi implements ICredentialType {
	name = 'scribelessApi';

	displayName = 'Scribeless API';

	icon: Icon = {
		light: 'file:../nodes/Scribeless/scribeless.svg',
		dark: 'file:../nodes/Scribeless/scribeless.dark.svg',
	};

	documentationUrl =
		'https://github.com/scribeless/n8n-nodes-scribeless#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://platform.scribeless.co/api',
			url: '/auth/whoami',
			method: 'GET',
		},
	};
}
