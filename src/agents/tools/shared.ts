import { z } from "zod";
import type { AgentUIAction } from "@/lib/chat-contract";

export type ToolContext = { userId: string | null; requestId: string };
export type ToolResult = { data: unknown; action?: AgentUIAction; ok: boolean };
export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (input: unknown, context: ToolContext) => Promise<ToolResult>;
};

export const failure = (code: string, message: string): ToolResult => ({ ok: false, data: { error: { code, message } } });

export function defineTool<S extends z.ZodTypeAny>(spec: {
  name: string;
  description: string;
  schema: S;
  parameters: Record<string, unknown>;
  run: (input: z.output<S>, context: ToolContext) => Promise<ToolResult>;
}): ToolDefinition {
  return {
    name: spec.name, description: spec.description, parameters: spec.parameters,
    async execute(input, context) {
      const parsed = spec.schema.safeParse(input);
      if (!parsed.success) return failure("INVALID_ARGUMENTS", "Parameter alat tidak valid. Periksa batas dan kolom yang didukung.");
      return spec.run(parsed.data, context);
    },
  };
}

export const idSchema = z.string().trim().min(1).max(100);
export const slugSchema = z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const idJson = { type: "string", minLength: 1, maxLength: 100 };
export const slugJson = { type: "string", minLength: 1, maxLength: 120, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" };
export const textJson = (maxLength: number) => ({ type: "string", minLength: 1, maxLength });
export const objectJson = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object", properties, required, additionalProperties: false,
});
