# n8n-nodes-scribeless

This is an n8n community node. It lets you add recipients to Scribeless campaigns from n8n workflows and start workflows when a Scribeless QR code is scanned.

Scribeless helps teams send automated handwritten direct mail.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Resources](#resources)
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

Recipient:

* Add to Campaign

Trigger:

* QR Code Scanned

## Credentials

This node uses Scribeless API key authentication.

1. In Scribeless, go to `https://platform.scribeless.co/settings#/api-keys`.
2. Create or copy an API key.
3. In n8n, create a Scribeless API credential and paste the key.

The credential test calls `GET https://platform.scribeless.co/api/auth/whoami`.

The Base URL field defaults to `https://platform.scribeless.co`. For local development against Scribeless dev, set it to the dev base URL, for example `https://core-125289108818.europe-west2.run.app`. Published production credentials should keep the default unless Scribeless support instructs otherwise.

## Compatibility

Built with the official `@n8n/node-cli` scaffold. Test against the n8n version installed by `npm run dev`.

## Usage

Use **Recipient > Add to Campaign** to send a recipient into a Scribeless campaign. The Campaign field loads your campaigns from Scribeless so you can select a campaign by name instead of pasting an ID. The selected campaign ID is sent to `POST /api/recipients`.

Use **Scribeless Trigger > QR Code Scanned** to start a workflow from Smart QR scan events. When the workflow is activated, n8n registers the workflow webhook URL with Scribeless using `POST /api/webhooks` and stores the returned subscription ID and secret in workflow static data. If the workflow is reactivated with an existing subscription, the node updates it with `PATCH /api/webhooks/:id` and `status: "active"`. When the workflow is deactivated, the node uses `PATCH /api/webhooks/:id` with `status: "inactive"` because local HubSpot/Attio connector code does not show a supported delete route.

Incoming scan deliveries are accepted only when `X-Scribeless-Event` and the payload `type` are `qr_code.scanned`. The trigger verifies `X-Scribeless-Signature` with the stored webhook secret and n8n's raw request body before emitting workflow data. Output contains the Scribeless payload plus a `scribelessWebhook` object with delivery metadata and `signatureVerified: true`.

For local dev testing, run n8n with this community node, expose n8n's webhook URL with a public tunnel such as n8n tunnel/ngrok/Cloudflare Tunnel, set the Scribeless credential Base URL to the dev base URL, activate or listen for the trigger workflow, then visit a dev SQR URL that has a QR code scan configured. Change the Base URL back to the production default before publishing or using production workflows.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [Scribeless](https://scribeless.co)

## Version history

### 0.1.7

Added the Scribeless Trigger node for signed `qr_code.scanned` webhook deliveries, plus a credential Base URL setting for local dev testing.

### 0.1.3

Updated campaign selection to use a campaign dropdown on the recipient action, and changed credential documentation links to the public package repository.

### 0.1.0

Initial private build with campaign lookup and recipient creation.
