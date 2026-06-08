import {
	NodeApiError,
	NodeConnectionTypes,
	type IDataObject,
	type IExecuteFunctions,
	type JsonObject,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { scribelessApiRequest } from './GenericFunctions';

function asDataObject(value: unknown): IDataObject | undefined {
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		return value as IDataObject;
	}

	return undefined;
}

function extractArray(value: unknown): IDataObject[] {
	if (Array.isArray(value)) {
		return value.filter((item): item is IDataObject => asDataObject(item) !== undefined);
	}

	const objectValue = asDataObject(value);
	if (Array.isArray(objectValue?.data)) {
		return objectValue.data.filter((item): item is IDataObject => asDataObject(item) !== undefined);
	}

	return [];
}

function compactObject(value: IDataObject): IDataObject {
	return Object.entries(value).reduce<IDataObject>((accumulator, [key, item]) => {
		if (item === undefined || item === null || item === '') {
			return accumulator;
		}

		if (typeof item === 'object' && !Array.isArray(item)) {
			const compacted = compactObject(item as IDataObject);
			if (Object.keys(compacted).length > 0) {
				accumulator[key] = compacted;
			}
			return accumulator;
		}

		accumulator[key] = item;
		return accumulator;
	}, {});
}

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return 'Unknown Scribeless API error';
}

export class Scribeless implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Scribeless',
		name: 'scribeless',
		icon: { light: 'file:scribeless.svg', dark: 'file:scribeless.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Scribeless API',
		defaults: {
			name: 'Scribeless',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'scribelessApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Recipient',
						value: 'recipient',
					},
				],
				default: 'recipient',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['recipient'],
					},
				},
				options: [
					{
						name: 'Add to Campaign',
						value: 'create',
						action: 'Add a recipient to a campaign',
						description: 'Add a recipient to a recurring campaign',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Campaign Name or ID',
				name: 'campaignId',
				type: 'options',
				required: true,
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getRecurringCampaigns',
				},
				displayOptions: {
					show: {
						resource: ['recipient'],
						operation: ['create'],
					},
				},
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['recipient'],
						operation: ['create'],
					},
				},
				description: 'First name of the recipient',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['recipient'],
						operation: ['create'],
					},
				},
				description: 'Last name of the recipient',
			},
			{
				displayName: 'Address Line 1',
				name: 'address1',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['recipient'],
						operation: ['create'],
					},
				},
				description: 'First address line of the recipient',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['recipient'],
						operation: ['create'],
					},
				},
				description: 'City where the recipient is located',
			},
			{
				displayName: 'Zip/Postal Code',
				name: 'postalCode',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['recipient'],
						operation: ['create'],
					},
				},
				description: 'Zip or postal code of the recipient',
			},
			{
				displayName: 'Country Code',
				name: 'country',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'US',
				displayOptions: {
					show: {
						resource: ['recipient'],
						operation: ['create'],
					},
				},
				description: 'Two-letter country code of the recipient',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['recipient'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Address Line 2',
						name: 'address2',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Address Line 3',
						name: 'address3',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Company',
						name: 'company',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Custom 1',
						name: 'custom1',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Custom 2',
						name: 'custom2',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Department',
						name: 'department',
						type: 'string',
						default: '',
					},
					{
						displayName: 'State/Region',
						name: 'state',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getRecurringCampaigns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await scribelessApiRequest.call(this, 'GET', '/campaigns');
				const campaigns = extractArray(response).map((campaign) => {
					const campaignName = String(campaign.name ?? campaign.id);
					const frequency = campaign.frequency ? ` (${String(campaign.frequency)})` : '';

					return {
						name: `${campaignName}${frequency}`,
						value: String(campaign.id),
					};
				});

				return campaigns.sort((a, b) => a.name.localeCompare(b.name));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;

				if (resource === 'recipient' && operation === 'create') {
					const additionalFields = this.getNodeParameter(
						'additionalFields',
						itemIndex,
						{},
					) as IDataObject;

					const recipientData = compactObject({
						title: additionalFields.title,
						firstName: this.getNodeParameter('firstName', itemIndex) as string,
						lastName: this.getNodeParameter('lastName', itemIndex) as string,
						address: compactObject({
							address1: this.getNodeParameter('address1', itemIndex) as string,
							address2: additionalFields.address2,
							address3: additionalFields.address3,
							city: this.getNodeParameter('city', itemIndex) as string,
							state: additionalFields.state,
							postalCode: this.getNodeParameter('postalCode', itemIndex) as string,
							country: this.getNodeParameter('country', itemIndex) as string,
						}),
						company: additionalFields.company,
						department: additionalFields.department,
						'custom 1': additionalFields.custom1,
						'custom 2': additionalFields.custom2,
					});

					const response = await scribelessApiRequest.call(this, 'POST', '/recipients', {
						campaignId: this.getNodeParameter('campaignId', itemIndex) as string,
						data: recipientData,
					});

					const responseObject = asDataObject(response) ?? extractArray(response)[0];
					returnData.push({
						json: responseObject ?? { data: response as IDataObject },
						pairedItem: { item: itemIndex },
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: getErrorMessage(error) },
						pairedItem: { item: itemIndex },
					});
					continue;
				}

				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
			}
		}

		return [returnData];
	}
}
