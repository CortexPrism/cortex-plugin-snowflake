/**
 * Type definitions for CortexPrism plugin development.
 *
 * These types are inlined here because there is no published
 * `cortex/plugins` package on any registry.  The Cortex host
 * provides equivalent types at runtime, but for standalone
 * development and testing we declare them locally.
 *
 * Reference: https://cortexprism.io/docs/developer-guide
 */

// ---------------------------------------------------------------------------
// Tool types
// ---------------------------------------------------------------------------

export interface ToolParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  enum?: string[];
  /** @deprecated Use manifest-level config defaults instead. */
  default?: unknown;
  /** @deprecated Use manifest-level config defaults instead. */
  defaultValue?: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  params: ToolParam[];
  capabilities: string[];
}

export interface ToolCallResult {
  toolName: string;
  success: boolean;
  output: string;
  error?: string;
  durationMs: number;
}

export interface ToolContext {
  sessionId: string;
  workingDir: string;
  agentId: string;
  workspaceDir: string;
  approvalGate?: (tool: string, command: string) => Promise<boolean>;
}

export interface Tool {
  definition: ToolDefinition;
  execute(
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolCallResult>;
}

// ---------------------------------------------------------------------------
// Store interfaces
// ---------------------------------------------------------------------------

export interface PluginStateStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<Record<string, string>>;
}

export interface PluginConfigStore {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  getAll(): Promise<Record<string, unknown>>;
}

export interface PluginLogger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  debug(msg: string): void;
}

export interface HostApi {
  registerTool(tool: Tool): void;
  unregisterTool(name: string): void;
}

// ---------------------------------------------------------------------------
// Plugin context
// ---------------------------------------------------------------------------

export interface PluginContext {
  pluginId: string;
  pluginDir: string;
  state: PluginStateStore;
  config: PluginConfigStore;
  logger: PluginLogger;
  host: HostApi;
}
