import { z } from "zod";

export const chatRequestSchema = z.object({
  conversationId: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  requestId: z.string().uuid(),
  message: z.string().trim().min(1).max(1000),
}).strict();

export const agentUIActionSchema = z.object({
  id: z.string().min(1).max(120),
  type: z.literal("ADD_TO_CART"),
  payload: z.object({
    product: z.object({
      id: z.string().min(1).max(100),
      slug: z.string().min(1).max(160),
      name: z.string().min(1).max(300),
      price: z.number().int().min(0).max(100_000_000),
      imageUrl: z.string().max(2000).nullable(),
    }).strict(),
    quantity: z.number().int().min(1).max(20),
  }).strict(),
}).strict();

export const executionEventSchema = z.object({
  type: z.enum(["REQUEST_RECEIVED", "TOOL_SELECTED", "TOOL_RESULT", "UI_ACTION"]),
  tool: z.string().max(60).optional(),
  outcome: z.enum(["ok", "error"]).optional(),
  durationMs: z.number().nonnegative().optional(),
}).strict();

// Unsupported/malformed actions are dropped individually, never executed dynamically.
const actionsSchema = z.array(z.unknown()).max(12).transform((actions) =>
  actions.flatMap((action) => {
    const result = agentUIActionSchema.safeParse(action);
    return result.success ? [result.data] : [];
  }),
);

export const chatResponseSchema = z.object({
  conversationId: z.string().regex(/^[a-f0-9]{64}$/),
  requestId: z.string().uuid(),
  reply: z.string().min(1).max(6000),
  actions: actionsSchema,
  events: z.array(executionEventSchema).max(50).optional(),
});

export const chatHistorySchema = z.object({
  conversationId: z.string().regex(/^[a-f0-9]{64}$/),
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(["user", "assistant"]),
    content: z.string().max(6000),
  })).max(40),
  pendingRequest: z.object({ requestId: z.string().uuid(), message: z.string().max(1000) }).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type ChatHistory = z.infer<typeof chatHistorySchema>;
export type AgentUIAction = z.infer<typeof agentUIActionSchema>;
export type ExecutionEvent = z.infer<typeof executionEventSchema>;
