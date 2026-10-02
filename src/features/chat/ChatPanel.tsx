"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import CartAction from "./CartAction";
import useChat from "./useChat";

const SUGGESTIONS = ["Minuman di bawah 20 ribu", "Apa yang paling laris?", "Outlet di Depok", "Ada promo apa?"];

export default function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const chat = useChat(open);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  const show = useCallback(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => {
      const previous = returnFocusRef.current;
      (previous?.isConnected ? previous : launcherRef.current)?.focus();
    });
  }, []);

  useEffect(() => {
    window.addEventListener("tehyan:open-chat", show);
    return () => window.removeEventListener("tehyan:open-chat", show);
  }, [show]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const region = messagesRef.current;
    if (region) region.scrollTop = region.scrollHeight;
  }, [open, chat.messages, chat.busy, chat.error]);

  if (!open) return (
    <button ref={launcherRef} type="button" onClick={show} aria-expanded={false} aria-controls="tehyan-chat" className="fixed bottom-4 right-4 z-40 h-11 rounded-field bg-seduh px-5 text-gading shadow-[var(--shadow-float)] hover:bg-seduh-soft">
      Tanya Tehyan
    </button>
  );

  return (
    <section id="tehyan-chat" aria-labelledby="tehyan-chat-title" onKeyDown={(event) => {
      if (event.key === "Escape") { event.stopPropagation(); close(); }
    }} className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] min-h-0 flex-col rounded-t-panel border border-pasir bg-kertas shadow-[var(--shadow-sheet)] md:inset-x-auto md:bottom-4 md:right-4 md:w-[400px] md:rounded-panel">
      <header className="flex shrink-0 items-start justify-between gap-2 border-b border-pasir p-4">
        <div className="min-w-0">
          <h2 id="tehyan-chat-title" className="font-display text-lg">Tanya Tehyan</h2>
          <p className="text-sm text-seduh-soft">Bantu pilih menu dan cari info kedai.</p>
        </div>
        <button type="button" onClick={close} aria-label="Tutup Tanya Tehyan" className="h-11 w-11 shrink-0 rounded-field text-xl hover:bg-gading">×</button>
      </header>
      <div ref={messagesRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {chat.ready && chat.messages.length === 0 && <div className="flex flex-wrap gap-2 pb-3">{SUGGESTIONS.map((suggestion) => (
          <button key={suggestion} type="button" disabled={!chat.canSend} onClick={() => chat.send(suggestion)} className="min-h-11 rounded-field border border-pasir px-3 py-2 text-left text-sm hover:border-seduh disabled:opacity-50">{suggestion}</button>
        ))}</div>}
        <div role="log" aria-label="Percakapan dengan Tanya Tehyan" aria-live="polite" aria-relevant="additions" className="space-y-3">
          {chat.messages.map((message) => (
            <div key={message.id} className={message.role === "user" ? "ml-6 min-w-0 rounded-card bg-seduh p-3 text-sm text-gading" : "mr-6 min-w-0 rounded-card bg-gading p-3 text-sm"}>
              <span className="sr-only">{message.role === "user" ? "Kamu" : "Tanya Tehyan"}: </span>
              <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message.content}</p>
              {message.actions?.map((action) => <CartAction key={action.id} action={action} />)}
              {message.events && message.events.length > 0 && (
                <details className="mt-3 border-t border-pasir pt-2 text-xs text-seduh-soft">
                  <summary className="cursor-pointer py-2">Aktivitas agen · demo</summary>
                  <ol className="space-y-1 pb-2">
                    {message.events.map((event, index) => <li key={index} className="[overflow-wrap:anywhere]">{event.type}{event.tool ? ` · ${event.tool}` : ""}{event.outcome ? ` · ${event.outcome}` : ""}</li>)}
                  </ol>
                </details>
              )}
            </div>
          ))}
        </div>
        {chat.busy && <p role="status" className="mt-3 text-sm text-seduh-soft">{chat.ready ? "Sebentar, sedang cek informasinya…" : "Memuat percakapan…"}</p>}
        {chat.error && <div className="mt-3 border-l-2 border-genteng pl-3">
          <p role="alert" className="text-sm [overflow-wrap:anywhere]">{chat.error}</p>
          <button type="button" onClick={chat.retry} disabled={chat.busy} className="mt-1 min-h-11 text-sm underline underline-offset-4 disabled:opacity-50">{chat.retryLabel}</button>
        </div>}
      </div>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (!chat.canSend || !draft.trim()) return;
        chat.send(draft);
        setDraft("");
      }} className="shrink-0 border-t border-pasir p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex min-w-0 gap-2">
          <label htmlFor="chat-input" className="sr-only">Pesan untuk Tanya Tehyan</label>
          <input ref={inputRef} id="chat-input" name="message" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} autoComplete="off" enterKeyHint="send" placeholder="Tulis pertanyaan" className="h-11 min-w-0 flex-1 rounded-field border border-pasir bg-white px-3 text-base" />
          <button type="submit" disabled={!chat.canSend || !draft.trim()} className="h-11 shrink-0 rounded-field bg-genteng px-4 text-kertas hover:bg-genteng-deep disabled:opacity-50">Kirim</button>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-seduh-soft">
          <p>Menu pilihanmu perlu dikonfirmasi dulu.</p>
          <Link href="/keranjang" className="inline-flex min-h-8 items-center underline underline-offset-4" onClick={close}>Lihat keranjang</Link>
        </div>
      </form>
    </section>
  );
}
