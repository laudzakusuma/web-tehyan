import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { useCartStore } from "@/features/cart/store";
import CartAction from "./CartAction";

describe("agent cart proposal", () => {
  it("requires an explicit confirmation and escapes product text without mutating the cart", () => {
    const before = useCartStore.getState().items;
    const html = renderToStaticMarkup(<CartAction action={{
      id: "proposal", type: "ADD_TO_CART", payload: {
        product: { id: "tea", slug: "tea", name: "<script>alert(1)</script>", price: 18000, imageUrl: null }, quantity: 1,
      },
    }} />);
    expect(html).toContain("Tambahkan ke keranjang");
    expect(html).toContain('type="button"');
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("Ditambahkan:");
    expect(useCartStore.getState().items).toBe(before);
  });
});
