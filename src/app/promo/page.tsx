import Link from "next/link";

import {
  getPromotions,
} from "@/server/services/catalog";

export const dynamic =
  "force-dynamic";

const dateFormatter =
  new Intl.DateTimeFormat(
    "id-ID",
    {
      dateStyle: "long",
      timeZone: "Asia/Jakarta",
    },
  );

export default async function PromoPage() {
  const now = new Date();

  const promotions =
    await getPromotions(
      now,
      10,
    );

  return (
    <main>
      <section className="mx-auto max-w-[1200px] px-4 pb-12 pt-16 md:px-10 md:pb-16 md:pt-24">
        <p className="text-xs uppercase tracking-[0.24em] text-genteng">
          Promo Kedai
        </p>

        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <h1 className="max-w-[12ch] font-display text-5xl font-light leading-[0.95] md:text-7xl">
            Sedikit lebih banyak
            untuk waktu yang tepat.
          </h1>

          <p className="max-w-[42ch] leading-7 text-seduh-soft lg:pb-2">
            Penawaran yang sedang
            tersedia di Kedai Tehyan.
            Setiap promo memiliki
            syaratnya sendiri—baca
            detail sebelum memesan.
          </p>
        </div>
      </section>

      <section className="border-y border-pasir">
        <div className="mx-auto max-w-[1200px] px-4 md:px-10">
          {promotions.length === 0 ? (
            <div className="py-20 md:py-28">
              <p className="text-xs uppercase tracking-[0.2em] text-seduh-soft">
                Saat ini
              </p>

              <h2 className="mt-4 max-w-[15ch] font-display text-4xl font-light md:text-5xl">
                Belum ada promo yang
                sedang ditayangkan.
              </h2>

              <p className="mt-5 max-w-[48ch] leading-7 text-seduh-soft">
                Menu tetap bisa
                dipesan seperti biasa.
                Promo berikutnya akan
                muncul di halaman ini
                ketika tersedia.
              </p>

              <Link
                href="/menu"
                className="mt-8 inline-flex h-11 items-center bg-genteng px-6 text-kertas transition-colors hover:bg-genteng-deep"
              >
                Lihat menu
              </Link>
            </div>
          ) : (
            <ol>
              {promotions.map(
                (
                  promotion,
                  index,
                ) => (
                  <li
                    key={`${promotion.title}-${index}`}
                    className="grid gap-8 border-b border-pasir py-12 last:border-b-0 md:py-16 lg:grid-cols-[90px_minmax(0,1fr)_300px]"
                  >
                    <div>
                      <span className="font-display text-3xl text-genteng">
                        {String(
                          index + 1,
                        ).padStart(
                          2,
                          "0",
                        )}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-seduh-soft">
                        Penawaran aktif
                      </p>

                      <h2 className="mt-3 max-w-[18ch] font-display text-3xl font-light leading-tight md:text-4xl">
                        {
                          promotion.title
                        }
                      </h2>

                      <p className="mt-5 max-w-[58ch] leading-7 text-seduh-soft">
                        {
                          promotion.detail
                        }
                      </p>
                    </div>

                    <aside className="border-t border-pasir pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                      <p className="text-xs uppercase tracking-[0.16em] text-seduh-soft">
                        Masa berlaku
                      </p>

                      <p className="mt-2 font-display text-xl">
                        {promotion.endsAt
                          ? `Sampai ${dateFormatter.format(
                              promotion.endsAt,
                            )}`
                          : "Sampai pemberitahuan berikutnya"}
                      </p>

                      <p className="mt-5 text-sm leading-6 text-seduh-soft">
                        Syarat dalam
                        keterangan promo
                        tetap berlaku.
                        Ketersediaan stok
                        dan kelayakan
                        pesanan belum
                        otomatis dijamin.
                      </p>

                      <Link
                        href="/menu"
                        className="mt-6 inline-flex h-10 items-center border-b border-seduh text-sm"
                      >
                        Lihat menu
                      </Link>
                    </aside>
                  </li>
                ),
              )}
            </ol>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-14 md:px-10 md:py-20">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-genteng">
              Tanya Tehyan
            </p>

            <h2 className="mt-3 max-w-[15ch] font-display text-3xl font-light md:text-4xl">
              Mau cek promo lewat
              percakapan?
            </h2>
          </div>

          <button
            type="button"
            data-open-tehyan-chat
            className="hidden"
            aria-hidden="true"
          />
        </div>

        <p className="mt-4 max-w-[55ch] leading-7 text-seduh-soft">
          Tanya Tehyan membaca data
          promo aktif dari sumber yang
          sama dengan halaman ini.
          Untuk syarat seperti hari,
          stok, atau minimum pembelian,
          konfirmasi tetap diperlukan.
        </p>
      </section>
    </main>
  );
}