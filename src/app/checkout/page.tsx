"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useCartStore } from "@/features/cart/store";

const rupiah = (value: number) =>
  `Rp${value.toLocaleString("id-ID")}`;

type CheckoutResponse = {
  order?: {
    code: string;
    status: string;
    subtotal: number;
    discount: number;
    fee: number;
    total: number;
  };

  error?: string;

  fields?: Record<
    string,
    string[] | undefined
  >;
};

export default function CheckoutPage() {
  const router = useRouter();

  const items = useCartStore(
    (state) => state.items,
  );

  const clear = useCartStore(
    (state) => state.clear,
  );

  const [customerName, setCustomerName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          item.price * item.quantity,
        0,
      ),
    [items],
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      submitting ||
      items.length === 0
    ) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/orders",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            customerName,
            phone,

            type: "PICKUP",

            notes:
              notes.trim() || null,

            items: items.map(
              (item) => ({
                productId:
                  item.productId,

                quantity:
                  item.quantity,
              }),
            ),
          }),
        },
      );

      const body =
        (await response.json()) as CheckoutResponse;

      if (
        !response.ok ||
        !body.order
      ) {
        setError(
          body.error ??
            "Pesanan belum dapat dibuat.",
        );

        return;
      }

      /*
       * Cart hanya dikosongkan
       * setelah server benar-benar
       * membuat order.
       */
      clear();

      router.push(
        `/pesanan/${encodeURIComponent(
          body.order.code,
        )}`,
      );
    } catch {
      setError(
        "Tidak dapat terhubung ke sistem pesanan. Coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-[900px] px-4 py-20 md:px-10">
        <p className="text-xs uppercase tracking-[0.22em] text-genteng">
          Checkout
        </p>

        <h1 className="mt-4 font-display text-4xl font-light md:text-5xl">
          Keranjangmu masih kosong.
        </h1>

        <p className="mt-4 max-w-[44ch] text-seduh-soft">
          Pilih sesuatu dari menu
          terlebih dahulu sebelum
          melanjutkan pesanan.
        </p>

        <Link
          href="/menu"
          className="mt-8 inline-flex h-11 items-center bg-genteng px-6 text-kertas transition-colors hover:bg-genteng-deep"
        >
          Lihat menu
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-12 md:px-10 md:py-20">
      <div className="border-b border-pasir pb-8">
        <p className="text-xs uppercase tracking-[0.22em] text-genteng">
          Checkout
        </p>

        <h1 className="mt-3 font-display text-4xl font-light md:text-6xl">
          Sebentar lagi diseduh.
        </h1>

        <p className="mt-4 max-w-[52ch] text-seduh-soft">
          Untuk tahap ini pesanan
          tersedia untuk pengambilan
          langsung di kedai.
        </p>
      </div>

      <div className="grid gap-12 pt-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form
          onSubmit={handleSubmit}
          className="space-y-8"
        >
          <section>
            <h2 className="font-display text-2xl">
              Informasi pelanggan
            </h2>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm">
                  Nama
                </span>

                <input
                  required
                  value={customerName}
                  onChange={(event) =>
                    setCustomerName(
                      event.target.value,
                    )
                  }
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  className="h-12 w-full border border-pasir bg-transparent px-4 outline-none transition-colors focus:border-seduh"
                  placeholder="Nama pemesan"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm">
                  Nomor telepon
                </span>

                <input
                  required
                  value={phone}
                  onChange={(event) =>
                    setPhone(
                      event.target.value,
                    )
                  }
                  minLength={8}
                  maxLength={20}
                  inputMode="tel"
                  autoComplete="tel"
                  className="h-12 w-full border border-pasir bg-transparent px-4 outline-none transition-colors focus:border-seduh"
                  placeholder="08xxxxxxxxxx"
                />
              </label>
            </div>
          </section>

          <section className="border-t border-pasir pt-8">
            <h2 className="font-display text-2xl">
              Cara menerima pesanan
            </h2>

            <div className="mt-5 border border-seduh bg-kertas p-5">
              <div className="flex items-start gap-4">
                <div className="mt-1 h-3 w-3 rounded-full bg-genteng" />

                <div>
                  <p className="font-medium">
                    Ambil di kedai
                  </p>

                  <p className="mt-1 text-sm leading-6 text-seduh-soft">
                    Delivery akan
                    tersedia setelah
                    aturan area dan
                    ongkir Kedai
                    Tehyan selesai
                    dikonfigurasi.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="border-t border-pasir pt-8">
            <label className="block">
              <span className="font-display text-2xl">
                Catatan
              </span>

              <span className="mt-2 block text-sm text-seduh-soft">
                Opsional. Maksimal
                500 karakter.
              </span>

              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value,
                  )
                }
                maxLength={500}
                rows={5}
                className="mt-5 w-full resize-none border border-pasir bg-transparent p-4 outline-none transition-colors focus:border-seduh"
                placeholder="Contoh: es sedikit..."
              />
            </label>
          </section>

          {error && (
            <div
              role="alert"
              className="border border-genteng bg-kertas p-4 text-sm text-genteng"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-12 min-w-48 items-center justify-center bg-genteng px-6 text-kertas transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Membuat pesanan..."
              : "Buat pesanan"}
          </button>
        </form>

        <aside className="h-fit border-t border-seduh pt-6 lg:sticky lg:top-28">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">
              Pesanan
            </h2>

            <Link
              href="/keranjang"
              className="text-sm underline underline-offset-4"
            >
              Ubah
            </Link>
          </div>

          <ul className="mt-6">
            {items.map((item) => (
              <li
                key={item.key}
                className="border-b border-pasir py-4 first:pt-0"
              >
                <div className="flex justify-between gap-6">
                  <div>
                    <p className="font-medium">
                      {item.name}
                    </p>

                    <p className="mt-1 text-sm text-seduh-soft">
                      {item.quantity} ×{" "}
                      {rupiah(
                        item.price,
                      )}
                    </p>
                  </div>

                  <p className="whitespace-nowrap tabular-nums">
                    {rupiah(
                      item.price *
                        item.quantity,
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-seduh-soft">
                Subtotal sementara
              </span>

              <span className="tabular-nums">
                {rupiah(subtotal)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-seduh-soft">
                Pengambilan
              </span>

              <span>Gratis</span>
            </div>
          </div>

          <div className="mt-6 border-t border-seduh pt-5">
            <p className="text-xs leading-5 text-seduh-soft">
              Nilai di atas hanya
              tampilan keranjang.
              Harga final akan
              dihitung ulang oleh
              server sebelum pesanan
              dibuat.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}