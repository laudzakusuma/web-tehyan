import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { runAgent, type ChatMsg } from "@/agents/runtime";
import { chatResponseSchema, type ChatHistory, type ChatRequest, type ChatResponse } from "@/lib/chat-contract";
import { db } from "@/server/db/client";

export class ChatServiceError extends Error {
  constructor(public code: "NOT_FOUND" | "BUSY" | "REQUEST_CONFLICT", public status: number) {
    super(code);
  }
}

const storedReplySchema = z.object({ version: z.literal(1), response: chatResponseSchema });
const messageId = (conversationId: string, requestId: string, role: string) => `${conversationId}:${requestId}:${role}`;

function decodeReply(content: string) {
  try {
    const parsed = storedReplySchema.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data.response : null;
  } catch {
    return null;
  }
}

async function ownedConversation(conversationId: string) {
  const conversation = await db.conversation.findUnique({ where: { id: conversationId }, select: { userId: true } });
  if (conversation?.userId) throw new ChatServiceError("NOT_FOUND", 404);
  return conversation;
}

export async function getChatHistory(conversationId: string): Promise<ChatHistory> {
  if (!await ownedConversation(conversationId)) return { conversationId, messages: [] };
  const rows = await db.conversationMessage.findMany({
    where: { conversationId, role: { in: ["user", "assistant"] } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 40,
    select: { id: true, role: true, content: true },
  });
  const messages: ChatHistory["messages"] = rows.reverse().flatMap((row) => {
    if (row.role !== "user" && row.role !== "assistant") return [];
    const reply = row.role === "assistant" ? decodeReply(row.content) : null;
    const display = reply?.actions.length
      ? `Usulan sebelumnya: ${reply.actions.map(({ payload }) => `${payload.quantity} × ${payload.product.name}`).join(", ")}.\nUntuk menambah menu, kirim permintaan baru. Cek keranjang untuk pilihan yang sudah dikonfirmasi.`
      : reply?.reply ?? row.content;
    return [{ id: row.id, role: row.role, content: display.slice(0, 6000) }];
  });
  const last = messages.at(-1);
  const pendingId = last?.role === "user" ? last.id.split(":")[1] : undefined;
  const requestId = z.string().uuid().safeParse(pendingId);
  return {
    conversationId, messages,
    ...(requestId.success && last ? { pendingRequest: { requestId: requestId.data, message: last.content } } : {}),
  };
}

/** Caller derives conversationId from the HttpOnly capability, never from a user ID/body. */
export async function sendChatMessage(conversationId: string, input: ChatRequest): Promise<ChatResponse> {
  if (input.conversationId && input.conversationId !== conversationId) throw new ChatServiceError("NOT_FOUND", 404);
  await ownedConversation(conversationId);
  await db.conversation.upsert({ where: { id: conversationId }, create: { id: conversationId }, update: {}, select: { id: true } });

  // A unique short-lived row serializes turns across workers without keeping a DB
  // transaction open during an external LLM call. Existing message storage suffices.
  const lockId = `${conversationId}:lock`;
  const lease = randomUUID();
  await db.conversationMessage.deleteMany({ where: { id: lockId, role: "lock", createdAt: { lt: new Date(Date.now() - 120_000) } } });
  try {
    await db.conversationMessage.create({ data: { id: lockId, conversationId, role: "lock", content: lease, toolsUsed: [] } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ChatServiceError("BUSY", 409);
    throw error;
  }

  try {
    const userId = messageId(conversationId, input.requestId, "user");
    const assistantId = messageId(conversationId, input.requestId, "assistant");
    const previousUser = await db.conversationMessage.findUnique({ where: { id: userId }, select: { content: true, createdAt: true } });
    if (previousUser && previousUser.content !== input.message) throw new ChatServiceError("REQUEST_CONFLICT", 409);
    const previousAssistant = await db.conversationMessage.findUnique({ where: { id: assistantId }, select: { content: true } });
    const completed = previousAssistant && decodeReply(previousAssistant.content);
    if (completed) return completed;

    const latestUser = await db.conversationMessage.findFirst({
      where: { conversationId, role: "user" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true },
    });
    let nextTimestamp = Date.now();
    if (latestUser && latestUser.id !== userId) {
      const latestReply = await db.conversationMessage.findUnique({
        where: { id: latestUser.id.replace(/:user$/, ":assistant") }, select: { id: true, createdAt: true },
      });
      if (!latestReply || previousUser) throw new ChatServiceError("REQUEST_CONFLICT", 409);
      nextTimestamp = Math.max(nextTimestamp, latestReply.createdAt.getTime() + 1);
    }

    const userTimestamp = previousUser?.createdAt ?? new Date(nextTimestamp);
    if (!previousUser) await db.conversationMessage.create({
      data: { id: userId, conversationId, role: "user", content: input.message, toolsUsed: [], createdAt: userTimestamp },
    });
    const rows = await db.conversationMessage.findMany({
      where: { conversationId, role: { in: ["user", "assistant"] } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 18, select: { role: true, content: true },
    });
    const history: ChatMsg[] = rows.reverse().flatMap((row) => {
      if (row.role !== "user" && row.role !== "assistant") return [];
      return [{ role: row.role, content: (row.role === "assistant" ? decodeReply(row.content)?.reply ?? row.content : row.content).slice(0, 4000) }];
    });
    const output = await runAgent(history, { userId: null, requestId: input.requestId });
    const response = chatResponseSchema.parse({
      conversationId, requestId: input.requestId, reply: output.reply, actions: output.actions,
      ...(process.env.CHAT_DEMO_MODE === "true" ? { events: output.events } : {}),
    });
    // An expired worker must not publish after another worker took its lease.
    await db.$transaction(async (tx) => {
      // UPDATE holds the row lock until commit; expiration cannot replace the
      // lease between this ownership check and the assistant insert.
      const lock = await tx.conversationMessage.updateMany({
        where: { id: lockId, role: "lock", content: lease }, data: { content: lease },
      });
      if (lock.count !== 1) throw new ChatServiceError("BUSY", 409);
      await tx.conversationMessage.create({ data: {
        id: assistantId, conversationId, role: "assistant",
        content: JSON.stringify({ version: 1, response }), toolsUsed: output.toolsUsed,
        createdAt: new Date(Math.max(Date.now(), userTimestamp.getTime() + 1)),
      } });
    });
    return response;
  } finally {
    await db.conversationMessage.deleteMany({ where: { id: lockId, role: "lock", content: lease } });
  }
}
