import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { developmentPhotoPath, developmentProductPhotos, productImageSource, productPhotoDetails } from "./product-photography";

describe("product photography", () => {
  it("maps all eight seeded products to existing distinct assets", () => {
    const paths = Object.keys(developmentProductPhotos).map(slug => developmentPhotoPath(slug)!);
    expect(paths).toHaveLength(8);
    expect(new Set(paths).size).toBe(8);
    for (const path of paths) expect(existsSync(resolve("public", `.${path}`))).toBe(true);
  });
  it("does not invent photos for new products or inherited property names", () => {
    expect(developmentPhotoPath("new-menu")).toBeNull();
    expect(developmentPhotoPath("toString")).toBeNull();
  });
  it.each([null, "", "javascript:alert(1)", "data:image/png;base64,abc", "http://example.com/photo.jpg", "//example.com/photo.jpg", "https://user:secret@example.com/a.jpg", "/images/../secret.jpg", "\\images\\photo.webp"])("rejects unsafe image source %s", value => {
    expect(productImageSource(value)).toBeNull();
  });
  it("accepts local assets and delivers credential-free HTTPS images without a server proxy", () => {
    expect(productImageSource("/images/products/teh-leci.webp")).toBe("/images/products/teh-leci.webp");
    expect(productImageSource("https://example.com/photo.jpg")).toBe("https://example.com/photo.jpg");
  });
  it("labels development images honestly and keeps official image descriptions separate", () => {
    const stock = productPhotoDetails({ id: "a", name: "Teh Leci", imageUrl: developmentPhotoPath("teh-leci") });
    expect(stock.isDevelopment).toBe(true);
    expect(stock.alt).toContain("Foto ilustrasi");
    const official = productPhotoDetails({ id: "a", name: "Teh Leci", imageUrl: "/images/official/leci.webp" });
    expect(official.isDevelopment).toBe(false);
    expect(official.alt).toBe("Teh Leci");
  });
});
