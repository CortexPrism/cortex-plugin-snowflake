# Snowflake / BigQuery Analyst

Connect CortexPrism to cloud data warehouses (Snowflake, BigQuery) and run analytical queries.

## Installation

```bash
cortex plugin install marketplace:cortex-plugin-snowflake
cortex plugin install github:CortexPrism/cortex-plugin-snowflake
cortex plugin install ./manifest.json
```

## Configuration

### Snowflake
| Key | Type | Description |
|-----|------|-------------|
| `snowflakeAccount` | text | Account identifier |
| `snowflakeUser` | text | Username |
| `snowflakePassword` | secret | Password |
| `snowflakeWarehouse` | text | Warehouse name |
| `snowflakeDatabase` | text | Database name |

### BigQuery
| Key | Type | Description |
|-----|------|-------------|
| `bigqueryProjectId` | text | GCP project ID |
| `bigqueryCredentials` | secret | Service account JSON |

## Tools

### warehouse_query — Run analytical query
- `query` (string, required) — SQL query
- `warehouse` (enum: `snowflake`, `bigquery`, default `snowflake`)
- `max_rows` (number, default `1000`)

### warehouse_list_tables — List tables/datasets
- `warehouse` (enum: `snowflake`, `bigquery`)
- `schema` (string, optional)

### warehouse_describe — Describe table schema
- `table_name` (string, required)
- `warehouse` (enum: `snowflake`, `bigquery`)

### warehouse_explain — Explain query plan
- `query` (string, required)
- `warehouse` (enum: `snowflake`, `bigquery`)

### warehouse_generate_report — Generate report with chart
- `query` (string, required)
- `title` (string, required)
- `chart_type` (enum: `bar`, `line`, `pie`, `table`, `area`)
- `warehouse` (enum: `snowflake`, `bigquery`)

## Capabilities

- `tools` — Tool execution
- `network:fetch` — HTTPS to warehouse APIs
- `db:read` — Read-only query access

## Development

```bash
deno task test
deno fmt --check
deno lint
```

## License

MIT
