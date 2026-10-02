import type { Metadata } from "next";
import Link from "next/link";
import MenuList from "@/components/menu/MenuList";
import { listCategories, listProducts } from "@/server/services/catalog";

export const metadata: Metadata = { title: "Menu" };
export const dynamic = "force-dynamic";

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ kategori?: string; q?: string }> }) {
  const { kategori, q } = await searchParams;
  const [cats, products] = await Promise.all([listCategories(), listProducts({ category: kategori, q })]);
  function categoryLink(slug?: string) {
    const params = new URLSearchParams();
    if (slug) params.set("kategori", slug);
    if (q) params.set("q", q);
    return params.size ? `/menu?${params}` : "/menu";
  }
  return <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-10 md:py-12">
    <div className="menu-heading">
      <div>
        <p className="mb-3 text-sm text-daun">Dari dapur Tehyan</p>
        <h1 className="font-display text-4xl font-light md:text-5xl">Menu</h1>
      </div>
      <form action="/menu" className="menu-search">
        <label className="sr-only" htmlFor="q">Cari menu</label>
        {kategori && <input type="hidden" name="kategori" value={kategori} />}
        <input key={`${kategori ?? ""}:${q ?? ""}`} id="q" name="q" defaultValue={q} placeholder="Cari minuman atau camilan"
          className="h-11 min-w-0 flex-1 rounded-field border border-pasir bg-kertas px-3 text-sm" />
        <button type="submit" className="h-11 px-3 text-sm text-genteng hover:underline">Cari</button>
      </form>
    </div>
    <nav aria-label="Kategori" className="menu-categories">
      <Link href={categoryLink()} aria-current={!kategori ? "page" : undefined} className={categoryClass(!kategori)}>Semua</Link>
      {cats.map(category => <Link key={category.id} href={categoryLink(category.slug)} aria-current={kategori === category.slug ? "page" : undefined}
        className={categoryClass(kategori === category.slug)}>{category.name}</Link>)}
    </nav>
    <MenuList products={products} />
  </div>;
}
const categoryClass = (active: boolean) => `inline-flex min-h-11 items-center border-b-2 py-2 text-sm transition-colors ${active ? "border-genteng text-genteng" : "border-transparent text-seduh-soft hover:text-seduh"}`;
