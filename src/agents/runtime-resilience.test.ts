import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APIError as SDKAPIError } from "openai";
import type { AgentUIAction } from "@/lib/chat-contract";

const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", async (importOriginal) => {
  const original = await importOriginal<typeof import("openai")>();
  class MockClient {
    static APIError = original.default.APIError;
    static APIConnectionTimeoutError = original.default.APIConnectionTimeoutError;
    chat = { completions: { create: mocks.create } };
  }
  return { ...original, default: MockClient };
});
vi.mock("./tools", () => ({
  toolDefs: [{ type: "function", function: { name: "addToCart", parameters: {} } }],
  runTool: vi.fn(),
}));

import { runAgent } from "./runtime";
import { runTool } from "./tools";

const execute = vi.mocked(runTool);
const ctx = { userId: null, requestId: "ba80c2ab-ec41-4e80-a8f4-5547c3be7a00" };
const action: AgentUIAction = {
  id: "replaced-by-runtime", type: "ADD_TO_CART",
  payload: {
    quantity: 1,
    product: { id: "tea", slug: "teh-tarik", name: "Teh Tarik", price: 16_000, imageUrl: null },
  },
};
const signedCall = {
  id: "cart-tool", type: "function" as const,
  function: { name: "addToCart", arguments: '{"productId":"tea","quantity":1}' },
  extra_content: { google: { thought_signature: "synthetic-model-bound-signature" } },
};
const toolResponse = { choices: [{ message: { role: "assistant", content: null, tool_calls: [signedCall] } }] };
const finalResponse = { choices: [{ message: { role: "assistant", content: "Sudah ditambahkan!" } }] };
const unavailable = () => new SDKAPIError(503, {}, "synthetic capacity error", {});
const run = () => runAgent([{ role: "user", content: "Teh Tarik satu" }], ctx);

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.stubEnv("LLM_API_KEY", "test-only-key");
  vi.stubEnv("LLM_BASE_URL", "https://provider.invalid/v1");
  vi.stubEnv("LLM_MODEL", "primary-test-model");
  vi.stubEnv("LLM_FALLBACK_MODEL", "fallback-test-model");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  execute.mockResolvedValue({ ok: true, data: { status: "ACTION_PREPARED" }, action });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("provider retries within the existing tool runtime", () => {
  it("retries only the continuation and produces one cart proposal after a transient error", async () => {
    mocks.create.mockResolvedValueOnce(toolResponse)
      .mockRejectedValueOnce(unavailable()).mockResolvedValueOnce(finalResponse);
    const pending = run();
    const assertion = expect(pending).resolves.toMatchObject({
      actions: [{ ...action, id: `${ctx.requestId}:1` }], toolsUsed: ["addToCart"],
    });
    await vi.advanceTimersByTimeAsync(7000);
    await assertion;
    const result = await pending;

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith("addToCart", signedCall.function.arguments, ctx);
    expect(mocks.create).toHaveBeenCalledTimes(3);
    expect(mocks.create.mock.calls.map(([request]) => request.model)).toEqual([
      "primary-test-model", "primary-test-model", "primary-test-model",
    ]);
    for (const [request] of mocks.create.mock.calls.slice(1)) {
      expect(request.messages).toEqual(expect.arrayContaining([
        expect.objectContaining({ role: "assistant", tool_calls: [signedCall] }),
        expect.objectContaining({ role: "tool", tool_call_id: signedCall.id }),
      ]));
    }
    expect(result.events.filter((event) => event.type === "UI_ACTION")).toHaveLength(1);
    expect(result.reply).toContain("Keranjang belum berubah");
    expect(JSON.stringify(result)).not.toContain("synthetic-model-bound-signature");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("pins a successful fallback for the signed tool continuation without repeating the tool", async () => {
    mocks.create.mockRejectedValueOnce(unavailable()).mockRejectedValueOnce(unavailable())
      .mockRejectedValueOnce(unavailable()).mockResolvedValueOnce(toolResponse).mockResolvedValueOnce(finalResponse);
    const pending = run();
    const assertion = expect(pending).resolves.toMatchObject({
      actions: [{ ...action, id: `${ctx.requestId}:1` }],
    });
    await vi.advanceTimersByTimeAsync(7000);
    await assertion;

    expect(mocks.create.mock.calls.map(([request]) => request.model)).toEqual([
      "primary-test-model", "primary-test-model", "primary-test-model", "fallback-test-model", "fallback-test-model",
    ]);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(mocks.create.mock.calls[4][0].messages).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: "assistant", tool_calls: [signedCall] }),
    ]));
    expect((await pending).events.filter((event) => event.type === "UI_ACTION")).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not switch models or replay an executed tool after a signed primary continuation fails", async () => {
    mocks.create.mockResolvedValueOnce(toolResponse).mockRejectedValue(unavailable());
    const assertion = expect(run()).rejects.toMatchObject({ code: "LLM_UNAVAILABLE" });
    await vi.advanceTimersByTimeAsync(7000);
    await assertion;

    expect(execute).toHaveBeenCalledTimes(1);
    expect(mocks.create).toHaveBeenCalledTimes(4);
    expect(mocks.create.mock.calls.every(([request]) => request.model === "primary-test-model")).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
