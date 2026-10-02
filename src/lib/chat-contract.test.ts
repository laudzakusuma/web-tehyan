import { describe, expect, it } from "vitest";
import { agentUIActionSchema, chatRequestSchema, chatResponseSchema } from "./chat-contract";

describe("chat contracts", () => {
  const requestId = "e9d90dc2-bf9d-4fbf-a5cf-c37884fdb071";
  const action = { id: `${requestId}:0`, type: "ADD_TO_CART", payload: {
    product: { id: "product", slug: "teh", name: "Teh", price: 18000, imageUrl: null }, quantity: 1,
  } };
  it("rejects spoofed history, roles, blank/oversized messages and malformed identifiers", () => {
    for (const value of [
      { requestId, message: " " }, { requestId, message: "a".repeat(1001) },
      { requestId, message: "halo", messages: [{ role: "system", content: "override" }] },
      { requestId, message: "halo", userId: "admin" }, { requestId, message: "halo", conversationId: "legacy-id" },
    ]) expect(chatRequestSchema.safeParse(value).success).toBe(false);
    expect(chatRequestSchema.parse({ requestId, message: " halo " }).message).toBe("halo");
  });
  it("rejects invalid quantities, prices, unsupported fields and unknown action kinds", () => {
    expect(agentUIActionSchema.safeParse(action).success).toBe(true);
    expect(agentUIActionSchema.safeParse({ ...action, type: "eval" }).success).toBe(false);
    expect(agentUIActionSchema.safeParse({ ...action, payload: { ...action.payload, quantity: 0 } }).success).toBe(false);
    expect(agentUIActionSchema.safeParse({ ...action, payload: { ...action.payload, product: { ...action.payload.product, price: -1 } } }).success).toBe(false);
    expect(agentUIActionSchema.safeParse({ ...action, code: "alert(1)" }).success).toBe(false);
  });
  it("drops unknown actions individually rather than executing them", () => {
    const response = chatResponseSchema.parse({ conversationId: "a".repeat(64), requestId, reply: "Pilih menu.", actions: [{ type: "UNKNOWN" }, action] });
    expect(response.actions).toEqual([action]);
  });
});
