import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';

export const SCRIBELESS_API_DEFAULT_BASE_URL = 'https://platform.scribeless.co';

type ScribelessApiContext =
	| IExecuteFunctions
	| IHookFunctions
	| ILoadOptionsFunctions
	| IWebhookFunctions;

type ScribelessCredentials = ICredentialDataDecryptedObject & {
	baseUrl?: string;
};

export function normalizeScribelessBaseUrl(baseUrl?: string): string {
	const trimmed = (baseUrl || SCRIBELESS_API_DEFAULT_BASE_URL).trim();
	const withoutTrailingSlash = trimmed.replace(/\/+$/, '');

	return withoutTrailingSlash.endsWith('/api')
		? withoutTrailingSlash.slice(0, -'/api'.length)
		: withoutTrailingSlash;
}

export async function getScribelessBaseUrl(this: ScribelessApiContext): Promise<string> {
	const credentials = await this.getCredentials<ScribelessCredentials>('scribelessApi');

	return normalizeScribelessBaseUrl(String(credentials.baseUrl || SCRIBELESS_API_DEFAULT_BASE_URL));
}

export async function scribelessApiRequest(
	this: ScribelessApiContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
): Promise<unknown> {
	const baseUrl = await getScribelessBaseUrl.call(this);
	const options = {
		method,
		url: `${baseUrl}/api${endpoint}`,
		body,
		json: true,
	};

	return await this.helpers.httpRequestWithAuthentication.call(this, 'scribelessApi', options);
}
