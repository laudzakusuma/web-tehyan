"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import PhotoTransition from "./PhotoTransition";
import type { ProductVisual } from "@/lib/product-photography";

export default function MenuExperience({ products, children }: { products: ProductVisual[]; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState(products[0]?.id);
  const active = products.find(product => product.id === activeId) ?? products[0];

  useEffect(() => {
    const container = root.current;
    if (!container || !active) return;
    for (const entry of Array.from(container.querySelectorAll<HTMLElement>("[data-menu-product]"))) {
      entry.dataset.active = String(entry.dataset.menuProduct === active.id);
    }
  }, [active]);

  useEffect(() => {
    const container = root.current;
    if (!container || !window.IntersectionObserver) return;
    const desktop = window.matchMedia("(min-width: 1024px) and (min-height: 640px)");
    let observer: IntersectionObserver | undefined;
    function connect() {
      observer?.disconnect();
      if (!desktop.matches || !container) return;
      const visible = new Set<HTMLElement>();
      const end = container.querySelector("[data-menu-end]");
      let atEnd = false;
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.target === end) { atEnd = entry.isIntersecting; continue; }
          if (entry.isIntersecting) visible.add(entry.target as HTMLElement);
          else visible.delete(entry.target as HTMLElement);
        }
        const focused = document.activeElement instanceof HTMLElement
          ? document.activeElement.closest<HTMLElement>("[data-menu-product]") : null;
        const focusedId = focused?.dataset.menuProduct;
        if (focused && focusedId && visible.has(focused)) { setActiveId(focusedId); return; }
        if (atEnd && window.scrollY > 0) { setActiveId(products[products.length - 1]?.id); return; }
        const closest = [...visible].sort((a, b) => {
          const distance = (element: HTMLElement) => {
            const rect = element.getBoundingClientRect();
            return Math.abs(rect.top + rect.height / 2 - window.innerHeight * 0.4);
          };
          return distance(a) - distance(b);
        })[0];
        if (closest?.dataset.menuProduct) setActiveId(closest.dataset.menuProduct);
      }, { rootMargin: "-96px 0px 0px 0px", threshold: [0, 0.25, 0.5, 0.75, 1] });
      for (const entry of Array.from(container.querySelectorAll("[data-menu-product]"))) observer.observe(entry);
      if (end) observer.observe(end);
    }
    connect();
    desktop.addEventListener("change", connect);
    return () => { observer?.disconnect(); desktop.removeEventListener("change", connect); };
  }, [products]);

  if (!active) return <>{children}</>;
  return <div ref={root} className="menu-experience" data-active-product={active.id}
    onFocusCapture={event => {
      const id = (event.target as HTMLElement).closest<HTMLElement>("[data-menu-product]")?.dataset.menuProduct;
      if (id) setActiveId(id);
    }}>
    <div className="menu-stage" aria-hidden="true">
      <div className="menu-stage-image"><PhotoTransition product={active} sizes="(min-width: 1280px) 620px, 54vw" /></div>
      <div className="photo-caption"><span>{active.name}</span><span>{String(products.indexOf(active) + 1).padStart(2, "0")} / {String(products.length).padStart(2, "0")}</span></div>
    </div>
    {children}
    <span className="menu-end" data-menu-end="" aria-hidden="true" />
  </div>;
}
