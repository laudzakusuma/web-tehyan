import type {
  Metadata,
} from "next";

import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  getPublishedArticleBySlug,
} from "@/server/services/articles";

export const dynamic =
  "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const dateFormatter =
  new Intl.DateTimeFormat(
    "id-ID",
    {
      dateStyle: "long",
      timeZone: "Asia/Jakarta",
    },
  );

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } =
    await params;

  const article =
    await getPublishedArticleBySlug(
      slug,
    );

  if (!article) {
    return {
      title:
        "Journal | Kedai Tehyan",
    };
  }

  return {
    title: `${article.title} | Kedai Tehyan`,
    description:
      article.excerpt,
  };
}

export default async function JournalArticlePage({
  params,
}: PageProps) {
  const { slug } =
    await params;

  const article =
    await getPublishedArticleBySlug(
      decodeURIComponent(slug),
    );

  if (!article) {
    notFound();
  }

  const paragraphs =
    article.content
      .split(/\n+/)
      .map((paragraph) =>
        paragraph.trim(),
      )
      .filter(Boolean);

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-16 md:px-10 md:py-24">
      <article>
        <header className="border-b border-seduh pb-12">
          <Link
            href="/journal"
            className="text-xs uppercase tracking-[0.2em] text-genteng"
          >
            ← Journal Tehyan
          </Link>

          <h1 className="mt-6 max-w-[15ch] font-display text-5xl font-light leading-[0.98] md:text-7xl">
            {article.title}
          </h1>

          <p className="mt-7 max-w-[54ch] text-lg leading-8 text-seduh-soft">
            {article.excerpt}
          </p>

          {article.publishedAt && (
            <time
              dateTime={
                article.publishedAt.toISOString()
              }
              className="mt-8 block text-sm text-seduh-soft"
            >
              {dateFormatter.format(
                article.publishedAt,
              )}
            </time>
          )}
        </header>

        <div className="mx-auto max-w-[680px] py-12 md:py-16">
          {paragraphs.map(
            (
              paragraph,
              index,
            ) => (
              <p
                key={index}
                className="mb-7 font-display text-[1.35rem] font-light leading-[1.75] last:mb-0 md:text-[1.5rem]"
              >
                {paragraph}
              </p>
            ),
          )}
        </div>

        <footer className="border-t border-pasir pt-8">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-genteng">
                Kedai Tehyan
              </p>

              <p className="mt-2 text-sm text-seduh-soft">
                Catatan dari ruang
                minum kami.
              </p>
            </div>

            <Link
              href="/journal"
              className="inline-flex h-11 items-center border border-seduh px-5 transition-colors hover:bg-seduh hover:text-gading"
            >
              Kembali ke Journal
            </Link>
          </div>
        </footer>
      </article>
    </main>
  );
}