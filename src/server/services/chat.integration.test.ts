import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/agents/runtime", () => ({ runAgent: vi.fn() }));
import { runAgent } from "@/agents/runtime";
import { db } from "@/server/db/client";
import { conversationForToken, newChatToken } from "@/server/chat-security";
import { getChatHistory, sendChatMessage } from "./chat";

const suite = process.env.DATABASE_URL ? describe : describe.skip;
suite("chat persistence against PostgreSQL (mock provider)", () => {
  const ids: string[] = [];
  const newConversation = () => {
    const id = conversationForToken(newChatToken())!;
    ids.push(id);
    return id;
  };
  beforeAll(async () => { await db.$connect(); });
  beforeEach(() => {
    vi.mocked(runAgent).mockReset().mockResolvedValue({ reply: "Hasil dari layanan.", actions: [], toolsUsed: ["searchProducts"], events: [] });
  });
  afterAll(async () => {
    await db.conversation.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  });

  it("isolates owners, ignores locks in history, and persists server context", async () => {
    const owner = newConversation();
    const other = newConversation();
    const first = { conversationId: owner, requestId: randomUUID(), message: "Teh lemon berapa?" };
    await sendChatMessage(owner, first);
    await expect(sendChatMessage(other, first)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await getChatHistory(other)).messages).toHaveLength(0);
    expect((await getChatHistory(owner)).messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    await sendChatMessage(owner, { requestId: randomUUID(), message: "Yang tadi satu." });
    expect(vi.mocked(runAgent).mock.calls[1][0]).toEqual([
      { role: "user", content: "Teh lemon berapa?" },
      { role: "assistant", content: "Hasil dari layanan." },
      { role: "user", content: "Yang tadi satu." },
    ]);
    expect(await db.conversationMessage.count({ where: { conversationId: owner, role: "lock" } })).toBe(0);
  });

  it("returns the persisted response on retry and rejects changed input for the same request ID", async () => {
    const owner = newConversation();
    const input = { requestId: randomUUID(), message: "Tambahkan lemon." };
    const first = await sendChatMessage(owner, input);
    expect(await sendChatMessage(owner, input)).toEqual(first);
    expect(runAgent).toHaveBeenCalledTimes(1);
    await expect(sendChatMessage(owner, { ...input, message: "Ganti harga." })).rejects.toMatchObject({ code: "REQUEST_CONFLICT" });
    expect(await db.conversationMessage.count({ where: { conversationId: owner } })).toBe(2);
  });

  it("keeps failed user turns retryable without duplicating history or releasing another worker's lease", async () => {
    const owner = newConversation();
    const input = { requestId: randomUUID(), message: "Menu apa?" };
    vi.mocked(runAgent).mockRejectedValueOnce(new Error("simulated unavailable provider"));
    await expect(sendChatMessage(owner, input)).rejects.toThrow("simulated");
    expect((await getChatHistory(owner)).pendingRequest).toEqual(input);
    await expect(sendChatMessage(owner, { requestId: randomUUID(), message: "Pesan kedua" })).rejects.toMatchObject({ code: "REQUEST_CONFLICT" });
    await sendChatMessage(owner, input);
    expect((await getChatHistory(owner)).pendingRequest).toBeUndefined();
    expect(await db.conversationMessage.count({ where: { conversationId: owner } })).toBe(2);
  });

  it("rejects simultaneous turns across workers", async () => {
    const owner = newConversation();
    let release!: () => void;
    let entered!: () => void;
    const reachedAgent = new Promise<void>((resolve) => { entered = resolve; });
    const gate = new Promise<void>((resolve) => { release = resolve; });
    vi.mocked(runAgent).mockImplementationOnce(async () => {
      entered();
      await gate;
      return { reply: "Selesai.", actions: [], toolsUsed: [], events: [] };
    });
    const running = sendChatMessage(owner, { requestId: randomUUID(), message: "Satu" });
    await reachedAgent;
    try {
      await expect(sendChatMessage(owner, { requestId: randomUUID(), message: "Dua" })).rejects.toMatchObject({ code: "BUSY" });
    } finally { release(); }
    await running;
  });

  it("fences an expired worker while preserving its replacement lease and reply", async () => {
    const owner = newConversation();
    const input = { requestId: randomUUID(), message: "Cek menu." };
    let releaseOld!: () => void;
    let releaseReplacement!: () => void;
    let enteredOld!: () => void;
    let enteredReplacement!: () => void;
    const oldEntered = new Promise<void>((resolve) => { enteredOld = resolve; });
    const replacementEntered = new Promise<void>((resolve) => { enteredReplacement = resolve; });
    const oldGate = new Promise<void>((resolve) => { releaseOld = resolve; });
    const replacementGate = new Promise<void>((resolve) => { releaseReplacement = resolve; });
    vi.mocked(runAgent)
      .mockImplementationOnce(async () => {
        enteredOld();
        await oldGate;
        return { reply: "Stale worker response.", actions: [], toolsUsed: [], events: [] };
      })
      .mockImplementationOnce(async () => {
        enteredReplacement();
        await replacementGate;
        return { reply: "Replacement worker response.", actions: [], toolsUsed: [], events: [] };
      });
    const stale = sendChatMessage(owner, input);
    // Attach rejection handling before releasing either worker.
    const staleOutcome = stale.then(() => null, (error: unknown) => error);
    let replacement: ReturnType<typeof sendChatMessage> | undefined;
    try {
      await oldEntered;
      const lockId = `${owner}:lock`;
      const oldLease = await db.conversationMessage.update({
        where: { id: lockId }, data: { createdAt: new Date(Date.now() - 121_000) },
        select: { content: true },
      });
      replacement = sendChatMessage(owner, input);
      await replacementEntered;
      const currentLease = await db.conversationMessage.findUniqueOrThrow({ where: { id: lockId }, select: { content: true } });
      expect(currentLease.content).not.toBe(oldLease.content);

      releaseOld();
      expect(await staleOutcome).toMatchObject({ code: "BUSY", status: 409 });
      expect(await db.conversationMessage.count({ where: { conversationId: owner, role: "assistant" } })).toBe(0);
      expect(await db.conversationMessage.findUnique({ where: { id: lockId }, select: { content: true } })).toEqual(currentLease);

      releaseReplacement();
      expect((await replacement).reply).toBe("Replacement worker response.");
      expect((await getChatHistory(owner)).messages.map((message) => message.content)).toEqual([
        input.message, "Replacement worker response.",
      ]);
      expect(await db.conversationMessage.count({ where: { conversationId: owner, role: "lock" } })).toBe(0);
    } finally {
      releaseOld();
      releaseReplacement();
      await Promise.allSettled([stale, ...(replacement ? [replacement] : [])]);
    }
  });

  it("restores historical cart proposals without replay controls or false success claims", async () => {
    const owner = newConversation();
    const requestId = randomUUID();
    const originalReply = "Klik Tambah ke keranjang pada pilihan di bawah untuk mengonfirmasi. Keranjang belum berubah.";
    const action = {
      id: `${requestId}:1`, type: "ADD_TO_CART" as const,
      payload: { product: { id: "fixture-lemon", slug: "fixture-lemon", name: "Teh Lemon Fixture", price: 18000, imageUrl: null }, quantity: 2 },
    };
    vi.mocked(runAgent).mockResolvedValueOnce({ reply: originalReply, actions: [action], toolsUsed: ["addToCart"], events: [] });
    const input = { requestId, message: "Tambahkan lemon dua." };
    const live = await sendChatMessage(owner, input);
    expect(live.actions).toEqual([action]);

    const history = await getChatHistory(owner);
    const assistant = history.messages.find((message) => message.role === "assistant");
    expect(assistant).not.toHaveProperty("actions");
    expect(assistant?.content).toContain("Teh Lemon Fixture");
    expect(assistant?.content).toContain("kirim permintaan baru");
    expect(assistant?.content).not.toMatch(/klik|tombol|di bawah|sudah ditambahkan|berhasil ditambahkan|keranjang belum berubah/i);
    expect(history.pendingRequest).toBeUndefined();

    // A lost POST response can still be retried safely with the same action ID;
    // loading history does not mutate the stored idempotent response.
    expect(await sendChatMessage(owner, input)).toEqual(live);
    expect(runAgent).toHaveBeenCalledTimes(1);
  });

  it("caps context and returns history without replayable UI actions", async () => {
    const owner = newConversation();
    await db.conversation.create({ data: { id: owner } });
    await db.conversationMessage.createMany({ data: Array.from({ length: 44 }, (_, i) => ({
      id: `${owner}:${i}`, conversationId: owner, role: "assistant", content: "Riwayat.", toolsUsed: [], createdAt: new Date(Date.now() - 100_000 + i),
    })) });
    await sendChatMessage(owner, { requestId: randomUUID(), message: "Menu" });
    expect(vi.mocked(runAgent).mock.calls[0][0]).toHaveLength(18);
    const history = await getChatHistory(owner);
    expect(history.messages).toHaveLength(40);
    expect(history.messages.every((message) => !("actions" in message))).toBe(true);
  });
});
