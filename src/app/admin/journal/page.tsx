import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  AdminLogoutButton,
} from "@/features/admin/AdminLogoutButton";

import {
  ArticleManager,
} from "@/features/admin/ArticleManager";

import {
  getCurrentAdmin,
} from "@/server/auth/admin-session";

import {
  listAdminArticles,
} from "@/server/services/articles";

export const dynamic =
  "force-dynamic";

export default async function AdminJournalPage() {
  const admin =
    await getCurrentAdmin();

  if (!admin) {
    redirect(
      "/admin/login",
    );
  }

  const articles =
    await listAdminArticles();

  const items =
    articles.map(
      (article) => ({
        id: article.id,
        slug: article.slug,
        title:
          article.title,
        excerpt:
          article.excerpt,
        content:
          article.content,

        coverImageUrl:
          article.coverImageUrl,

        status:
          article.status,

        publishedAt:
          article.publishedAt
            ?.toISOString() ??
          null,
      }),
    );

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-14 md:px-10 md:py-20">
      <header className="border-b border-seduh pb-8">
        <p className="text-xs uppercase tracking-[0.22em] text-genteng">
          Admin Tehyan
        </p>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-5xl font-light md:text-6xl">
              Journal
            </h1>

            <p className="mt-3 max-w-[55ch] text-seduh-soft">
              Tulis, simpan draft,
              dan terbitkan catatan
              Kedai Tehyan.
            </p>
          </div>

          <nav className="flex flex-wrap gap-5 text-sm">
            <Link
              href="/admin/pesanan"
              className="border-b border-transparent pb-1 hover:border-seduh"
            >
              Pesanan
            </Link>

            <Link
              href="/admin/promo"
              className="border-b border-transparent pb-1 hover:border-seduh"
            >
              Promo
            </Link>

            <Link
              href="/journal"
              className="border-b border-transparent pb-1 hover:border-seduh"
            >
              Lihat Journal
            </Link>

            <AdminLogoutButton />
          </nav>
        </div>
      </header>

      <div className="pt-10">
        <ArticleManager
          articles={items}
        />
      </div>
    </main>
  );
}