import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentUIAction } from "@/lib/chat-contract";

vi.mock("./provider", async (importOriginal) => ({
  ...await importOriginal<typeof import("./provider")>(), completeAgentTurn: vi.fn(),
}));
vi.mock("./tools", () => ({
  toolDefs: ["searchProducts", "getProductDetail", "addToCart", "checkOrderStatus"].map((name) => ({ type: "function", function: { name, parameters: {} } })),
  runTool: vi.fn(),
}));

import { runAgent, type ChatMsg } from "./runtime";
import { AgentProviderError, completeAgentTurn, type ProviderMessage } from "./provider";
import { runTool } from "./tools";

const complete = vi.mocked(completeAgentTurn);
const execute = vi.mocked(runTool);
const ctx = { userId: null, requestId: "b994c79d-20ee-4b22-9555-22e1ac87c301" };
const history: ChatMsg[] = [{ role: "user", content: "Ada teh di bawah 20rb?" }];
const call = (id = "call-1", name = "searchProducts", args = "{}") => ({ id, type: "function" as const, function: { name, arguments: args } });
const calls = (...tool_calls: NonNullable<ProviderMessage["tool_calls"]>): ProviderMessage => ({ role: "assistant", content: null, tool_calls });
const answer = (content = "Teh Lemon Madu tersedia dengan harga Rp18.000."): ProviderMessage => ({ role: "assistant", content });
const action: AgentUIAction = {
  id: "untrusted-id", type: "ADD_TO_CART", payload: {
    quantity: 1,
    product: { id: "product-1", slug: "teh-lemon-madu", name: "Teh Lemon Madu", price: 18_000, imageUrl: null },
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  execute.mockResolvedValue({ ok: true, data: { products: [{ id: "product-1", name: "Teh Lemon Madu", price: 18_000 }] } });
});
afterEach(() => vi.useRealTimers());

describe("bounded agent orchestration", () => {
  it("round-trips opaque Gemini tool metadata without exposing it in the result or trace", async () => {
    const signedCall = { ...call(), extra_content: { google: { thought_signature: "opaque-signature-fixture" } } };
    complete.mockResolvedValueOnce(calls(signedCall)).mockResolvedValueOnce(answer());
    const result = await runAgent(history, ctx);
    expect(complete.mock.calls[1][0].messages).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: "assistant", tool_calls: [signedCall] }),
    ]));
    expect(JSON.stringify(result)).not.toContain("opaque-signature-fixture");
    expect(JSON.stringify(result)).not.toContain("thought_signature");
  });
  it("requires retrieval, passes authoritative tool results, and preserves follow-up context", async () => {
    complete.mockResolvedValueOnce(calls(call("budget", "searchProducts", '{"maxPrice":20000}'))).mockResolvedValueOnce(answer());
    const messages: ChatMsg[] = [...history, { role: "assistant", content: "Teh Lemon Madu tersedia." }, { role: "user", content: "Yang tadi berapa?" }];
    const result = await runAgent(messages, ctx);
    expect(complete.mock.calls[0][0]).toMatchObject({ toolChoice: "required" });
    expect(complete.mock.calls[1][0]).toMatchObject({ toolChoice: "auto" });
    expect(complete.mock.calls[0][0].messages).toEqual(expect.arrayContaining(messages));
    expect(execute).toHaveBeenCalledWith("searchProducts", '{"maxPrice":20000}', ctx);
    expect(result).toMatchObject({ reply: "Teh Lemon Madu tersedia dengan harga Rp18.000.", toolsUsed: ["searchProducts"], actions: [] });
    expect(result.events).toEqual(expect.arrayContaining([{ type: "TOOL_RESULT", tool: "searchProducts", outcome: "ok", durationMs: expect.any(Number) }]));
  });

  it("blocks a provider answer that ignores required retrieval", async () => {
    complete.mockResolvedValue(answer("Matcha Strawberry Rp1.000 tersedia!"));
    const result = await runAgent(history, ctx);
    expect(result.reply).not.toContain("Matcha");
    expect(result.reply).toContain("belum bisa memastikan");
    expect(execute).not.toHaveBeenCalled();
  });

  it("returns no model facts when every tool fails", async () => {
    complete.mockResolvedValueOnce(calls(call())).mockResolvedValueOnce(answer("Teh imajiner Rp1!"));
    execute.mockResolvedValue({ ok: false, data: { error: { code: "SERVICE_UNAVAILABLE", message: "Informasi tidak tersedia." } } });
    const result = await runAgent(history, ctx);
    expect(result.reply).not.toContain("imajiner");
    expect(result.events.at(-1)?.outcome).toBe("error");
  });

  it("can recover after malformed tool JSON without treating it as evidence", async () => {
    complete.mockResolvedValueOnce(calls(call("bad", "searchProducts", "{bad")))
      .mockResolvedValueOnce(calls(call("fixed"))).mockResolvedValueOnce(answer("Produk tersebut belum ditemukan."));
    execute.mockResolvedValueOnce({ ok: false, data: { error: { code: "INVALID_ARGUMENTS", message: "Parameter tidak valid." } } })
      .mockResolvedValueOnce({ ok: true, data: { products: [] } });
    const result = await runAgent(history, ctx);
    expect(result.reply).toBe("Produk tersebut belum ditemukan.");
    expect(result.events.filter((event) => event.type === "TOOL_RESULT").map((event) => event.outcome)).toEqual(["error", "ok"]);
  });

  it.each(["NOT_FOUND", "UNAVAILABLE"])("returns server-authored %s messages without trusting model claims", async (code) => {
    complete.mockResolvedValueOnce(calls(call("detail", "getProductDetail"))).mockResolvedValueOnce(answer("Produk pasti tersedia!"));
    execute.mockResolvedValue({ ok: false, data: { error: { code, message: "Produk belum tersedia." } } });
    const result = await runAgent(history, ctx);
    expect(result.reply).toBe("Produk belum tersedia.");
  });

  it("does not execute unknown names or echo their contents in diagnostics", async () => {
    complete.mockResolvedValueOnce(calls(call("private-order-code", "private-user-data"))).mockResolvedValueOnce(answer());
    const result = await runAgent(history, ctx);
    expect(execute).not.toHaveBeenCalled();
    expect(result.toolsUsed).toEqual([]);
    expect(JSON.stringify(result.events)).not.toContain("private");
    expect(result.events[1].tool).toBe("unknown");
  });

  it("caps rounds, calls, and execution traces even if the provider ignores limits", async () => {
    complete.mockImplementation(async () => calls(...Array.from({ length: 8 }, (_, index) => call(`call-${index}`))));
    const result = await runAgent(history, ctx);
    expect(complete).toHaveBeenCalledTimes(5);
    expect(execute).toHaveBeenCalledTimes(12);
    expect(complete.mock.calls[4][0].toolChoice).toBe("none");
    expect(result.events.length).toBeLessThanOrEqual(50);
    expect(result.reply).toContain("belum cukup");
  });

  it("deduplicates call IDs and cart proposals and uses server confirmation text", async () => {
    complete.mockResolvedValueOnce(calls(call("cart-1", "addToCart"), call("cart-1", "addToCart"), call("cart-2", "addToCart")))
      .mockResolvedValueOnce(answer("Sudah ditambahkan!"));
    execute.mockResolvedValue({ ok: true, data: { status: "ACTION_PREPARED" }, action });
    const result = await runAgent(history, ctx);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].id).toBe(`${ctx.requestId}:1`);
    expect(result.reply).not.toContain("Sudah ditambahkan");
    expect(result.reply).toContain("Keranjang belum berubah");
    expect(result.reply).toContain("1 × Teh Lemon Madu");
  });

  it("strips reasoning fields and records no arguments, order codes, or customer text", async () => {
    const extended = { ...calls(call("lookup", "checkOrderStatus", '{"code":"THY-PRIVATE"}')), reasoning_content: "hidden chain of thought" };
    complete.mockResolvedValueOnce(extended).mockResolvedValueOnce(answer("Pesanan sedang diproses."));
    execute.mockResolvedValue({ ok: true, data: { code: "THY-PRIVATE", status: "PENDING" } });
    const result = await runAgent([{ role: "user", content: "Customer private text" }], ctx);
    const assistant = complete.mock.calls[1][0].messages.find((message) => message.role === "assistant");
    expect(assistant).toBeDefined();
    expect(assistant).not.toHaveProperty("reasoning_content");
    expect(JSON.stringify(result.events)).not.toMatch(/THY-PRIVATE|Customer|hidden|code/);
  });

  it("does not accept action payloads attached to read-only tools", async () => {
    complete.mockResolvedValueOnce(calls(call())).mockResolvedValueOnce(answer());
    execute.mockResolvedValue({ ok: true, data: { products: [] }, action });
    const result = await runAgent(history, ctx);
    expect(result.actions).toEqual([]);
    expect(result.events.some((event) => event.type === "UI_ACTION")).toBe(false);
  });

  it("fails closed if a cart result lacks a valid action", async () => {
    complete.mockResolvedValueOnce(calls(call("cart", "addToCart"))).mockResolvedValueOnce(answer("Siap ditambahkan!"));
    execute.mockResolvedValue({ ok: true, data: { status: "ACTION_PREPARED" }, action: { ...action, payload: { ...action.payload, quantity: 0 } } });
    const result = await runAgent(history, ctx);
    expect(result.actions).toEqual([]);
    expect(result.reply).not.toContain("Siap");
    expect(result.events.at(-1)?.outcome).toBe("error");
    expect(JSON.stringify(complete.mock.calls[1][0].messages)).not.toContain("ACTION_PREPARED");
  });

  it("drops oversized results as a whole instead of sending truncated JSON", async () => {
    complete.mockResolvedValueOnce(calls(call())).mockResolvedValueOnce(answer("Invented answer"));
    execute.mockResolvedValue({ ok: true, data: { description: "x".repeat(12_001) } });
    const result = await runAgent(history, ctx);
    const tool = complete.mock.calls[1][0].messages.find((message) => message.role === "tool");
    expect(tool?.content).toContain("lebih spesifik");
    expect(() => JSON.parse(String(tool?.content))).not.toThrow();
    expect(result.reply).not.toContain("Invented");
  });

  it("caps recent history characters/messages and final reply length", async () => {
    complete.mockResolvedValueOnce(calls(call())).mockResolvedValueOnce(answer("a".repeat(8000)));
    const longHistory: ChatMsg[] = Array.from({ length: 80 }, (_, index) => ({ role: index % 2 ? "user" : "assistant", content: `${index}:` + "x".repeat(2000) }));
    const result = await runAgent(longHistory, ctx);
    const sent = complete.mock.calls[0][0].messages.filter((message) => message.role === "user" || message.role === "assistant" && !message.tool_calls);
    expect(sent.length).toBeLessThanOrEqual(18);
    expect(sent.reduce((sum, message) => sum + String(message.content).length, 0)).toBeLessThanOrEqual(18_000);
    expect(sent.at(-1)?.content).toBe(longHistory.at(-1)?.content);
    expect(result.reply).toHaveLength(6000);
  });

  it("turns thrown tool errors into safe results without exposing internals", async () => {
    complete.mockResolvedValueOnce(calls(call())).mockResolvedValueOnce(answer());
    execute.mockRejectedValue(new Error("postgres://secret:password/private-customer"));
    const result = await runAgent(history, ctx);
    expect(JSON.stringify(result)).not.toContain("password");
    expect(JSON.stringify(complete.mock.calls[1][0].messages)).not.toContain("password");
    expect(result.events.at(-1)?.outcome).toBe("error");
  });

  it("propagates sanitized provider failures without returning fabricated chat", async () => {
    complete.mockRejectedValue(new AgentProviderError("LLM_UNAVAILABLE"));
    await expect(runAgent(history, ctx)).rejects.toMatchObject({ code: "LLM_UNAVAILABLE" });
  });

  it("enforces the whole-run deadline when a tool hangs", async () => {
    vi.useFakeTimers();
    complete.mockResolvedValueOnce(calls(call()));
    execute.mockImplementation(() => new Promise(() => {}));
    const assertion = expect(runAgent(history, ctx)).rejects.toMatchObject({ code: "LLM_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(45_000);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
});
