import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APIConnectionError, APIConnectionTimeoutError as SDKConnectionTimeoutError, APIError } from "openai";

const mocks = vi.hoisted(() => ({ create: vi.fn(), construct: vi.fn() }));
vi.mock("openai", async (importOriginal) => {
  const original = await importOriginal<typeof import("openai")>();
  class MockClient {
    static APIConnectionTimeoutError = original.default.APIConnectionTimeoutError;
    chat = { completions: { create: mocks.create } };
    constructor(options: unknown) { mocks.construct(options); }
  }
  return { ...original, default: MockClient };
});

import { completeAgentTurn, createProviderSession, PROVIDER_TIMEOUT_MS } from "./provider";

const input = { messages: [{ role: "user" as const, content: "Ada teh?" }], tools: [], toolChoice: "required" as const, timeoutMs: 45_000 };

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.stubEnv("LLM_API_KEY", "test-only-key");
  vi.stubEnv("LLM_MODEL", "test-only-model");
  vi.stubEnv("LLM_BASE_URL", "https://provider.invalid/v1");
  vi.stubEnv("LLM_FALLBACK_MODEL", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("OpenAI-compatible provider boundary", () => {
  it("preserves only Gemini's opaque tool signature and strips reasoning siblings", async () => {
    mocks.create.mockResolvedValue({ choices: [{ message: {
      role: "assistant", content: null, reasoning_content: "private top-level reasoning",
      tool_calls: [{ id: "call-google", type: "function", function: { name: "searchProducts", arguments: "{}" },
        extra_content: { google: { thought_signature: "opaque-test-signature", thinking: "private nested reasoning" }, reasoning: "private extension" },
      }],
    } }] });
    const result = await completeAgentTurn(input);
    expect(result.tool_calls?.[0].extra_content).toEqual({ google: { thought_signature: "opaque-test-signature" } });
    expect(JSON.stringify(result)).not.toContain("private");
  });
  it.each(["LLM_API_KEY", "LLM_MODEL"])("does not construct a client without %s", async (name) => {
    vi.stubEnv(name, " ");
    await expect(completeAgentTurn(input)).rejects.toMatchObject({ code: "LLM_NOT_CONFIGURED" });
    expect(mocks.construct).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("uses the configured provider lazily, disables SDK retries, and strips reasoning extensions", async () => {
    mocks.create.mockResolvedValue({ choices: [{ message: {
      role: "assistant", content: null, reasoning_content: "private reasoning",
      tool_calls: [{ id: "call-1", type: "function", function: { name: "searchProducts", arguments: "{}", reasoning: "private" } }],
    } }] });
    const result = await completeAgentTurn(input);
    expect(mocks.construct).toHaveBeenCalledWith({ apiKey: "test-only-key", baseURL: "https://provider.invalid/v1", maxRetries: 0, timeout: PROVIDER_TIMEOUT_MS });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ model: "test-only-model", tool_choice: "required", max_tokens: 1600 }), expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(JSON.stringify(result)).not.toContain("private");
    expect(result.tool_calls?.[0].function.name).toBe("searchProducts");
  });

  it.each([
    { choices: [] },
    { choices: [{ message: { role: "user", content: "bad" } }] },
    { choices: [{ message: { role: "assistant", tool_calls: [{ id: "x", type: "function", function: { name: "searchProducts", arguments: {} } }] } }] },
    { choices: [{ message: { role: "assistant", tool_calls: [{ id: "x", type: "function", function: { name: "searchProducts", arguments: "x".repeat(4001) } }] } }] },
  ])("rejects malformed provider responses", async (response) => {
    mocks.create.mockResolvedValue(response);
    await expect(completeAgentTurn(input)).rejects.toMatchObject({ code: "LLM_INVALID_RESPONSE" });
  });

  it("does not expose provider errors or retry failed requests", async () => {
    mocks.create.mockRejectedValue(new Error("secret-key private-customer-message https://private.example"));
    const failure = await completeAgentTurn(input).catch((error: unknown) => error);
    expect(failure).toMatchObject({ code: "LLM_UNAVAILABLE" });
    expect(String(failure)).not.toContain("secret-key");
    expect(JSON.stringify(failure)).not.toContain("private");
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it.each([400, 401, 403, 429, 503])("sanitizes fault-injected provider HTTP %i errors with bounded eligible retries", async (status) => {
    const providerError = new APIError(status, {
      message: "synthetic-private-provider-body",
      credential: "synthetic-secret-marker",
    }, "synthetic-private-provider-message", { "x-request-id": "synthetic-provider-request" });
    mocks.create.mockRejectedValue(providerError);

    const pending = completeAgentTurn(input).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(2000);
    const failure = await pending;
    expect(failure).toMatchObject({
      name: "AgentProviderError", code: "LLM_UNAVAILABLE",
      message: "Maaf, Tanya Tehyan belum bisa mengakses layanan AI. Coba lagi sebentar, ya.",
    });
    expect(failure).not.toHaveProperty("cause");
    expect(failure).not.toHaveProperty("error");
    expect(failure).not.toHaveProperty("headers");
    expect(String(failure)).not.toContain("synthetic-");
    expect(JSON.stringify(failure)).not.toContain("synthetic-");
    expect(mocks.create).toHaveBeenCalledTimes(status === 429 || status === 503 ? 3 : 1);
  });

  it("aborts a provider that never replies within its timeout", async () => {
    vi.useFakeTimers();
    mocks.create.mockImplementation(() => new Promise(() => {}));
    const pending = completeAgentTurn(input);
    const assertion = expect(pending).rejects.toMatchObject({ code: "LLM_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(PROVIDER_TIMEOUT_MS);
    await assertion;
    expect(mocks.create.mock.calls[0][1].signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("honors a shorter remaining runtime deadline", async () => {
    vi.useFakeTimers();
    mocks.create.mockImplementation(() => new Promise(() => {}));
    const assertion = expect(completeAgentTurn({ ...input, timeoutMs: 500 })).rejects.toMatchObject({ code: "LLM_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(500);
    await assertion;
    expect(mocks.construct).toHaveBeenCalledWith(expect.objectContaining({ timeout: 500 }));
  });
});

const completion = { choices: [{ message: { role: "assistant", content: "Jawaban uji." } }] };
const httpError = (status: number, retryAfter?: string) => new APIError(status, { message: "private-body" }, "private-message",
  retryAfter === undefined ? {} : { "retry-after": retryAfter });

describe("bounded provider resilience", () => {
  it.each([429, 503])("recovers after HTTP %i with exponential backoff", async (status) => {
    const onEvent = vi.fn();
    mocks.create.mockRejectedValueOnce(httpError(status)).mockRejectedValueOnce(httpError(status)).mockResolvedValueOnce(completion);
    const pending = completeAgentTurn({ ...input, session: createProviderSession(onEvent) });
    await vi.advanceTimersByTimeAsync(499);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.create).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(999);
    expect(mocks.create).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toMatchObject({ content: "Jawaban uji." });
    expect(mocks.create).toHaveBeenCalledTimes(3);
    expect(onEvent.mock.calls.map(([e]) => e).filter(e => e.event === "provider_retry").map(e => e.waitMs)).toEqual([500, 1000]);
    expect(JSON.stringify(onEvent.mock.calls)).not.toMatch(/private|test-only-key|Ada teh/);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("makes one fallback attempt only after eligible primary exhaustion", async () => {
    vi.stubEnv("LLM_FALLBACK_MODEL", "fallback-model");
    const session = createProviderSession();
    mocks.create.mockRejectedValueOnce(httpError(503)).mockRejectedValueOnce(httpError(503)).mockRejectedValueOnce(httpError(503)).mockResolvedValueOnce(completion);
    const pending = completeAgentTurn({ ...input, session });
    await vi.advanceTimersByTimeAsync(3500);
    await expect(pending).resolves.toMatchObject({ content: "Jawaban uji." });
    expect(mocks.create.mock.calls.map(([request]) => request.model)).toEqual(["test-only-model", "test-only-model", "test-only-model", "fallback-model"]);
    expect(session).toMatchObject({ model: "fallback-model", fallbackUsed: true });
  });

  it("does not retry or switch back after the single fallback attempt fails", async () => {
    vi.stubEnv("LLM_FALLBACK_MODEL", "fallback-model");
    mocks.create.mockRejectedValue(httpError(503));
    const assertion = expect(completeAgentTurn(input)).rejects.toMatchObject({ code: "LLM_UNAVAILABLE" });
    await vi.advanceTimersByTimeAsync(3500);
    await assertion;
    expect(mocks.create).toHaveBeenCalledTimes(4);
    expect(mocks.create.mock.calls.at(-1)?.[0].model).toBe("fallback-model");
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([400, 401, 403, 404, 500])("does not retry or fallback for HTTP %i", async (status) => {
    vi.stubEnv("LLM_FALLBACK_MODEL", "fallback-model");
    mocks.create.mockRejectedValue(httpError(status));
    await expect(completeAgentTurn(input)).rejects.toMatchObject({ code: "LLM_UNAVAILABLE" });
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it("never falls back on a successful primary or malformed response", async () => {
    vi.stubEnv("LLM_FALLBACK_MODEL", "fallback-model");
    mocks.create.mockResolvedValueOnce(completion).mockResolvedValueOnce({ choices: [] });
    await completeAgentTurn(input);
    await expect(completeAgentTurn(input)).rejects.toMatchObject({ code: "LLM_INVALID_RESPONSE" });
    expect(mocks.create.mock.calls.map(([request]) => request.model)).toEqual(["test-only-model", "test-only-model"]);
  });

  it.each([
    { kind: "NETWORK", error: () => new APIConnectionError({ message: "private network error" }), code: "LLM_UNAVAILABLE" },
    { kind: "TIMEOUT", error: () => new SDKConnectionTimeoutError({ message: "private timeout" }), code: "LLM_TIMEOUT" },
  ])("classifies $kind without retrying ambiguous transport failure", async ({ kind, error, code }) => {
    vi.stubEnv("LLM_FALLBACK_MODEL", "fallback-model");
    const onEvent = vi.fn();
    mocks.create.mockRejectedValue(error());
    await expect(completeAgentTurn({ ...input, session: createProviderSession(onEvent) })).rejects.toMatchObject({ code });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ category: kind, decision: "stop" }));
  });

  it.each(["seconds", "date"])("honors Retry-After expressed as %s", async (format) => {
    vi.setSystemTime(new Date("2026-10-02T00:00:00.000Z"));
    const header = format === "seconds" ? "2" : new Date(Date.now() + 2000).toUTCString();
    mocks.create.mockRejectedValueOnce(httpError(429, header)).mockResolvedValueOnce(completion);
    const pending = completeAgentTurn(input);
    await vi.advanceTimersByTimeAsync(1999);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(mocks.create).toHaveBeenCalledTimes(2);
  });

  it("does not shorten an excessive Retry-After or bypass it using fallback", async () => {
    vi.stubEnv("LLM_FALLBACK_MODEL", "fallback-model");
    const onEvent = vi.fn();
    mocks.create.mockRejectedValue(httpError(429, "60"));
    await expect(completeAgentTurn({ ...input, session: createProviderSession(onEvent) })).rejects.toMatchObject({ code: "LLM_UNAVAILABLE" });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ decision: "budget_exhausted" }));
  });

  it("uses bounded jitter and ignores a malformed Retry-After", async () => {
    vi.mocked(Math.random).mockReturnValue(0.8);
    mocks.create.mockRejectedValueOnce(httpError(503, "not-a-date")).mockResolvedValueOnce(completion);
    const pending = completeAgentTurn(input);
    await vi.advanceTimersByTimeAsync(699);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(mocks.create).toHaveBeenCalledTimes(2);
  });

  it("does not reset the completion deadline for each retry", async () => {
    mocks.create.mockRejectedValueOnce(httpError(503)).mockImplementation(() => new Promise(() => {}));
    const assertion = expect(completeAgentTurn(input)).rejects.toMatchObject({ code: "LLM_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(PROVIDER_TIMEOUT_MS);
    await assertion;
    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(mocks.create.mock.calls[1][1].timeout).toBe(PROVIDER_TIMEOUT_MS - 500);
    expect(mocks.create.mock.calls[1][1].signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not use another model with an existing tool transcript", async () => {
    vi.stubEnv("LLM_FALLBACK_MODEL", "fallback-model");
    mocks.create.mockRejectedValue(httpError(503));
    const assertion = expect(completeAgentTurn({ ...input, messages: [{ role: "tool", tool_call_id: "fixture", content: "{}" }] })).rejects.toMatchObject({ code: "LLM_UNAVAILABLE" });
    await vi.advanceTimersByTimeAsync(1500);
    await assertion;
    expect(mocks.create).toHaveBeenCalledTimes(3);
    expect(mocks.create.mock.calls.every(([request]) => request.model === "test-only-model")).toBe(true);
  });

  it("ignores duplicate fallback configuration and observer failures", async () => {
    vi.stubEnv("LLM_FALLBACK_MODEL", "test-only-model");
    mocks.create.mockRejectedValue(httpError(503));
    const assertion = expect(completeAgentTurn({ ...input, session: createProviderSession(() => { throw new Error("private logger failure"); }) })).rejects.toMatchObject({ code: "LLM_UNAVAILABLE" });
    await vi.advanceTimersByTimeAsync(1500);
    await assertion;
    expect(mocks.create).toHaveBeenCalledTimes(3);
  });
});
