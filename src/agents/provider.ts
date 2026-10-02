import OpenAI, { APIConnectionError, APIConnectionTimeoutError, APIError } from "openai";
import { z } from "zod";

export const PROVIDER_TIMEOUT_MS = 12_000;
export const PROVIDER_MAX_ATTEMPTS = 3;

type FailureCategory = "RATE_LIMIT" | "CAPACITY" | "AUTH" | "ACCESS" | "REQUEST" | "TIMEOUT" | "NETWORK" | "OTHER";
export type ProviderEvent = {
  event: "provider_failure" | "provider_retry" | "primary_model_unavailable" | "fallback_model_used";
  model: string;
  attempt: number;
  category: FailureCategory;
  status?: number;
  decision: "retry" | "fallback" | "stop" | "budget_exhausted";
  waitMs?: number;
};
export type ProviderSession = {
  model?: string;
  fallbackUsed: boolean;
  onEvent?: (event: ProviderEvent) => void;
};

/** One session per agent run; never shared across requests or persisted in chat. */
export const createProviderSession = (onEvent?: ProviderSession["onEvent"]): ProviderSession => ({ fallbackUsed: false, onEvent });

function observe(session: ProviderSession, event: ProviderEvent) {
  try {
    if (session.onEvent) session.onEvent(event);
    else console.warn("[agent-provider]", event);
  } catch {
    // Diagnostic transport must never cause another provider request or action.
  }
}

function classify(error: unknown, aborted: boolean): { category: FailureCategory; status?: number; transient: boolean } {
  if (aborted || error instanceof APIConnectionTimeoutError || error instanceof AgentProviderError && error.code === "LLM_TIMEOUT") {
    return { category: "TIMEOUT", transient: false };
  }
  if (error instanceof APIConnectionError) return { category: "NETWORK", transient: false };
  const status = error instanceof APIError ? error.status : undefined;
  const category = status === 429 ? "RATE_LIMIT" : status === 503 ? "CAPACITY" : status === 401 ? "AUTH" :
    status === 403 ? "ACCESS" : status === 400 ? "REQUEST" : "OTHER";
  return { category, status, transient: status === 429 || status === 503 };
}

function retryAfterMs(error: unknown): number {
  if (!(error instanceof APIError)) return 0;
  const value = error.headers?.["retry-after"] ?? error.headers?.["Retry-After"];
  if (typeof value !== "string" || !value.trim()) return 0;
  const header = value.trim();
  if (/^\d+$/.test(header)) return Number(header) * 1000;
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
}

type ProviderErrorCode = "LLM_NOT_CONFIGURED" | "LLM_TIMEOUT" | "LLM_UNAVAILABLE" | "LLM_INVALID_RESPONSE";
const errorMessages: Record<ProviderErrorCode, string> = {
  LLM_NOT_CONFIGURED: "Tanya Tehyan belum terhubung ke layanan AI. Silakan coba lagi nanti.",
  LLM_TIMEOUT: "Tanya Tehyan membutuhkan waktu terlalu lama. Coba kirim pesan lagi, ya.",
  LLM_UNAVAILABLE: "Maaf, Tanya Tehyan belum bisa mengakses layanan AI. Coba lagi sebentar, ya.",
  LLM_INVALID_RESPONSE: "Jawaban Tanya Tehyan belum bisa diproses. Coba kirim pesan lagi, ya.",
};

// Never attach provider errors: their messages/bodies can contain credentials or conversation data.
export class AgentProviderError extends Error {
  constructor(public readonly code: ProviderErrorCode) {
    super(errorMessages[code]);
    this.name = "AgentProviderError";
  }
}

const toolCallSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.literal("function"),
  function: z.object({
    name: z.string().min(1).max(60),
    arguments: z.string().max(4000),
  }),
  // Gemini requires this opaque signature on the next tool turn. It is protocol
  // metadata, never decoded, displayed, logged, or persisted as conversation text.
  extra_content: z.object({
    google: z.object({ thought_signature: z.string().min(1).max(64_000) }).optional(),
  }).optional(),
});
const providerMessageSchema = z.object({
  role: z.literal("assistant"),
  content: z.string().max(64_000).nullable().optional(),
  tool_calls: z.array(toolCallSchema).max(64).optional(),
});

export type ProviderMessage = z.infer<typeof providerMessageSchema>;
type CompletionInput = {
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  tools: OpenAI.Chat.ChatCompletionTool[];
  toolChoice: "required" | "auto" | "none";
  timeoutMs: number;
  session?: ProviderSession;
};

export async function completeAgentTurn(input: CompletionInput): Promise<ProviderMessage> {
  const apiKey = process.env.LLM_API_KEY?.trim();
  const primaryModel = process.env.LLM_MODEL?.trim();
  const fallbackModel = process.env.LLM_FALLBACK_MODEL?.trim();
  if (!apiKey || !primaryModel) throw new AgentProviderError("LLM_NOT_CONFIGURED");

  const session = input.session ?? createProviderSession();
  let model = session.model ?? primaryModel;
  let attempt = 1;
  const timeoutMs = Math.max(1, Math.min(PROVIDER_TIMEOUT_MS, input.timeoutMs));
  const deadline = Date.now() + timeoutMs;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let backoffTimer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Construct on demand so builds and unrelated routes work without LLM configuration.
    const client = new OpenAI({
      apiKey,
      baseURL: process.env.LLM_BASE_URL?.trim() || undefined,
      timeout: timeoutMs,
      maxRetries: 0,
    });
    const expired = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new AgentProviderError("LLM_TIMEOUT"));
      }, timeoutMs);
    });
    while (true) {
      try {
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new AgentProviderError("LLM_TIMEOUT");
        const response = await Promise.race([
          client.chat.completions.create({
            model, messages: input.messages, tools: input.tools,
            tool_choice: input.toolChoice, max_tokens: 1600,
          }, { signal: controller.signal, timeout: remaining }),
          expired,
        ]);

        // Strip reasoning extensions; retain only allowlisted tool-continuation metadata.
        const parsed = providerMessageSchema.safeParse(response.choices?.[0]?.message);
        if (!parsed.success) throw new AgentProviderError("LLM_INVALID_RESPONSE");
        session.model = model;
        return parsed.data;
      } catch (error) {
        const failure = classify(error, controller.signal.aborted);
        const retry = failure.transient && !session.fallbackUsed && attempt < PROVIDER_MAX_ATTEMPTS;
        // Switching after a successful completion could mix model-specific signatures.
        // Never replay an earlier tool round in order to make fallback possible.
        const fallback = failure.transient && !retry && !session.model && !session.fallbackUsed &&
          !!fallbackModel && fallbackModel !== primaryModel && !input.messages.some(message =>
            message.role === "tool" || message.role === "assistant" && !!message.tool_calls?.length);
        const delay = retry || fallback
          ? Math.max(500 * 2 ** (attempt - 1) * (1 + Math.random() * 0.5), retryAfterMs(error)) : 0;
        // Leave at least one second for the next attempt. Never shorten Retry-After
        // or bypass it by immediately sending to another model on the same account.
        const fits = delay + 1000 < deadline - Date.now();
        const decision = retry || fallback ? fits ? retry ? "retry" : "fallback" : "budget_exhausted" : "stop";
        const event: ProviderEvent = {
          event: "provider_failure", model, attempt, category: failure.category,
          ...(failure.status === undefined ? {} : { status: failure.status }), decision,
          ...(fits && delay > 0 ? { waitMs: Math.ceil(delay) } : {}),
        };
        observe(session, event);
        if (failure.transient && !session.fallbackUsed && attempt === PROVIDER_MAX_ATTEMPTS) {
          observe(session, { ...event, event: "primary_model_unavailable" });
        }
        if (decision === "stop" || decision === "budget_exhausted") {
          if (error instanceof AgentProviderError) throw error;
          throw new AgentProviderError(failure.category === "TIMEOUT" ? "LLM_TIMEOUT" : "LLM_UNAVAILABLE");
        }
        if (retry) observe(session, { ...event, event: "provider_retry" });
        await Promise.race([
          new Promise<void>(resolve => { backoffTimer = setTimeout(resolve, Math.ceil(delay)); }),
          expired,
        ]);
        if (fallback) {
          session.fallbackUsed = true;
          model = fallbackModel!;
          attempt = 1;
          observe(session, { ...event, event: "fallback_model_used", model, attempt });
        } else attempt++;
      }
    }
  } catch (error) {
    if (error instanceof AgentProviderError) throw error;
    if (controller.signal.aborted || error instanceof APIConnectionTimeoutError) {
      throw new AgentProviderError("LLM_TIMEOUT");
    }
    throw new AgentProviderError("LLM_UNAVAILABLE");
  } finally {
    if (timer) clearTimeout(timer);
    if (backoffTimer) clearTimeout(backoffTimer);
  }
}
