import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { tools } from "../../mod.ts";
import type { PluginContext } from 'cortex/plugins';

// Mock PluginContext
const mockContext: PluginContext = {
  pluginId: "example-plugin",
  pluginDir: "/tmp/plugins/example-plugin",
  state: {
    get: async () => null,
    set: async () => {},
  },
  config: {},
};

// Find tools by name helper
function findTool(name: string) {
  return tools.find(t => t.definition.name === name);
}

// Test: hello tool
Deno.test("hello tool - greets with name", async () => {
  const tool = findTool("hello");
  if (!tool) throw new Error("hello tool not found");
  
  const result = await tool.execute({ name: "Alice" }, mockContext);
  assertEquals(result.success, true);
  assertStringIncludes(result.output, "Hello, Alice");
});

Deno.test("hello tool - rejects empty name", async () => {
  const tool = findTool("hello");
  if (!tool) throw new Error("hello tool not found");
  
  const result = await tool.execute({ name: "" }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, "non-empty string");
});

Deno.test("hello tool - rejects non-string", async () => {
  const tool = findTool("hello");
  if (!tool) throw new Error("hello tool not found");
  
  const result = await tool.execute({ name: 123 }, mockContext);
  assertEquals(result.success, false);
});

// Test: add tool
Deno.test("add tool - adds numbers correctly", async () => {
  const tool = findTool("add");
  if (!tool) throw new Error("add tool not found");
  
  const result = await tool.execute({ a: 5, b: 3 }, mockContext);
  assertEquals(result.success, true);
  assertEquals(result.output, "8");
});

Deno.test("add tool - adds negative numbers", async () => {
  const tool = findTool("add");
  if (!tool) throw new Error("add tool not found");
  
  const result = await tool.execute({ a: -5, b: 3 }, mockContext);
  assertEquals(result.success, true);
  assertEquals(result.output, "-2");
});

Deno.test("add tool - rejects non-numbers", async () => {
  const tool = findTool("add");
  if (!tool) throw new Error("add tool not found");
  
  const result = await tool.execute({ a: "5", b: "3" }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, "numbers");
});

// Test: fetch_data tool
Deno.test("fetch_data tool - rejects empty URL", async () => {
  const tool = findTool("fetch_data");
  if (!tool) throw new Error("fetch_data tool not found");
  
  const result = await tool.execute({ url: "" }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, "non-empty string");
});

Deno.test("fetch_data tool - rejects non-HTTPS URLs", async () => {
  const tool = findTool("fetch_data");
  if (!tool) throw new Error("fetch_data tool not found");
  
  const result = await tool.execute({ url: "http://example.com" }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, "HTTPS");
});

// Test: tools are exported
Deno.test("tools array exported", () => {
  assertEquals(tools.length, 3);
  assertEquals(tools[0].definition.name, "hello");
  assertEquals(tools[1].definition.name, "add");
  assertEquals(tools[2].definition.name, "fetch_data");
});
