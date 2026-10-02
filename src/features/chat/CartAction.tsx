"use client";

import { useState } from "react";
import { useCartStore, type CartActionReceipt } from "@/features/cart/store";
import type { AgentUIAction } from "@/lib/chat-contract";

export default function CartAction({ action }: { action: AgentUIAction }) {
  const applyAction = useCartStore((state) => state.applyAgentAction);
  const alreadyApplied = useCartStore((state) => state.appliedActionIds.includes(action.id));
  const [receipt, setReceipt] = useState<CartActionReceipt>();
  const [failed, setFailed] = useState(false);
  const { product, quantity } = action.payload;

  async function confirm() {
    setFailed(false);
    try {
      if (!useCartStore.persist.hasHydrated()) await useCartStore.persist.rehydrate();
      if (!useCartStore.persist.hasHydrated()) throw new Error("cart-storage-unavailable");
      setReceipt(applyAction(action));
    } catch {
      setFailed(true);
    }
  }

  let feedback: string | undefined;
  if (receipt?.status === "invalid") feedback = "Menu belum bisa ditambahkan. Coba tanyakan lagi ya.";
  else if (receipt?.status === "applied") feedback = receipt.quantityAdded > 0
    ? `Ditambahkan: ${receipt.quantityAdded} × ${product.name}.`
    : "Jumlah menu ini sudah mencapai batas 20 di keranjang.";
  else if (alreadyApplied || receipt?.status === "duplicate") feedback = "Pilihan ini sudah dikonfirmasi. Cek keranjangmu ya.";

  return (
    <div className="mt-3 border-t border-pasir pt-3">
      <p className="text-sm [overflow-wrap:anywhere]">{quantity} × {product.name} · Rp{product.price.toLocaleString("id-ID")} / item</p>
      {feedback ? <p role="status" className="mt-2 text-sm text-daun [overflow-wrap:anywhere]">{feedback}</p> : (
        <button type="button" onClick={() => void confirm()} className="mt-2 min-h-11 rounded-field border border-seduh px-3 py-2 text-left text-sm hover:bg-seduh hover:text-gading">
          Tambahkan ke keranjang
        </button>
      )}
      {failed && <p role="alert" className="mt-2 text-sm">Keranjang belum bisa disimpan. Cek keranjang sebelum mencoba lagi.</p>}
    </div>
  );
}
