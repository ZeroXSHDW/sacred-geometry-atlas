# Security policy

## Scope

This project is a static research atlas. The main security boundaries are the published Pages artifact, third-party research links and assets, browser storage/service-worker behavior, generated exports, and future deployment configuration.

## Reporting

Please do not disclose a suspected vulnerability in a public issue. Use the repository owner’s private GitHub security-advisory channel when it is enabled, or contact the maintainer privately through the account associated with this repository. Include the affected commit or URL, reproduction steps, impact, and whether the issue involves a third-party asset or source.

Do not send credentials, private client information, or unpublished therapy configuration in a report.

## Maintainer expectations

- Keep GitHub Actions pinned to reviewed commit SHAs with least-privilege permissions and isolated checkout credentials.
- Treat downloaded images, models, archives, and datasets as untrusted supply-chain inputs; record hashes and rights status before using them.
- Keep spreadsheet-like exports inert and preserve the schema-backed validation boundary.
- Keep the Pages workflow read-only for pull requests; deployment requires the explicit non-pull-request job and its review gates.
