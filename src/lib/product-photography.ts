export const developmentProductPhotos = {
  "teh-tawar-hangat": { alt: "Foto ilustrasi teh hangat dalam cangkir kaca", position: "50% 50%" },
  "teh-manis-tehyan": { alt: "Foto ilustrasi teh hitam dalam gelas", position: "50% 55%" },
  "teh-tarik-tehyan": { alt: "Foto ilustrasi teh susu dengan lapisan busa", position: "50% 60%" },
  "teh-susu-gula-aren": { alt: "Foto ilustrasi dua gelas teh susu", position: "50% 55%" },
  "teh-lemon-madu": { alt: "Foto ilustrasi teh dingin dengan lemon dan madu", position: "50% 55%" },
  "teh-leci": { alt: "Foto ilustrasi teh dingin dengan buah leci", position: "50% 50%" },
  "kopi-susu-tehyan": { alt: "Foto ilustrasi kopi dan susu dalam gelas", position: "50% 55%" },
  "pisang-goreng": { alt: "Foto ilustrasi pisang goreng renyah di atas piring", position: "50% 65%" },
} as const;

export function developmentPhotoPath(slug: string): string | null {
  return Object.hasOwn(developmentProductPhotos, slug) ? `/images/products/${slug}.webp` : null;
}

export function productImageSource(value: string | null): string | null {
  if (!value || value.includes("\\")) return null;
  if (/^\/(?!\/)[a-zA-Z0-9_/-]+\.(webp|avif|png|jpe?g)$/i.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export type ProductVisual = { id: string; name: string; imageUrl: string | null };

export function productPhotoDetails(product: ProductVisual) {
  const src = productImageSource(product.imageUrl);
  const slug = src?.match(/^\/images\/products\/([^/]+)\.webp$/)?.[1];
  const stock = slug && Object.hasOwn(developmentProductPhotos, slug)
    ? developmentProductPhotos[slug as keyof typeof developmentProductPhotos] : null;
  return { src, alt: stock?.alt ?? product.name, position: stock?.position ?? "50% 50%", isDevelopment: !!stock };
}
