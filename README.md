# n8n-nodes-scribeless

This is an n8n community node. It lets you add recipients to Scribeless campaigns from n8n workflows.

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

## Credentials

This node uses Scribeless API key authentication.

1. In Scribeless, go to `https://platform.scribeless.co/settings#/api-keys`.
2. Create or copy an API key.
3. In n8n, create a Scribeless API credential and paste the key.

The credential test calls `GET https://platform.scribeless.co/api/auth/whoami`.

## Compatibility

Built with the official `@n8n/node-cli` scaffold. Test against the n8n version installed by `npm run dev`.

## Usage

Use **Recipient > Add to Campaign** to send a recipient into a Scribeless campaign. The Campaign field loads your campaigns from Scribeless so you can select a campaign by name instead of pasting an ID. The selected campaign ID is sent to `POST /api/recipients`.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [Scribeless](https://scribeless.co)

## Version history

### 0.1.3

Updated campaign selection to use a campaign dropdown on the recipient action, and changed credential documentation links to the public package repository.

### 0.1.0

Initial private build with campaign lookup and recipient creation.
