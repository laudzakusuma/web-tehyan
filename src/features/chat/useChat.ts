"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  chatHistorySchema, chatResponseSchema,
  type AgentUIAction, type ChatRequest, type ExecutionEvent,
} from "@/lib/chat-contract";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AgentUIAction[];
  events?: ExecutionEvent[];
};

const NETWORK_ERROR = "Tanya Tehyan belum bisa terhubung. Periksa koneksimu, lalu coba lagi ya.";
class ChatResponseError extends Error {
  constructor(message: string, public code?: string) { super(message); }
}

async function readResponse(response: Response): Promise<unknown> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body && typeof body === "object" && "error" in body ? body.error : undefined;
    const code = body && typeof body === "object" && "code" in body ? body.code : undefined;
    throw new ChatResponseError(
      typeof error === "string" && error.length <= 500 ? error : NETWORK_ERROR,
      typeof code === "string" && code.length <= 50 ? code : undefined,
    );
  }
  return body;
}

export default function useChat(open: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState<ChatRequest>();
  const [needsReload, setNeedsReload] = useState(false);
  const busyRef = useRef(false);
  const attempted = useRef(false);
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); };
  }, []);

  const loadHistory = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(undefined);
    const abort = new AbortController();
    controller.current = abort;
    const timer = setTimeout(() => abort.abort(), 20_000);
    try {
      const response = await fetch("/api/chat", { cache: "no-store", signal: abort.signal });
      const parsed = chatHistorySchema.safeParse(await readResponse(response));
      if (!parsed.success) throw new ChatResponseError("Percakapan belum bisa dimuat. Coba lagi ya.");
      if (!mounted.current) return;
      const history = parsed.data;
      setConversationId(history.conversationId);
      setMessages(history.messages);
      setReady(true);
      setNeedsReload(false);
      setPending(history.pendingRequest ? { ...history.pendingRequest, conversationId: history.conversationId } : undefined);
      if (history.pendingRequest) {
        setError("Pesan terakhirmu belum selesai diproses. Coba lagi untuk melanjutkan.");
      }
    } catch (cause) {
      if (mounted.current) setError(cause instanceof ChatResponseError ? cause.message : NETWORK_ERROR);
    } finally {
      clearTimeout(timer);
      controller.current = null;
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!open || attempted.current) return;
    attempted.current = true;
    void loadHistory();
  }, [open, loadHistory]);

  async function submit(request: ChatRequest, appendUser: boolean) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(undefined);
    setPending(request);
    if (appendUser) setMessages((current) => [...current, {
      id: `${request.requestId}:user`, role: "user" as const, content: request.message,
    }].slice(-40));
    const abort = new AbortController();
    controller.current = abort;
    const timer = setTimeout(() => abort.abort(), 90_000);
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request), signal: abort.signal,
      });
      const parsed = chatResponseSchema.safeParse(await readResponse(response));
      if (!parsed.success || parsed.data.requestId !== request.requestId
        || parsed.data.conversationId !== request.conversationId) {
        throw new ChatResponseError("Jawaban belum bisa ditampilkan. Coba lagi ya.");
      }
      if (!mounted.current) return;
      const result = parsed.data;
      setMessages((current) => [...current, {
        id: `${request.requestId}:assistant`, role: "assistant" as const, content: result.reply,
        actions: result.actions, events: result.events,
      }].slice(-40));
      setPending(undefined);
    } catch (cause) {
      if (mounted.current) {
        const recover = cause instanceof ChatResponseError && ["SESSION_EXPIRED", "NOT_FOUND", "REQUEST_CONFLICT"].includes(cause.code ?? "");
        setNeedsReload(recover);
        setError(recover ? "Sesi percakapan berubah. Muat ulang percakapan untuk melanjutkan." : cause instanceof ChatResponseError ? cause.message : NETWORK_ERROR);
      }
    } finally {
      clearTimeout(timer);
      controller.current = null;
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  function send(message: string) {
    const text = message.trim();
    if (!ready || busyRef.current || pending || needsReload || !text || text.length > 1000 || !conversationId) return;
    void submit({ conversationId, message: text, requestId: crypto.randomUUID() }, true);
  }

  function retry() {
    if (busyRef.current) return;
    if (pending && !needsReload) void submit(pending, false);
    else void loadHistory();
  }

  return {
    messages, busy, ready, error, send, retry,
    retryLabel: needsReload ? "Muat ulang percakapan" : "Coba lagi",
    canSend: ready && !busy && !pending && !needsReload,
  };
}
