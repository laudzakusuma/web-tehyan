import type OpenAI from "openai";
import { z } from "zod";
import { agentUIActionSchema, type AgentUIAction, type ExecutionEvent } from "@/lib/chat-contract";
import { completeAgentTurn, createProviderSession, AgentProviderError, PROVIDER_TIMEOUT_MS } from "./provider";
import { SYSTEM_PROMPT } from "./prompt";
import { toolDefs, runTool } from "./tools";

const MAX_ROUNDS = 4;
const MAX_CALLS_PER_ROUND = 3;
const MAX_CALLS = 12;
const MAX_HISTORY_MESSAGES = 18;
const MAX_HISTORY_CHARS = 18_000;
const MAX_RESULT_CHARS = 12_000;
const MAX_REPLY_CHARS = 6000;
const RUN_TIMEOUT_MS = 45_000;
const UNVERIFIED_REPLY = "Maaf, saya belum bisa memastikan informasi itu dari sistem. Coba lagi sebentar, ya.";
const INCOMPLETE_REPLY = "Informasinya belum cukup untuk saya pastikan. Coba sebutkan produk atau outlet yang ingin ditanyakan, ya.";
const factualFailureSchema = z.object({
  error: z.object({ code: z.enum(["NOT_FOUND", "UNAVAILABLE"]), message: z.string().min(1).max(1000) }),
});

export type ChatMsg = { role: "user" | "assistant"; content: string };
type AgentContext = { userId: string | null; requestId: string };
type AgentResult = { reply: string; actions: AgentUIAction[]; toolsUsed: string[]; events: ExecutionEvent[] };

function boundedHistory(history: ChatMsg[]): ChatMsg[] {
  let remaining = MAX_HISTORY_CHARS;
  const recent: ChatMsg[] = [];
  for (const message of history.slice(-MAX_HISTORY_MESSAGES).reverse()) {
    if (remaining <= 0) break;
    const content = message.content.slice(0, Math.min(MAX_REPLY_CHARS, remaining));
    recent.push({ role: message.role, content });
    remaining -= content.length;
  }
  return recent.reverse();
}

function serializeResult(data: unknown): { content: string; complete: boolean } {
  try {
    const content = JSON.stringify(data);
    if (content && content.length <= MAX_RESULT_CHARS) return { content, complete: true };
  } catch {
    // Invalid or oversized tool payloads never become partial, misleading JSON.
  }
  return { content: JSON.stringify({ error: "Hasil terlalu besar atau tidak dapat dibaca. Gunakan pencarian yang lebih spesifik." }), complete: false };
}

async function beforeDeadline<T>(work: () => Promise<T>, deadline: number): Promise<T> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new AgentProviderError("LLM_TIMEOUT");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new AgentProviderError("LLM_TIMEOUT")), remaining);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function cartConfirmation(actions: AgentUIAction[]): string {
  const items = actions.map(({ payload }) => `• ${payload.quantity} × ${payload.product.name}`).join("\n");
  return `Usulan keranjang:\n${items}\n\nKlik “Tambah ke keranjang” pada pilihan di bawah untuk mengonfirmasi. Keranjang belum berubah.`;
}

export async function runAgent(history: ChatMsg[], ctx: AgentContext): Promise<AgentResult> {
  const deadline = Date.now() + RUN_TIMEOUT_MS;
  const providerSession = createProviderSession();
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT }, ...boundedHistory(history),
  ];
  const actions: AgentUIAction[] = [];
  const toolsUsed = new Set<string>();
  const events: ExecutionEvent[] = [{ type: "REQUEST_RECEIVED" }];
  const knownNames = new Set(toolDefs.map((tool) => tool.function.name));
  const proposedProducts = new Set<string>();
  let totalCalls = 0;
  let hasEvidence = false;
  let factualFailure: string | undefined;

  const finish = (content?: string | null): AgentResult => ({
    reply: (actions.length ? cartConfirmation(actions) : hasEvidence ? content?.trim() || INCOMPLETE_REPLY : factualFailure ?? UNVERIFIED_REPLY).slice(0, MAX_REPLY_CHARS),
    actions,
    toolsUsed: [...toolsUsed],
    events,
  });

  for (let round = 0; round <= MAX_ROUNDS; round++) {
    const finalOnly = round === MAX_ROUNDS || totalCalls >= MAX_CALLS;
    if (finalOnly) messages.push({ role: "system", content: "Batas tool tercapai. Jawab hanya berdasarkan hasil tool yang berhasil; jelaskan jika informasi belum cukup. Jangan meminta tool lagi." });
    const message = await beforeDeadline(() => completeAgentTurn({
      messages,
      tools: toolDefs,
      // A tool is required even for the first reply: business answers never skip retrieval.
      toolChoice: finalOnly ? "none" : round === 0 ? "required" : "auto",
      timeoutMs: Math.min(PROVIDER_TIMEOUT_MS, deadline - Date.now()),
      session: providerSession,
    }), deadline);

    if (!message.tool_calls?.length) return finish(message.content);
    if (finalOnly) return finish(INCOMPLETE_REPLY);

    // Discard surplus requests and duplicate IDs before creating the assistant/tool pair.
    const callIds = new Set<string>();
    const calls = message.tool_calls.filter((call) => {
      if (callIds.has(call.id)) return false;
      callIds.add(call.id);
      return true;
    }).slice(0, Math.min(MAX_CALLS_PER_ROUND, MAX_CALLS - totalCalls));
    messages.push({ role: "assistant", content: message.content?.slice(0, MAX_REPLY_CHARS) ?? null, tool_calls: calls });

    for (const call of calls) {
      totalCalls++;
      const name = call.function.name;
      const safeName = knownNames.has(name) ? name : "unknown";
      events.push({ type: "TOOL_SELECTED", tool: safeName });
      const started = Date.now();
      let result: Awaited<ReturnType<typeof runTool>>;
      if (!knownNames.has(name)) {
        result = { ok: false, data: { error: "Tool tidak dikenal. Gunakan tool yang tersedia." } };
      } else {
        toolsUsed.add(name);
        try {
          result = await beforeDeadline(() => runTool(name, call.function.arguments, ctx), deadline);
        } catch (error) {
          if (error instanceof AgentProviderError) throw error;
          result = { ok: false, data: { error: "Informasi belum bisa diakses. Coba lagi sebentar." } };
        }
      }
      let serialized = serializeResult(result.data);
      let successful = result.ok && serialized.complete;
      const action = name === "addToCart" && successful
        ? agentUIActionSchema.safeParse(result.action ? { ...result.action, id: `${ctx.requestId}:${actions.length + 1}` } : undefined)
        : undefined;
      if (action && !action.success) {
        successful = false;
        serialized = serializeResult({ error: "Usulan keranjang belum bisa disiapkan. Coba lagi sebentar." });
      }
      hasEvidence ||= successful;
      if (!result.ok) {
        // These negative facts are safe server-authored messages, never model-generated claims.
        const failure = factualFailureSchema.safeParse(result.data);
        if (failure.success) factualFailure = failure.data.error.message;
      }
      events.push({ type: "TOOL_RESULT", tool: safeName, outcome: successful ? "ok" : "error", durationMs: Math.max(0, Date.now() - started) });

      if (action?.success && !proposedProducts.has(action.data.payload.product.id)) {
        proposedProducts.add(action.data.payload.product.id);
        actions.push(action.data);
        events.push({ type: "UI_ACTION", tool: safeName, outcome: "ok" });
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: serialized.content });
    }
  }
  return finish(INCOMPLETE_REPLY);
}
