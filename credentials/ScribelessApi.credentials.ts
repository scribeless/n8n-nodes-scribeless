import type {
	Icon,
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

import { SCRIBELESS_API_DEFAULT_BASE_URL } from '../nodes/Scribeless/GenericFunctions';

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
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: SCRIBELESS_API_DEFAULT_BASE_URL,
			required: true,
			description:
				'Use the Scribeless API base URL. Keep the default for production; use a dev URL only for local testing.',
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
			baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "").replace(/\\/api$/, "") + "/api"}}',
			url: '/auth/whoami',
			method: 'GET',
		},
	};
}
