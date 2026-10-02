import Link from "next/link";
import HeroVisual from "./HeroVisual";
import { listFeaturedProducts } from "@/server/services/catalog";
import { productImageSource } from "@/lib/product-photography";

export default async function Hero() {
  const products = (await listFeaturedProducts(4))
    .filter(product => product.category.slug !== "camilan" && productImageSource(product.imageUrl))
    .slice(0, 3).map(({ id, name, imageUrl }) => ({ id, name, imageUrl }));

  return <section className={`hero-composition ${products.length ? "" : "hero-without-photo"}`}>
    <div className="hero-copy">
      <p className="mb-5 text-sm text-daun">Kedai Tehyan</p>
      <h1 className="font-display text-[2rem] font-light leading-[1.06] md:text-5xl lg:text-6xl">
        Teh yang sederhana, dibuat dengan rasa yang serius.
      </h1>
      <p className="mt-6 max-w-[44ch] text-seduh-soft">
        Kedai teh lingkungan di Depok. Racikan teh hitam dan melati,
        diseduh pekat, disajikan hangat atau dingin.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-6">
        <Link href="/menu" className="inline-flex h-11 items-center rounded-field bg-genteng px-6 text-kertas transition-colors hover:bg-genteng-deep">Pesan Sekarang</Link>
        <Link href="/menu" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-genteng">Lihat menu</Link>
      </div>
    </div>
    <HeroVisual products={products} />
  </section>;
}
