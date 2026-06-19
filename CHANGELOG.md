# Changelog

## [Unreleased]

### Added

- Structured logging via ctx.logger in lifecycle hooks

### Changed

- Renamed manifest file from `cortex.json` to `manifest.json` for consistency with Cortex standard
- Standardized UI section structure to `ui.settings` format
- Normalized parameter naming: `defaultValue` → `default`, `options` → `enum`
- Added `homepage` field with repository URL
- Added `dependencies` field to manifest

### Changed (v1.1.0)

- **Security**: Replaced raw password-as-Bearer-token auth with proper Snowflake Key Pair JWT
  (RS256) authentication
- **Security**: Replaced raw private-key-as-Bearer-token with proper BigQuery OAuth2 service account
  JWT flow
- Updated config schema: `snowflakePassword` → `snowflakePrivateKey` / `snowflakeOauthToken`
- Updated config schema: `bigqueryCredentials` → `bigqueryClientEmail` + `bigqueryPrivateKey` +
  `bigqueryTokenUri`

## [1.0.1] — 2026-06-15

### Added

- Initial release

## [1.0.1] — 2026-06-17

### Added

- Initial project setup

## [1.0.0] — 2026-06-15

### Added

- Initial release of cortex-plugin-snowflake
- `warehouse_query` — Run analytical queries on Snowflake and BigQuery
- `warehouse_list_tables` — List tables and datasets
- `warehouse_describe` — Describe table schemas
- `warehouse_explain` — Get query execution plans
- `warehouse_generate_report` — Generate reports with chart visualizations
