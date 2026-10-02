import Link from "next/link";
import AddToCartButton from "@/features/cart/AddToCartButton";
import { listFeaturedProducts, rupiah } from "@/server/services/catalog";
import Reveal from "@/components/ui/Reveal";
import ProductPhoto from "@/components/menu/ProductPhoto";
import FeaturedSelection from "./FeaturedSelection";

export default async function FeaturedMenu() {
  const products = await listFeaturedProducts(4);
  if (products.length === 0) return null;
  return <section className="border-t border-pasir">
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-10 md:py-20">
      <Reveal y={8}>
        <div className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-6">
            <p className="text-sm text-genteng">Pilihan Tehyan</p>
            <h2 className="mt-4 max-w-[20ch] font-display text-3xl font-light leading-tight md:text-4xl">Yang sering kembali dipesan.</h2>
          </div>
          <p className="max-w-[48ch] text-sm text-seduh-soft md:col-span-5 md:col-start-8">
            Racikan yang menjadi langganan pelanggan kami. Dibuat sederhana,
            diseduh saat dipesan, dan tidak dibuat lebih rumit dari yang seharusnya.
          </p>
        </div>
      </Reveal>
      <FeaturedSelection products={products.map(({ id, name, imageUrl }) => ({ id, name, imageUrl }))}>
        <ol className="featured-list">
          {products.map((product, index) => <li key={product.id}>
            <article className="featured-entry" data-featured-product={product.id}>
              <div className="featured-thumbnail"><ProductPhoto product={product} sizes="72px" /></div>
              <div className="min-w-0">
                <div className="menu-entry-meta"><span>{String(index + 1).padStart(2, "0")}</span><span>{product.category.name}</span></div>
                <h3 className="mt-2 font-display text-2xl font-light leading-tight">
                  <Link href={`/menu/${product.slug}`} className="hover:text-genteng">{product.name}</Link>
                </h3>
                <p className="mt-3 max-w-[44ch] text-sm text-seduh-soft">{product.description}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm tabular-nums">{rupiah(product.price)}</span>
                  <AddToCartButton productId={product.id} name={product.name} price={product.price} available={product.available} />
                </div>
              </div>
            </article>
          </li>)}
        </ol>
      </FeaturedSelection>
      <Link href="/menu" className="mt-8 inline-flex min-h-11 items-center text-sm text-genteng underline underline-offset-4">Lihat semua menu</Link>
    </div>
  </section>;
}
