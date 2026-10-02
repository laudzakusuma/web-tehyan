import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { chatRequestSchema } from "@/lib/chat-contract";
import { CHAT_COOKIE, CHAT_COOKIE_OPTIONS, conversationForToken, isSameOriginRequest, newChatToken, rateAllowed, readChatBody } from "@/server/chat-security";
import { ChatServiceError, getChatHistory, sendChatMessage } from "@/server/services/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

function failure(error: unknown, requestId: string) {
  if (error instanceof ChatServiceError) {
    const text = error.code === "NOT_FOUND" ? "Percakapan tidak ditemukan. Buka kembali Tanya Tehyan." :
      error.code === "BUSY" ? "Pesan sebelumnya masih diproses. Coba lagi sebentar ya." :
      "Selesaikan atau coba ulang pesan sebelumnya terlebih dahulu.";
    return json({ error: text, code: error.code }, error.status);
  }
  const code = error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : "UNAVAILABLE";
  const safeCode = ["LLM_NOT_CONFIGURED", "LLM_TIMEOUT", "LLM_UNAVAILABLE", "LLM_INVALID_RESPONSE"].includes(code) ? code : "UNAVAILABLE";
  // No exception objects, provider bodies, message content or cookies in logs.
  console.warn("[chat]", { requestId, code: safeCode });
  const text = safeCode === "LLM_NOT_CONFIGURED" ? "Tanya Tehyan belum dikonfigurasi. Layanan chat belum tersedia." :
    "Maaf, Tanya Tehyan lagi belum bisa mengakses sistem. Coba lagi sebentar ya.";
  return json({ error: text, code: safeCode }, 503);
}

export async function GET(req: NextRequest) {
  if (!isSameOriginRequest(req)) return json({ error: "Permintaan tidak diizinkan." }, 403);
  if (!rateAllowed("bootstrap:global", 240)) return json({ error: "Terlalu banyak permintaan. Tunggu sebentar ya." }, 429);
  const current = req.cookies.get(CHAT_COOKIE)?.value;
  const token = conversationForToken(current) ? current! : newChatToken();
  const conversationId = conversationForToken(token)!;
  try {
    const response = json(await getChatHistory(conversationId));
    response.cookies.set(CHAT_COOKIE, token, CHAT_COOKIE_OPTIONS);
    return response;
  } catch (error) {
    return failure(error, randomUUID());
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return json({ error: "Permintaan tidak diizinkan." }, 403);
  const conversationId = conversationForToken(req.cookies.get(CHAT_COOKIE)?.value);
  if (!conversationId) return json({ error: "Sesi chat berakhir. Tutup lalu buka kembali Tanya Tehyan.", code: "SESSION_EXPIRED" }, 401);
  if (!rateAllowed(`chat:${conversationId}`, 12) || !rateAllowed("chat:global", 60)) {
    const response = json({ error: "Terlalu banyak pesan. Tunggu sebentar ya." }, 429);
    response.headers.set("Retry-After", "60");
    return response;
  }
  let body: unknown;
  try {
    body = await readChatBody(req);
  } catch (error) {
    const large = error instanceof Error && error.message === "BODY_TOO_LARGE";
    const slow = error instanceof Error && error.message === "BODY_TIMEOUT";
    return json({ error: large ? "Pesan terlalu panjang." : slow ? "Pesan belum terkirim lengkap. Coba lagi ya." : "Pesan tidak valid." }, large ? 413 : slow ? 408 : 400);
  }
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Pesan tidak valid." }, 400);
  try {
    const response = await sendChatMessage(conversationId, parsed.data);
    if (process.env.CHAT_DEMO_MODE === "true") return json(response);
    const { events: _events, ...customerResponse } = response;
    return json(customerResponse);
  } catch (error) {
    return failure(error, parsed.data.requestId);
  }
}
