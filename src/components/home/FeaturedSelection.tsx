"use client";

import { useState, type ReactNode } from "react";
import PhotoTransition from "@/components/menu/PhotoTransition";
import type { ProductVisual } from "@/lib/product-photography";

export default function FeaturedSelection({ products, children }: { products: ProductVisual[]; children: ReactNode }) {
  const [activeId, setActiveId] = useState(products[0]?.id);
  const active = products.find(product => product.id === activeId) ?? products[0];
  if (!active) return null;
  function select(target: EventTarget) {
    const id = (target as HTMLElement).closest<HTMLElement>("[data-featured-product]")?.dataset.featuredProduct;
    if (id) setActiveId(id);
  }
  return <div className="featured-experience" data-featured-active={active.id}
    onMouseOver={event => select(event.target)} onFocusCapture={event => select(event.target)}>
    <div className="featured-stage" aria-hidden="true"><PhotoTransition product={active} sizes="(min-width: 1280px) 420px, (min-width: 1024px) 36vw, 1px" /></div>
    {children}
  </div>;
}
