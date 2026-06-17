import type { PluginContext, Tool, ToolCallResult, ToolContext } from './types.ts';

let config: Record<string, string> = {};

async function resolveConfig(ctx: PluginContext): Promise<Record<string, string>> {
  const keys = [
    'snowflakeAccount',
    'snowflakeUser',
    'snowflakePassword',
    'snowflakeWarehouse',
    'snowflakeDatabase',
    'bigqueryProjectId',
    'bigqueryCredentials',
  ];
  const cfg: Record<string, string> = {};
  for (const k of keys) {
    cfg[k] = (await ctx.config.get(k)) ?? '';
  }
  return cfg;
}

export async function onLoad(ctx: PluginContext): Promise<void> {
  config = await resolveConfig(ctx);
}

function getWarehouse(warehouse?: unknown): string {
  if (typeof warehouse === 'string' && warehouse === 'bigquery') return 'bigquery';
  return 'snowflake';
}

function warehouseConfigured(w: string): string | null {
  if (w === 'snowflake') {
    if (!config.snowflakeAccount || !config.snowflakeUser || !config.snowflakePassword) {
      return 'Snowflake credentials not configured (account, user, password)';
    }
  } else {
    if (!config.bigqueryProjectId || !config.bigqueryCredentials) {
      return 'BigQuery credentials not configured (projectId, credentials)';
    }
  }
  return null;
}

async function executeQuery(
  query: string,
  w: string,
  timeoutMs = 30000,
): Promise<{ ok: boolean; data: unknown; error?: string }> {
  const err = warehouseConfigured(w);
  if (err) return { ok: false, data: null, error: err };
  if (w === 'snowflake') {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(
        `https://${config.snowflakeAccount}.snowflakecomputing.com/api/v2/statements`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.snowflakePassword}`,
            'Content-Type': 'application/json',
            'User-Agent': 'CortexPrism-SnowflakePlugin/1.0.0',
            'X-Snowflake-Authorization-Token-Type': 'KEYPAIR_JWT',
          },
          body: JSON.stringify({
            statement: query,
            warehouse: config.snowflakeWarehouse,
            database: config.snowflakeDatabase,
          }),
          signal: controller.signal,
        },
      );
      clearTimeout(t);
      if (!res.ok) {
        const txt = await res.text();
        return { ok: false, data: null, error: `Snowflake error ${res.status}: ${txt}` };
      }
      const data = await res.json();
      return { ok: true, data };
    } catch (e) {
      clearTimeout(t);
      if (e instanceof Error && e.name === 'AbortError') {
        return { ok: false, data: null, error: 'Request timeout' };
      }
      return { ok: false, data: null, error: e instanceof Error ? e.message : String(e) };
    }
  } else {
    let creds: Record<string, unknown>;
    try {
      creds = JSON.parse(config.bigqueryCredentials);
    } catch {
      return { ok: false, data: null, error: 'BigQuery credentials must be valid JSON' };
    }
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(
        `https://bigquery.googleapis.com/bigquery/v2/projects/${config.bigqueryProjectId}/queries`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${creds.private_key || ''}`,
            'Content-Type': 'application/json',
            'User-Agent': 'CortexPrism-SnowflakePlugin/1.0.0',
          },
          body: JSON.stringify({ query, useLegacySql: false }),
          signal: controller.signal,
        },
      );
      clearTimeout(t);
      if (!res.ok) {
        const txt = await res.text();
        return { ok: false, data: null, error: `BigQuery error ${res.status}: ${txt}` };
      }
      const data = await res.json();
      return { ok: true, data };
    } catch (e) {
      clearTimeout(t);
      if (e instanceof Error && e.name === 'AbortError') {
        return { ok: false, data: null, error: 'Request timeout' };
      }
      return { ok: false, data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }
}

const warehouseQueryTool: Tool = {
  definition: {
    name: 'warehouse_query',
    description: 'Run an analytical query against a cloud data warehouse',
    params: [
      { name: 'query', type: 'string', description: 'SQL query to execute', required: true },
      {
        name: 'warehouse',
        type: 'string',
        description: 'Target warehouse',
        required: false,
        defaultValue: 'snowflake',
        options: ['snowflake', 'bigquery'],
      },
      {
        name: 'max_rows',
        type: 'number',
        description: 'Maximum rows to return',
        required: false,
        defaultValue: 1000,
      },
    ],
    capabilities: ['db:read'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const query = args.query;
      if (!query || typeof query !== 'string') {
        return {
          toolName: 'warehouse_query',
          success: false,
          output: '',
          error: 'query must be a non-empty string',
          durationMs: Date.now() - start,
        };
      }
      const w = getWarehouse(args.warehouse);
      const result = await executeQuery(query, w);
      if (!result.ok) {
        return {
          toolName: 'warehouse_query',
          success: false,
          output: '',
          error: result.error || 'Query failed',
          durationMs: Date.now() - start,
        };
      }
      return {
        toolName: 'warehouse_query',
        success: true,
        output: JSON.stringify(result.data, null, 2),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'warehouse_query',
        success: false,
        output: '',
        error: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const warehouseListTablesTool: Tool = {
  definition: {
    name: 'warehouse_list_tables',
    description: 'List tables or datasets in the warehouse',
    params: [
      {
        name: 'warehouse',
        type: 'string',
        description: 'Target warehouse',
        required: false,
        defaultValue: 'snowflake',
        options: ['snowflake', 'bigquery'],
      },
      {
        name: 'schema',
        type: 'string',
        description: 'Schema or dataset name to filter by',
        required: false,
      },
    ],
    capabilities: ['db:read'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const w = getWarehouse(args.warehouse);
      const schema = typeof args.schema === 'string' && args.schema ? args.schema : null;
      let query: string;
      if (w === 'snowflake') {
        query =
          "SELECT table_schema, table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE'";
        if (schema) query += ` AND table_schema = '${schema}'`;
        query += ' ORDER BY table_schema, table_name';
      } else {
        const projectId = config.bigqueryProjectId || '';
        query = `SELECT table_name FROM \`${projectId}\`.INFORMATION_SCHEMA.TABLES`;
      }
      const result = await executeQuery(query, w);
      if (!result.ok) {
        return {
          toolName: 'warehouse_list_tables',
          success: false,
          output: '',
          error: result.error || 'Query failed',
          durationMs: Date.now() - start,
        };
      }
      return {
        toolName: 'warehouse_list_tables',
        success: true,
        output: JSON.stringify(result.data, null, 2),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'warehouse_list_tables',
        success: false,
        output: '',
        error: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const warehouseDescribeTool: Tool = {
  definition: {
    name: 'warehouse_describe',
    description: 'Describe the schema of a specific table',
    params: [
      {
        name: 'table_name',
        type: 'string',
        description: 'Fully-qualified table name',
        required: true,
      },
      {
        name: 'warehouse',
        type: 'string',
        description: 'Target warehouse',
        required: false,
        defaultValue: 'snowflake',
        options: ['snowflake', 'bigquery'],
      },
    ],
    capabilities: ['db:read'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const tableName = args.table_name;
      if (!tableName || typeof tableName !== 'string') {
        return {
          toolName: 'warehouse_describe',
          success: false,
          output: '',
          error: 'table_name must be a non-empty string',
          durationMs: Date.now() - start,
        };
      }
      const w = getWarehouse(args.warehouse);
      let query: string;
      if (w === 'snowflake') {
        query = `DESCRIBE TABLE ${tableName}`;
      } else {
        const parts = tableName.split('.');
        const dataset = parts.length > 1 ? parts[0] : '';
        const tbl = parts.length > 1 ? parts[1] : tableName;
        const projectId = config.bigqueryProjectId || '';
        query =
          `SELECT column_name, data_type, is_nullable FROM \`${projectId}\`.\`${dataset}\`.INFORMATION_SCHEMA.COLUMNS WHERE table_name = '${tbl}'`;
      }
      const result = await executeQuery(query, w);
      if (!result.ok) {
        return {
          toolName: 'warehouse_describe',
          success: false,
          output: '',
          error: result.error || 'Query failed',
          durationMs: Date.now() - start,
        };
      }
      return {
        toolName: 'warehouse_describe',
        success: true,
        output: JSON.stringify(result.data, null, 2),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'warehouse_describe',
        success: false,
        output: '',
        error: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const warehouseExplainTool: Tool = {
  definition: {
    name: 'warehouse_explain',
    description: 'Get the query execution plan for analysis',
    params: [
      { name: 'query', type: 'string', description: 'SQL query to explain', required: true },
      {
        name: 'warehouse',
        type: 'string',
        description: 'Target warehouse',
        required: false,
        defaultValue: 'snowflake',
        options: ['snowflake', 'bigquery'],
      },
    ],
    capabilities: ['db:read'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const query = args.query;
      if (!query || typeof query !== 'string') {
        return {
          toolName: 'warehouse_explain',
          success: false,
          output: '',
          error: 'query must be a non-empty string',
          durationMs: Date.now() - start,
        };
      }
      const w = getWarehouse(args.warehouse);
      const explainQuery = w === 'snowflake' ? `EXPLAIN ${query}` : `EXPLAIN ${query}`;
      const result = await executeQuery(explainQuery, w);
      if (!result.ok) {
        return {
          toolName: 'warehouse_explain',
          success: false,
          output: '',
          error: result.error || 'Explain failed',
          durationMs: Date.now() - start,
        };
      }
      return {
        toolName: 'warehouse_explain',
        success: true,
        output: JSON.stringify(result.data, null, 2),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'warehouse_explain',
        success: false,
        output: '',
        error: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const warehouseGenerateReportTool: Tool = {
  definition: {
    name: 'warehouse_generate_report',
    description: 'Generate a report with chart from a query',
    params: [
      {
        name: 'query',
        type: 'string',
        description: 'SQL query for the report data',
        required: true,
      },
      { name: 'title', type: 'string', description: 'Report title', required: true },
      {
        name: 'chart_type',
        type: 'string',
        description: 'Chart visualization type',
        required: false,
        defaultValue: 'table',
        options: ['bar', 'line', 'pie', 'table', 'area'],
      },
      {
        name: 'warehouse',
        type: 'string',
        description: 'Target warehouse',
        required: false,
        defaultValue: 'snowflake',
        options: ['snowflake', 'bigquery'],
      },
    ],
    capabilities: ['db:read'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const query = args.query;
      const title = args.title;
      const chartType = typeof args.chart_type === 'string' ? args.chart_type : 'table';
      if (!query || typeof query !== 'string') {
        return {
          toolName: 'warehouse_generate_report',
          success: false,
          output: '',
          error: 'query must be a non-empty string',
          durationMs: Date.now() - start,
        };
      }
      if (!title || typeof title !== 'string') {
        return {
          toolName: 'warehouse_generate_report',
          success: false,
          output: '',
          error: 'title must be a non-empty string',
          durationMs: Date.now() - start,
        };
      }
      if (!['bar', 'line', 'pie', 'table', 'area'].includes(chartType)) {
        return {
          toolName: 'warehouse_generate_report',
          success: false,
          output: '',
          error: 'chart_type must be one of: bar, line, pie, table, area',
          durationMs: Date.now() - start,
        };
      }
      const w = getWarehouse(args.warehouse);
      const result = await executeQuery(query, w);
      if (!result.ok) {
        return {
          toolName: 'warehouse_generate_report',
          success: false,
          output: '',
          error: result.error || 'Query failed',
          durationMs: Date.now() - start,
        };
      }
      const report = {
        title,
        chart_type: chartType,
        warehouse: w,
        data: result.data,
        generated_at: new Date().toISOString(),
      };
      return {
        toolName: 'warehouse_generate_report',
        success: true,
        output: JSON.stringify(report, null, 2),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'warehouse_generate_report',
        success: false,
        output: '',
        error: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

export async function onUnload(_ctx: PluginContext): Promise<void> {}

export const tools: Tool[] = [
  warehouseQueryTool,
  warehouseListTablesTool,
  warehouseDescribeTool,
  warehouseExplainTool,
  warehouseGenerateReportTool,
];
