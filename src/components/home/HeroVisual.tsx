"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import useReducedMotionPreference from "@/components/ui/useReducedMotionPreference";
import PhotoTransition from "@/components/menu/PhotoTransition";
import type { ProductVisual } from "@/lib/product-photography";

export default function HeroVisual({ products }: { products: ProductVisual[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [motionReady, setMotionReady] = useState(false);
  const reduceMotion = useReducedMotionPreference();
  const reduced = motionReady && !!reduceMotion;
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => setMotionReady(true), []);
  useEffect(() => {
    if (!motionReady || reduceMotion !== false || paused || products.length < 2 || !window.IntersectionObserver) return;
    const visible = new Set<Element>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
    });
    if (root.current) observer.observe(root.current);
    const timer = window.setInterval(() => {
      if (!document.hidden && visible.size) setIndex(value => (value + 1) % products.length);
    }, 5500);
    return () => { window.clearInterval(timer); observer.disconnect(); };
  }, [motionReady, paused, reduceMotion, products.length]);

  const product = products[index] ?? products[0];
  if (!product) return null;
  return <div ref={root} className="hero-visual">
    <div className="hero-photo"><PhotoTransition product={product} sizes="(min-width: 1280px) 580px, (min-width: 768px) 48vw, calc(100vw - 32px)" priority /></div>
    <div className="photo-caption"><span>{product.name}</span><div className="flex items-center gap-4">
      <span aria-hidden="true">{String(index + 1).padStart(2, "0")} / {String(products.length).padStart(2, "0")}</span>
      {products.length > 1 && <button type="button" className="photo-pause" disabled={reduced}
        aria-label={paused || reduced ? "Putar pergantian foto" : "Jeda pergantian foto"}
        title={paused || reduced ? "Putar pergantian foto" : "Jeda pergantian foto"}
        aria-pressed={paused || reduced} onClick={() => setPaused(value => !value)}>
        {paused || reduced ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
      </button>}
    </div></div>
  </div>;
}
