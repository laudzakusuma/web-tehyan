import { describe, expect, it, vi } from "vitest";
import { CHAT_COOKIE_OPTIONS, conversationForToken, isSameOriginRequest, newChatToken, rateAllowed, readChatBody } from "./chat-security";

describe("anonymous chat capability", () => {
  it("derives a public identifier without revealing the random capability", () => {
    const first = newChatToken();
    const second = newChatToken();
    expect(first).not.toBe(second);
    expect(conversationForToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(conversationForToken(first)).not.toBe(first);
    expect(conversationForToken(first)).not.toBe(conversationForToken(second));
    expect(conversationForToken(conversationForToken(first)!)).toBeNull();
    expect(conversationForToken(undefined)).toBeNull();
    expect(CHAT_COOKIE_OPTIONS).toMatchObject({ httpOnly: true, sameSite: "strict", path: "/" });
  });

  it("rejects cross-site and foreign-origin requests", () => {
    const make = (headers: HeadersInit = {}) => new Request("https://tehyan.example/api/chat", { headers });
    expect(isSameOriginRequest(make({ origin: "https://evil.example" }))).toBe(false);
    expect(isSameOriginRequest(make({ "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(isSameOriginRequest(make({ origin: "https://tehyan.example" }))).toBe(true);
  });

  it("bounds attempts and expires buckets", () => {
    const key = newChatToken();
    expect(rateAllowed(key, 2, 1000)).toBe(true);
    expect(rateAllowed(key, 2, 1001)).toBe(true);
    expect(rateAllowed(key, 2, 1002)).toBe(false);
    expect(rateAllowed(key, 2, 61_000)).toBe(true);
  });
});

describe("bounded request decoding", () => {
  const request = (body: string, headers = {}) => new Request("http://localhost/api/chat", {
    method: "POST", headers: { "content-type": "application/json", ...headers }, body,
  });
  it("reads JSON while rejecting malformed or oversized bodies without trusting content-length", async () => {
    await expect(readChatBody(request('{"message":"halo"}'))).resolves.toEqual({ message: "halo" });
    await expect(readChatBody(request("{"))).rejects.toThrow();
    await expect(readChatBody(request("a".repeat(8193)))).rejects.toThrow("BODY_TOO_LARGE");
    await expect(readChatBody(request("{}", { "content-length": "9000" }))).rejects.toThrow("BODY_TOO_LARGE");
    await expect(readChatBody(request("{}", { "content-type": "text/plain" }))).rejects.toThrow("INVALID_BODY");
  });
  it("bounds slow streaming bodies with a read deadline", async () => {
    vi.useFakeTimers();
    try {
      const slow = { headers: new Headers({ "content-type": "application/json" }), body: new ReadableStream<Uint8Array>() } as Request;
      const reading = expect(readChatBody(slow)).rejects.toThrow("BODY_TIMEOUT");
      await vi.advanceTimersByTimeAsync(5000);
      await reading;
    } finally { vi.useRealTimers(); }
  });
});
