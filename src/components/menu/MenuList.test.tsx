import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MenuList from "./MenuList";
import type { listProducts } from "@/server/services/catalog";

type Product = Awaited<ReturnType<typeof listProducts>>[number];
const product: Product = {
  id: "tea", slug: "teh-leci", name: "Teh Leci", description: "Deskripsi tersimpan.", price: 20000,
  sweetness: 2, isBestSeller: true, available: true, imageUrl: "/images/products/teh-leci.webp",
  categoryId: "fruit", category: { id: "fruit", name: "Teh Buah", slug: "teh-buah", sort: 3 },
};

describe("server-rendered menu narrative", () => {
  it("renders a deliberate empty state without a sticky stage", () => {
    const html = renderToStaticMarkup(<MenuList products={[]} />);
    expect(html).toContain("Belum ada menu yang cocok.");
    expect(html).not.toContain("menu-stage");
  });
  it("renders one product with complete information and a single focused state", () => {
    const html = renderToStaticMarkup(<MenuList products={[product]} />);
    expect(html).toContain('data-active-product="tea"');
    expect(html).toContain("01 / 01");
    expect(html).toContain('href="/menu/teh-leci"');
    expect(html).toContain("Deskripsi tersimpan.");
    expect(html).toContain("Rp20.000");
    expect(html).toContain("Foto ilustrasi");
  });
  it("keeps later products in DOM order, including descriptions and available CTAs", () => {
    const html = renderToStaticMarkup(<MenuList products={[product, { ...product, id: "second", name: "Produk Kedua" }]} />);
    expect(html.indexOf('data-menu-product="tea"')).toBeLessThan(html.indexOf('data-menu-product="second"'));
    expect(html.match(/Deskripsi tersimpan\./g)).toHaveLength(2);
    expect(html.match(/\+ Tambah/g)).toHaveLength(2);
  });
  it("shows an honest photo fallback while keeping unavailable products disabled", () => {
    const html = renderToStaticMarkup(<MenuList products={[{ ...product, imageUrl: null, available: false }]} />);
    expect(html).toContain("Foto belum tersedia");
    expect(html).toContain("Sedang habis");
    expect(html).toContain('disabled=""');
  });
});
