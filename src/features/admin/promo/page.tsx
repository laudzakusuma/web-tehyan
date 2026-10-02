import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  PromotionManager,
} from "@/features/admin/PromotionManager";

import {
  getCurrentAdmin,
} from "@/server/auth/admin-session";

import {
  listAdminPromotions,
} from "@/server/services/catalog";

export const dynamic =
  "force-dynamic";

export default async function AdminPromoPage() {
  const admin =
    await getCurrentAdmin();

  if (!admin) {
    redirect(
      "/admin/login",
    );
  }

  const promotions =
    await listAdminPromotions();

  const items =
    promotions.map(
      (promotion) => ({
        id: promotion.id,

        title:
          promotion.title,

        detail:
          promotion.detail,

        active:
          promotion.active,

        endsOn:
          promotion.endsAt
            ?.toISOString()
            .slice(0, 10) ??
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
              Promo
            </h1>

            <p className="mt-3 max-w-[55ch] text-seduh-soft">
              Kelola penawaran yang
              muncul di halaman publik
              dan dibaca oleh Tanya
              Tehyan.
            </p>
          </div>

          <nav className="flex gap-5 text-sm">
            <Link
              href="/admin/pesanan"
              className="border-b border-transparent pb-1 hover:border-seduh"
            >
              Pesanan
            </Link>

            <Link
              href="/promo"
              className="border-b border-transparent pb-1 hover:border-seduh"
            >
              Lihat halaman publik
            </Link>
          </nav>
        </div>
      </header>

      <div className="pt-10">
        <PromotionManager
          promotions={items}
        />
      </div>
    </main>
  );
}