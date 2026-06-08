import { createHmac, timingSafeEqual } from 'crypto';

import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IHookFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type JsonObject,
} from 'n8n-workflow';

import { scribelessApiRequest } from '../Scribeless/GenericFunctions';

const SCRIBELESS_QR_SCAN_EVENT_TYPE = 'qr_code.scanned';
const SCRIBELESS_WEBHOOK_SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

type ScribelessWebhookSubscription = {
	id: string;
	secret?: string;
};

type ScribelessWebhookStaticData = IDataObject & {
	scribelessWebhookId?: string;
	scribelessWebhookSecret?: string;
	scribelessWebhookUrl?: string;
};

function asDataObject(value: unknown): IDataObject | undefined {
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		return value as IDataObject;
	}

	return undefined;
}

function getHeader(
	headers: Record<string, string | string[] | undefined>,
	name: string,
): string | undefined {
	const value = headers[name] ?? headers[name.toLowerCase()];

	if (Array.isArray(value)) {
		return value[0];
	}

	return value;
}

function parseSubscriptionResponse(
	context: IHookFunctions,
	response: unknown,
): ScribelessWebhookSubscription {
	const responseObject = asDataObject(response);

	if (!responseObject || typeof responseObject.id !== 'string' || responseObject.id.length === 0) {
		throw new NodeOperationError(
			context.getNode(),
			'Scribeless webhook response did not include an id.',
		);
	}

	const secret = responseObject.secret;

	return {
		id: responseObject.id,
		secret: typeof secret === 'string' && secret.length > 0 ? secret : undefined,
	};
}

function isNotFoundError(error: unknown): boolean {
	const errorObject = asDataObject(error);
	const response = asDataObject(errorObject?.response);
	const status = errorObject?.statusCode ?? errorObject?.status ?? response?.statusCode ?? response?.status;

	return status === 404 || status === '404';
}

function verifyScribelessSignature({
	rawBody,
	secret,
	signature,
	timestamp,
}: {
	rawBody: Buffer;
	secret: string;
	signature: string;
	timestamp: string;
}): boolean {
	const expectedSignature = `sha256=${createHmac('sha256', secret)
		.update(`${timestamp}.${rawBody.toString('utf8')}`)
		.digest('hex')}`;

	const expected = Buffer.from(expectedSignature, 'utf8');
	const received = Buffer.from(signature, 'utf8');

	return expected.length === received.length && timingSafeEqual(expected, received);
}

function webhookResponse(status: number, body: IDataObject): IWebhookResponseData {
	return {
		webhookResponse: body,
		noWebhookResponse: false,
		workflowData: status >= 400 ? undefined : [[{ json: body }]],
	};
}

function getRawBodyBuffer(rawBody: unknown): Buffer | undefined {
	if (Buffer.isBuffer(rawBody)) {
		return rawBody;
	}

	if (typeof rawBody === 'string') {
		return Buffer.from(rawBody, 'utf8');
	}

	return undefined;
}

function isFreshScribelessTimestamp(timestamp: string): boolean {
	const timestampMs = Number(timestamp) * 1000;
	const ageMs = Math.abs(Date.now() - timestampMs);

	return Number.isFinite(ageMs) && ageMs <= SCRIBELESS_WEBHOOK_SIGNATURE_TOLERANCE_MS;
}

async function activateScribelessWebhook(
	this: IHookFunctions,
	subscriptionId: string,
	url: string,
): Promise<ScribelessWebhookSubscription | null> {
	try {
		const response = await scribelessApiRequest.call(
			this,
			'PATCH',
			`/webhooks/${encodeURIComponent(subscriptionId)}`,
			{
				url,
				status: 'active',
			},
		);

		return parseSubscriptionResponse(this, response);
	} catch (error) {
		if (isNotFoundError(error)) {
			return null;
		}

		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

async function deactivateScribelessWebhook(
	this: IHookFunctions,
	subscriptionId: string,
	url?: string,
): Promise<void> {
	await scribelessApiRequest.call(this, 'PATCH', `/webhooks/${encodeURIComponent(subscriptionId)}`, {
		url,
		status: 'inactive',
	});
}

export class ScribelessTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Scribeless Trigger',
		name: 'scribelessTrigger',
		icon: { light: 'file:../Scribeless/scribeless.svg', dark: 'file:../Scribeless/scribeless.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts the workflow when a Scribeless QR code is scanned',
		defaults: {
			name: 'ScribelessTrigger',
		},
		usableAsTool: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'scribelessApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				responseData: 'firstEntryJson',
				path: 'qr-code-scanned',
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'QR Code Scanned',
						value: SCRIBELESS_QR_SCAN_EVENT_TYPE,
						description: 'Trigger when a tracked Scribeless QR code is scanned',
						action: 'Trigger on QR code scan',
					},
				],
				default: SCRIBELESS_QR_SCAN_EVENT_TYPE,
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as ScribelessWebhookStaticData;
				const subscriptionId = staticData.scribelessWebhookId;
				const webhookUrl = this.getNodeWebhookUrl('default');

				if (!subscriptionId || !webhookUrl) {
					return false;
				}

				const subscription = await activateScribelessWebhook.call(
					this,
					String(subscriptionId),
					webhookUrl,
				);

				if (!subscription) {
					return false;
				}

				staticData.scribelessWebhookId = subscription.id;
				staticData.scribelessWebhookUrl = webhookUrl;
				if (subscription.secret) {
					staticData.scribelessWebhookSecret = subscription.secret;
				}

				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				if (!webhookUrl) {
					throw new NodeOperationError(
						this.getNode(),
						'Could not determine the n8n webhook URL for Scribeless.',
					);
				}

				const response = await scribelessApiRequest.call(this, 'POST', '/webhooks', {
					event_type: SCRIBELESS_QR_SCAN_EVENT_TYPE,
					url: webhookUrl,
				});
				const subscription = parseSubscriptionResponse(this, response);
				const staticData = this.getWorkflowStaticData('node') as ScribelessWebhookStaticData;

				staticData.scribelessWebhookId = subscription.id;
				staticData.scribelessWebhookSecret = subscription.secret;
				staticData.scribelessWebhookUrl = webhookUrl;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as ScribelessWebhookStaticData;
				const subscriptionId = staticData.scribelessWebhookId;

				if (subscriptionId) {
					await deactivateScribelessWebhook.call(
						this,
						String(subscriptionId),
						typeof staticData.scribelessWebhookUrl === 'string'
							? staticData.scribelessWebhookUrl
							: undefined,
					);
				}

				delete staticData.scribelessWebhookId;
				delete staticData.scribelessWebhookSecret;
				delete staticData.scribelessWebhookUrl;

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const headers = this.getHeaderData();
		const body = this.getBodyData();
		const response = this.getResponseObject();
		const event = getHeader(headers, 'x-scribeless-event');
		const delivery = getHeader(headers, 'x-scribeless-delivery');
		const timestamp = getHeader(headers, 'x-scribeless-timestamp');
		const signature = getHeader(headers, 'x-scribeless-signature');

		if (event !== SCRIBELESS_QR_SCAN_EVENT_TYPE || body.type !== SCRIBELESS_QR_SCAN_EVENT_TYPE) {
			response.status(400);
			return webhookResponse(400, {
				ok: false,
				error: 'Unexpected Scribeless webhook event.',
			});
		}

		const staticData = this.getWorkflowStaticData('node') as ScribelessWebhookStaticData;
		const secret = staticData.scribelessWebhookSecret;
		const request = this.getRequestObject();
		const rawBody = getRawBodyBuffer(request.rawBody);

		if (!secret || typeof secret !== 'string') {
			response.status(401);
			return webhookResponse(401, {
				ok: false,
				error: 'Scribeless webhook secret is missing from workflow static data.',
			});
		}

		if (!rawBody || !timestamp || !signature) {
			response.status(401);
			return webhookResponse(401, {
				ok: false,
				error: 'Scribeless webhook signature headers or raw body are missing.',
			});
		}

		if (!isFreshScribelessTimestamp(timestamp)) {
			response.status(401);
			return webhookResponse(401, {
				ok: false,
				error: 'Expired Scribeless webhook timestamp.',
			});
		}

		const signatureVerified = verifyScribelessSignature({
			rawBody,
			secret,
			signature,
			timestamp,
		});

		if (!signatureVerified) {
			response.status(401);
			return webhookResponse(401, {
				ok: false,
				error: 'Invalid Scribeless webhook signature.',
			});
		}

		const workflowItem: INodeExecutionData = {
			json: {
				...body,
				scribelessWebhook: {
					event,
					delivery,
					timestamp,
					signatureVerified,
				},
			},
		};

		return {
			webhookResponse: { ok: true },
			workflowData: [[workflowItem]],
		};
	}
}
