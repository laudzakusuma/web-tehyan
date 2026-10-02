"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { productPhotoDetails, type ProductVisual } from "@/lib/product-photography";

type Props = { product: ProductVisual; sizes: string; priority?: boolean; decorative?: boolean; onReady?: () => void };

export default function ProductPhoto({ product, sizes, priority = false, decorative = false, onReady }: Props) {
  const { src, alt, position, isDevelopment } = productPhotoDetails(product);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const missing = !src || src === failedSrc;
  useEffect(() => { if (missing) onReady?.(); }, [missing, onReady]);

  if (missing) return <div className="photo-fallback" data-photo-state="missing" aria-hidden={decorative || undefined}><span>Foto belum tersedia</span></div>;
  return <><Image src={src} alt={decorative ? "" : alt} fill sizes={sizes} priority={priority}
    unoptimized={!src.startsWith("/")} className="object-cover" style={{ objectPosition: position }}
    onLoad={onReady} onError={() => { setFailedSrc(src); onReady?.(); }} />
    {isDevelopment && <span className="photo-notice" aria-hidden="true">Foto ilustrasi</span>}</>;
}
