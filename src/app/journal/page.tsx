import Link from "next/link";

import {
  listPublishedArticles,
} from "@/server/services/articles";

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

export default async function JournalPage() {
  const articles =
    await listPublishedArticles(
      20,
    );

  return (
    <main>
      <section className="mx-auto max-w-[1200px] px-4 pb-14 pt-16 md:px-10 md:pb-20 md:pt-24">
        <p className="text-xs uppercase tracking-[0.24em] text-genteng">
          Journal Tehyan
        </p>

        <div className="mt-5 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <h1 className="max-w-[11ch] font-display text-5xl font-light leading-[0.95] md:text-7xl">
            Catatan dari meja,
            dapur, dan secangkir
            teh.
          </h1>

          <p className="max-w-[42ch] leading-7 text-seduh-soft lg:pb-2">
            Cerita tentang teh,
            kebiasaan kecil, ruang,
            dan hal-hal yang layak
            dinikmati sedikit lebih
            pelan.
          </p>
        </div>
      </section>

      <section className="border-y border-pasir">
        <div className="mx-auto max-w-[1200px] px-4 md:px-10">
          {articles.length === 0 ? (
            <div className="py-20 md:py-28">
              <p className="text-xs uppercase tracking-[0.2em] text-seduh-soft">
                Journal
              </p>

              <h2 className="mt-4 max-w-[15ch] font-display text-4xl font-light md:text-5xl">
                Belum ada catatan
                yang diterbitkan.
              </h2>
            </div>
          ) : (
            <ol>
              {articles.map(
                (
                  article,
                  index,
                ) => (
                  <li
                    key={article.id}
                    className="grid gap-8 border-b border-pasir py-12 last:border-b-0 md:py-16 lg:grid-cols-[90px_minmax(0,1fr)_260px]"
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
                        Catatan
                      </p>

                      <h2 className="mt-3 max-w-[20ch] font-display text-3xl font-light leading-tight md:text-4xl">
                        <Link
                          href={`/journal/${article.slug}`}
                          className="transition-colors hover:text-genteng"
                        >
                          {
                            article.title
                          }
                        </Link>
                      </h2>

                      <p className="mt-5 max-w-[58ch] leading-7 text-seduh-soft">
                        {
                          article.excerpt
                        }
                      </p>
                    </div>

                    <aside className="border-t border-pasir pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                      <p className="text-xs uppercase tracking-[0.16em] text-seduh-soft">
                        Diterbitkan
                      </p>

                      <p className="mt-2 font-display text-lg">
                        {article.publishedAt
                          ? dateFormatter.format(
                              article.publishedAt,
                            )
                          : "—"}
                      </p>

                      <Link
                        href={`/journal/${article.slug}`}
                        className="mt-7 inline-flex border-b border-seduh pb-1 text-sm"
                      >
                        Baca catatan
                      </Link>
                    </aside>
                  </li>
                ),
              )}
            </ol>
          )}
        </div>
      </section>
    </main>
  );
}