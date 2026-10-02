import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartButton from "@/features/cart/AddToCartButton";
import ProductPhoto from "@/components/menu/ProductPhoto";
import { getProductBySlug, rupiah } from "@/server/services/catalog";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Menu tidak ditemukan" };
  return { title: product.name, description: product.description };
}
export const dynamic = "force-dynamic";
export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  return <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-10 md:py-12">
    <Link href="/menu" className="inline-flex min-h-11 items-center text-sm text-seduh-soft underline underline-offset-4 hover:text-genteng">Kembali ke menu</Link>
    <article className="product-detail">
      <div className="product-detail-photo">
        <ProductPhoto product={product} sizes="(min-width: 1280px) 620px, (min-width: 768px) 53vw, calc(100vw - 32px)" priority />
      </div>
      <div className="product-detail-copy">
        <p className="text-sm text-daun">{product.category.name}</p>
        <h1 className="mt-4 font-display text-4xl font-light leading-tight lg:text-5xl">{product.name}</h1>
        <p className="mt-6 max-w-[44ch] text-seduh-soft">{product.description}</p>
        {product.isBestSeller && <p className="mt-5 text-sm text-daun">Paling laris</p>}
        <div className="mt-8 border-t border-pasir pt-6">
          <p className="font-display text-2xl tabular-nums">{rupiah(product.price)}</p>
          <p className="mt-1 text-sm text-seduh-soft">Harga per porsi</p>
          <AddToCartButton productId={product.id} name={product.name} price={product.price} available={product.available} className="mt-5 min-h-11" />
        </div>
      </div>
    </article>
  </div>;
}
