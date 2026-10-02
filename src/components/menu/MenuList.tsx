import Link from "next/link";
import AddToCartButton from "@/features/cart/AddToCartButton";
import { rupiah, type listProducts } from "@/server/services/catalog";
import MenuExperience from "./MenuExperience";
import ProductPhoto from "./ProductPhoto";

type Products = Awaited<ReturnType<typeof listProducts>>;

export default function MenuList({ products }: { products: Products }) {
  if (products.length === 0) return <div className="menu-empty">
    <p className="font-display text-2xl">Belum ada menu yang cocok.</p>
    <p className="mt-3 text-sm text-seduh-soft">Coba kata kunci lain atau pilih kategori Semua.</p>
    <Link href="/menu" className="mt-5 inline-flex min-h-11 items-center text-genteng underline underline-offset-4">Lihat semua menu</Link>
  </div>;
  return <MenuExperience key={products.map(product => product.id).join(":")}
    products={products.map(({ id, name, imageUrl }) => ({ id, name, imageUrl }))}>
    <ul className="menu-narrative">
      {products.map((product, index) => <li key={product.id}>
        <article className="menu-entry" data-menu-product={product.id} data-active={index === 0}>
          <div className="menu-entry-photo"><ProductPhoto product={product} sizes="(min-width: 1024px) and (min-height: 640px) 88px, (min-width: 768px) 45vw, calc(100vw - 32px)" /></div>
          <div className="menu-entry-content">
            <div className="menu-entry-meta"><span>{String(index + 1).padStart(2, "0")}</span><span>{product.category.name}</span>{product.isBestSeller && <span className="text-daun">Paling laris</span>}</div>
            <h2 className="menu-product-name"><Link href={`/menu/${product.slug}`}>{product.name}</Link></h2>
            <p className="menu-description">{product.description}</p>
            <div className="menu-order"><span className="font-display text-xl tabular-nums">{rupiah(product.price)}</span>
              <AddToCartButton productId={product.id} name={product.name} price={product.price} available={product.available} />
            </div>
          </div>
        </article>
      </li>)}
    </ul>
  </MenuExperience>;
}
