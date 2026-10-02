"use client";

import Image from "next/image";
import { useState } from "react";

export default function OutletImage({ src, name }: { src: string; name: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (failedSrc === src) return null;

  return (
    <Image src={src} alt={`Suasana ${name}`} width={1200} height={800}
      unoptimized onError={() => setFailedSrc(src)} className="mt-6 h-auto w-full" />
  );
}
