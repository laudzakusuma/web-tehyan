import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MenuPage from "./page";
import { listCategories, listProducts } from "@/server/services/catalog";

vi.mock("@/server/services/catalog", () => ({ listCategories: vi.fn(), listProducts: vi.fn(), rupiah: (value: number) => `Rp${value}` }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listCategories).mockResolvedValue([{ id: "fruit", slug: "teh-buah", name: "Teh Buah", sort: 3 }]);
  vi.mocked(listProducts).mockResolvedValue([]);
});

describe("menu query compatibility", () => {
  it("passes filters to the existing catalog service and preserves the query in category links", async () => {
    const html = renderToStaticMarkup(await MenuPage({ searchParams: Promise.resolve({ kategori: "teh-buah", q: "lemon & madu" }) }));
    expect(listProducts).toHaveBeenCalledWith({ category: "teh-buah", q: "lemon & madu" });
    expect(html).toContain('href="/menu?q=lemon+%26+madu"');
    expect(html).toContain('name="kategori" value="teh-buah"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('type="submit"');
  });
  it("renders search results without retaining a category when none is selected", async () => {
    const html = renderToStaticMarkup(await MenuPage({ searchParams: Promise.resolve({ q: "tidak ditemukan" }) }));
    expect(html).not.toContain('name="kategori"');
    expect(html).toContain("Belum ada menu yang cocok.");
  });
});
