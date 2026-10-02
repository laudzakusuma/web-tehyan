import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicOrderTracking } from "@/server/services/orders";

export const dynamic = "force-dynamic";

const statusLabel = {
  PENDING: "Pesanan diterima",
  CONFIRMED: "Pesanan dikonfirmasi",
  PREPARING: "Sedang disiapkan",
  READY: "Siap diambil",
  OUT_FOR_DELIVERY: "Sedang diantar",
  COMPLETED: "Pesanan selesai",
  CANCELLED: "Pesanan dibatalkan",
} as const;

type PageProps = {
  params: Promise<{
    code: string;
  }>;
};

const formatter = new Intl.DateTimeFormat(
  "id-ID",
  {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  },
);

export default async function OrderPage({
  params,
}: PageProps) {
  const { code } = await params;

  const normalizedCode =
    decodeURIComponent(code)
      .trim()
      .toUpperCase();

  const order =
    await getPublicOrderTracking(
        normalizedCode,
    );

  if (!order) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-[900px] px-4 py-16 md:px-10 md:py-24">
      <p className="text-xs uppercase tracking-[0.22em] text-genteng">
        Pesanan
      </p>

      <h1 className="mt-4 font-display text-4xl font-light md:text-6xl">
        Pesananmu sudah masuk.
      </h1>

      <p className="mt-5 max-w-[52ch] leading-7 text-seduh-soft">
        Simpan kode pesanan ini.
        Kamu juga bisa menanyakan
        statusnya lewat Tanya Tehyan.
      </p>

      <section className="mt-12 grid gap-8 border-y border-seduh py-8 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-seduh-soft">
            Kode pesanan
          </p>

          <p className="mt-3 break-all font-display text-2xl md:text-3xl">
            {order.code}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-seduh-soft">
            Status sekarang
          </p>

          <p className="mt-3 font-display text-2xl md:text-3xl">
            {statusLabel[order.status]}
          </p>
        </div>
      </section>

      <section className="mt-12">
        <p className="text-xs uppercase tracking-[0.2em] text-genteng">
          Perjalanan pesanan
        </p>

        <h2 className="mt-3 font-display text-3xl font-light">
          Status pesanan
        </h2>

        <ol className="mt-8">
          {order.history.map(
            (entry, index) => (
              <li
                key={`${entry.status}-${entry.createdAt.toISOString()}`}
                className="relative grid grid-cols-[28px_1fr] gap-5 pb-8 last:pb-0"
              >
                {index <
                  order.history.length -
                    1 && (
                  <span
                    aria-hidden
                    className="absolute left-[6px] top-4 h-[calc(100%-8px)] w-px bg-pasir"
                  />
                )}

                <span
                  aria-hidden
                  className="relative mt-1.5 h-[13px] w-[13px] rounded-full border border-genteng bg-gading"
                />

                <div>
                  <p className="font-display text-xl">
                    {
                      statusLabel[
                        entry.status
                      ]
                    }
                  </p>

                  <time
                    dateTime={entry.createdAt.toISOString()}
                    className="mt-1 block text-sm text-seduh-soft"
                  >
                    {formatter.format(
                      entry.createdAt,
                    )} WIB
                  </time>
                </div>
              </li>
            ),
          )}
        </ol>
      </section>

      <div className="mt-12 flex flex-wrap gap-4 border-t border-pasir pt-8">
        <Link
          href="/menu"
          className="inline-flex h-11 items-center bg-genteng px-6 text-kertas transition-colors hover:bg-genteng-deep"
        >
          Pesan lagi
        </Link>

        <Link
          href="/"
          className="inline-flex h-11 items-center border border-seduh px-6 transition-colors hover:bg-seduh hover:text-gading"
        >
          Kembali ke beranda
        </Link>
      </div>
    </main>
  );
}