import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/services/chat", () => ({
  ChatServiceError: class extends Error {}, getChatHistory: vi.fn(), sendChatMessage: vi.fn(),
}));
import { GET, POST } from "./route";
import { getChatHistory, sendChatMessage } from "@/server/services/chat";
import { CHAT_COOKIE, conversationForToken, newChatToken } from "@/server/chat-security";

describe("chat HTTP boundary", () => {
  beforeEach(() => { vi.mocked(getChatHistory).mockReset(); vi.mocked(sendChatMessage).mockReset(); });
  const request = (body: unknown, token = newChatToken(), extra: HeadersInit = {}) => new NextRequest("http://localhost/api/chat", {
    method: "POST", headers: { "content-type": "application/json", cookie: `${CHAT_COOKIE}=${token}`, ...extra },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

  it("boots a HttpOnly session and never reads a conversation from the URL", async () => {
    vi.mocked(getChatHistory).mockImplementation(async (conversationId) => ({ conversationId, messages: [] }));
    const response = await GET(new NextRequest("http://localhost/api/chat?conversationId=another-owner"));
    const token = response.cookies.get(CHAT_COOKIE)!.value;
    const body = await response.json();
    expect(body.conversationId).toBe(conversationForToken(token));
    expect(response.headers.get("set-cookie")).toMatch(/httponly/i);
    expect(response.headers.get("set-cookie")).toMatch(/samesite=strict/i);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("requires the capability cookie and rejects foreign origins before services", async () => {
    expect((await POST(request({ message: "hello", requestId: randomUUID() }, ""))).status).toBe(401);
    expect((await POST(request({}, newChatToken(), { origin: "https://elsewhere.example" }))).status).toBe(403);
    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it("rejects malformed, oversized, blank and spoofed-history bodies", async () => {
    expect((await POST(request("{"))).status).toBe(400);
    expect((await POST(request("x".repeat(8193)))).status).toBe(413);
    expect((await POST(request({ message: "  ", requestId: randomUUID() }))).status).toBe(400);
    expect((await POST(request({ message: "hi", requestId: randomUUID(), messages: [], userId: "admin" }))).status).toBe(400);
    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it("passes only the cookie-derived owner and validated body to services", async () => {
    const token = newChatToken();
    const conversationId = conversationForToken(token)!;
    const body = { message: "halo", requestId: randomUUID(), conversationId };
    vi.mocked(sendChatMessage).mockResolvedValue({ ...body, reply: "Jawaban", actions: [] });
    const response = await POST(request(body, token));
    expect(response.status).toBe(200);
    expect(sendChatMessage).toHaveBeenCalledWith(conversationId, body);
  });

  it("returns a clear missing-configuration error and sanitizes unknown errors", async () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      vi.mocked(sendChatMessage).mockRejectedValueOnce(Object.assign(new Error("sensitive provider body"), { code: "LLM_NOT_CONFIGURED" }));
      const missing = await POST(request({ requestId: randomUUID(), message: "Menu" }));
      expect(missing.status).toBe(503);
      expect(await missing.json()).toMatchObject({ code: "LLM_NOT_CONFIGURED" });
      vi.mocked(sendChatMessage).mockRejectedValueOnce(new Error("password=should-not-leak"));
      const failed = await POST(request({ requestId: randomUUID(), message: "Menu" }));
      expect(JSON.stringify(await failed.json())).not.toContain("password");
      expect(JSON.stringify(log.mock.calls)).not.toContain("sensitive");
      expect(JSON.stringify(log.mock.calls)).not.toContain("password");
    } finally { log.mockRestore(); }
  });
});
