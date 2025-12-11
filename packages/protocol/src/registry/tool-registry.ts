import type { Tool, ToolContext, ToolResult } from '../types/tool';
import { EventBus } from '../bus/event-bus';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  async register(tool: Tool): Promise<void> {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }

    if (tool.onLoad) {
      await tool.onLoad();
    }

    this.tools.set(tool.name, tool);
  }

  async unregister(name: string): Promise<void> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" is not registered`);
    }

    if (tool.onUnload) {
      await tool.onUnload();
    }

    this.tools.delete(name);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  listByCategory(category: string): Tool[] {
    return this.list().filter((tool) => tool.category === category);
  }

  async execute<TInput = unknown, TOutput = unknown>(
    name: string,
    input: TInput,
    context: ToolContext
  ): Promise<ToolResult<TOutput>> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Tool "${name}" is not registered`,
        },
      };
    }

    const startTime = Date.now();

    try {
      const result = await (tool as Tool<TInput, TOutput>).execute(input, context);
      return {
        ...result,
        metadata: {
          duration: Date.now() - startTime,
          cached: false,
          ...result.metadata,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TOOL_EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        metadata: {
          duration: Date.now() - startTime,
          cached: false,
        },
      };
    }
  }
}
