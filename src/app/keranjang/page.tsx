"use client";

import Link from "next/link";
import { useCartStore } from "@/features/cart/store";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clear = useCartStore((state) => state.clear);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="mx-auto max-w-[960px] px-4 py-12 md:px-10 md:py-16">
      <div className="flex items-end justify-between gap-4 border-b border-pasir pb-5">
        <div>
          <h1 className="font-display text-4xl font-light">Keranjang</h1>
          <p className="mt-2 text-sm text-seduh-soft">Pesanan tersimpan di perangkat ini.</p>
        </div>
        {items.length > 0 && (
          <button type="button" onClick={clear} className="text-sm underline underline-offset-4 hover:text-genteng">Kosongkan</button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-16">
          <p className="font-display text-2xl">Belum ada yang diseduh.</p>
          <p className="mt-2 text-seduh-soft">Pilih minuman atau camilan dari menu dulu.</p>
          <Link href="/menu" className="mt-6 inline-flex h-11 items-center rounded-field bg-genteng px-5 text-kertas hover:bg-genteng-deep">Lihat menu</Link>
        </div>
      ) : (
        <div className="grid gap-10 pt-6 md:grid-cols-[1fr_280px]">
          <ul>
            {items.map((item) => (
              <li key={item.key} className="border-b border-pasir py-5 first:pt-0">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <h2 className="font-display text-xl">{item.name}</h2>
                    <p className="mt-1 text-sm text-seduh-soft">{rupiah(item.price)} / item</p>
                    {item.options && Object.keys(item.options).length > 0 && (
                      <p className="mt-1 text-xs text-seduh-soft">{Object.values(item.options).join(" · ")}</p>
                    )}
                  </div>
                  <p className="font-medium tabular-nums">{rupiah(item.price * item.quantity)}</p>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(item.key, item.quantity - 1)}
                    aria-label={`Kurangi ${item.name}`}
                    className="h-10 w-10 rounded-field border border-pasir hover:border-seduh"
                  >−</button>
                  <span className="min-w-8 text-center tabular-nums" aria-label={`Jumlah ${item.quantity}`}>{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(item.key, item.quantity + 1)}
                    aria-label={`Tambah ${item.name}`}
                    className="h-10 w-10 rounded-field border border-pasir hover:border-seduh"
                  >+</button>
                  <button type="button" onClick={() => removeItem(item.key)} className="ml-3 text-sm text-seduh-soft underline underline-offset-4 hover:text-genteng">Hapus</button>
                </div>
              </li>
            ))}
          </ul>
          <aside className="h-fit border-t border-seduh pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
            <div className="flex justify-between gap-4">
              <span>Subtotal</span>
              <strong className="tabular-nums">{rupiah(subtotal)}</strong>
            </div>
            <p className="mt-3 text-sm text-seduh-soft">Ongkir dan promo akan dihitung di tahap checkout.</p>
            <div className="mt-6 rounded-field border border-pasir bg-kertas p-4 text-sm text-seduh-soft">
              Checkout sedang jadi tahap pengembangan berikutnya. Keranjang ini sudah siap dipakai untuk alur tersebut.
            </div>
            <Link href="/menu" className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-field border border-seduh px-4 hover:bg-seduh hover:text-gading">Tambah menu lain</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
