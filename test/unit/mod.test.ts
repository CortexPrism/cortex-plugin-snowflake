import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { tools } from '../../mod.ts';
import type { PluginContext, ToolContext } from '../../types.ts';

// Mock PluginContext
const mockContext: PluginContext & ToolContext = {
  pluginId: 'cortex-plugin-snowflake',
  pluginDir: '/tmp/plugins/cortex-plugin-snowflake',
  state: {
    get: async () => null,
    set: async () => {},
    delete: async () => {},
    list: async () => ({}),
  },
  config: {
    get: async () => null,
    set: async () => {},
    getAll: async () => ({}),
  },
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
  host: {
    registerTool: () => {},
    unregisterTool: () => {},
  },
  sessionId: 'test-session',
  workingDir: '/tmp',
  agentId: 'test-agent',
  workspaceDir: '/tmp',
};

function findTool(name: string) {
  const tool = tools.find((t) => t.definition.name === name);
  if (!tool) throw new Error(`Tool "${name}" not found`);
  return tool;
}

Deno.test('tools array — exports all tools', () => {
  assertEquals(tools.length, 5);
  assertEquals(tools[0].definition.name, 'warehouse_query');
  assertEquals(tools[1].definition.name, 'warehouse_list_tables');
  assertEquals(tools[2].definition.name, 'warehouse_describe');
  assertEquals(tools[3].definition.name, 'warehouse_explain');
  assertEquals(tools[4].definition.name, 'warehouse_generate_report');
});

Deno.test('warehouse_query — rejects empty query', async () => {
  const tool = findTool('warehouse_query');
  const result = await tool.execute({ 'query': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('warehouse_list_tables — tool is defined with name and description', () => {
  const tool = findTool('warehouse_list_tables');
  assertEquals(typeof tool.definition.description, 'string');
  assertEquals(tool.definition.description.length > 0, true);
});

Deno.test('warehouse_describe — rejects empty table_name', async () => {
  const tool = findTool('warehouse_describe');
  const result = await tool.execute({ 'table_name': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('warehouse_explain — rejects empty query', async () => {
  const tool = findTool('warehouse_explain');
  const result = await tool.execute({ 'query': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('warehouse_generate_report — rejects empty query', async () => {
  const tool = findTool('warehouse_generate_report');
  const result = await tool.execute({ 'query': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('all tools return durationMs', async () => {
  for (const tool of tools) {
    const args: Record<string, unknown> = {};
    const result = await tool.execute(args, mockContext);
    assertEquals(typeof result.durationMs, 'number');
    assertEquals(result.durationMs >= 0, true);
  }
});
