# Changelog

## 0.1.9

- Fix the provenance publish workflow install step for GitHub Actions.

## 0.1.8

- Republish the QR scan trigger release from GitHub Actions with npm provenance.
- Add the tag-triggered publish workflow required for n8n Cloud verification.

## 0.1.7

- Add a Scribeless Trigger node for signed `qr_code.scanned` webhook deliveries.
- Add a credential base URL setting so local n8n testing can point at Scribeless dev while production keeps the default platform URL.

## 0.1.6

- Use a visible branded Scribeless icon for light and dark n8n surfaces.

## 0.1.5

- Fix n8n verification metadata for the Scribeless node.
- Remove unused declarative scaffold files from the published package.
- Remove unused request defaults from the programmatic node implementation.

## 0.1.4

- Keep the campaign dropdown load-options method compatible with existing n8n UI sessions while returning all campaigns.

## 0.1.3

- Remove the standalone campaign lookup action from the node picker.
- Load campaigns directly into the recipient action's Campaign dropdown.
- Update credential documentation links to the public package repository.

## 0.1.2

- Add package metadata required for public npm publishing.
