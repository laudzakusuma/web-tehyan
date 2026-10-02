"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import useReducedMotionPreference from "@/components/ui/useReducedMotionPreference";
import ProductPhoto from "./ProductPhoto";
import type { ProductVisual } from "@/lib/product-photography";

type Layer = { key: number; product: ProductVisual };
const photoKey = (product: ProductVisual) => `${product.id}:${product.imageUrl}`;

export default function PhotoTransition({ product, sizes, priority = false }: {
  product: ProductVisual; sizes: string; priority?: boolean;
}) {
  const reduceMotion = useReducedMotionPreference();
  const [layers, setLayers] = useState<Layer[]>([{ key: 0, product }]);
  const serial = useRef(1);
  const requested = useRef(photoKey(product));
  requested.current = photoKey(product);
  const last = layers[layers.length - 1];
  const pending = photoKey(last.product) !== photoKey(product);

  function loaded() {
    const key = photoKey(product);
    const layer = { key: serial.current++, product };
    setLayers(previous => {
      if (requested.current !== key || photoKey(previous[previous.length - 1].product) === key) return previous;
      return reduceMotion ? [layer] : [...previous, layer];
    });
  }

  return <div className="photo-transition" data-photo-product={product.id} data-shown-photo={last.product.id}>
    {layers.map((layer, index) => <motion.div key={layer.key} className="photo-layer photo-rendered"
      aria-hidden={index !== layers.length - 1 || undefined}
      initial={index === 0 || reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.8, ease: [0.2, 0, 0, 1] }}
      onAnimationComplete={() => {
        // A fully opaque layer can replace everything beneath it, even during rapid retargeting.
        setLayers(previous => {
          const position = previous.findIndex(item => item.key === layer.key);
          return position > 0 ? previous.slice(position) : previous;
        });
      }}>
      <ProductPhoto product={layer.product} sizes={sizes} priority={priority && layer.key === 0} />
    </motion.div>)}
    {pending && <div key={photoKey(product)} className="photo-layer" style={{ opacity: 0 }} aria-hidden="true">
      <ProductPhoto product={product} sizes={sizes} decorative onReady={loaded} />
    </div>}
  </div>;
}
