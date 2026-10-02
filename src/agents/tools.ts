import { productTools } from "./tools/products";
import { outletTools } from "./tools/outlets";
import { supportTools } from "./tools/support";
import { failure, type ToolContext, type ToolResult } from "./tools/shared";

export type { ToolContext, ToolResult } from "./tools/shared";

const registry = new Map([...productTools, ...outletTools, ...supportTools].map((tool) => [tool.name, tool]));

export const toolDefs = [...registry.values()].map((tool) => ({
  type: "function" as const,
  function: { name: tool.name, description: tool.description, parameters: tool.parameters },
}));

export async function runTool(name: string, rawArgs: string, context: ToolContext): Promise<ToolResult> {
  const tool = registry.get(name);
  if (!tool) return failure("UNKNOWN_TOOL", "Alat tidak dikenal.");
  if (rawArgs.length > 8000) return failure("INVALID_ARGUMENTS", "Parameter alat terlalu panjang.");
  let input: unknown;
  try {
    input = JSON.parse(rawArgs);
  } catch {
    return failure("INVALID_ARGUMENTS", "Parameter alat bukan JSON yang valid.");
  }
  try {
    return await tool.execute(input, context);
  } catch {
    // Do not conflate database/provider failures with model argument validation.
    return failure("SERVICE_UNAVAILABLE", "Data belum dapat diakses. Coba lagi sebentar atau hubungi kedai.");
  }
}
