import { createHash, randomBytes } from "node:crypto";

export const CHAT_COOKIE = "tehyan-chat";
export const CHAT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export function newChatToken() {
  return randomBytes(32).toString("base64url");
}

export function conversationForToken(token: string | undefined) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  // The public ID is a one-way digest, never the cookie capability itself.
  return createHash("sha256").update(`tehyan-chat-v1:${token}`).digest("hex");
}

export function isSameOriginRequest(req: Request) {
  const origin = req.headers.get("origin");
  return req.headers.get("sec-fetch-site") !== "cross-site" &&
    (!origin || origin === new URL(req.url).origin);
}

const buckets = new Map<string, { count: number; until: number }>();

/** Single-process prototype protection: bounded storage, no trusted client IP headers. */
export function rateAllowed(key: string, limit: number, now = Date.now()) {
  for (const [id, bucket] of buckets) if (bucket.until <= now) buckets.delete(id);
  const previous = buckets.get(key);
  if (previous) {
    if (previous.count >= limit) return false;
    previous.count++;
    return true;
  }
  if (buckets.size >= 5000) return false;
  buckets.set(key, { count: 1, until: now + 60_000 });
  return true;
}

export async function readChatBody(req: Request): Promise<unknown> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new Error("INVALID_BODY");
  if (Number(req.headers.get("content-length")) > 8192) throw new Error("BODY_TOO_LARGE");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("INVALID_BODY");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 8192) {
            await reader.cancel();
            throw new Error("BODY_TOO_LARGE");
          }
          chunks.push(value);
        }
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error("BODY_TIMEOUT"));
          void reader.cancel().catch(() => undefined);
        }, 5000);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    reader.releaseLock();
  }
}
