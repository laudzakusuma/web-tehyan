"use client";

import { useEffect, useRef, useState } from "react";
import { useCartStore } from "./store";

type Props = {
  productId: string;
  name: string;
  price: number;
  available?: boolean;
  className?: string;
};

export default function AddToCartButton({ productId, name, price, available = true, className = "" }: Props) {
  const addItem = useCartStore((state) => state.addItem);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function add() {
    addItem({ productId, name, price });
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={add}
      disabled={!available}
      className={`inline-flex h-10 items-center justify-center rounded-field border px-4 text-sm transition-colors ${
        available
          ? "border-genteng text-genteng hover:bg-genteng hover:text-kertas"
          : "cursor-not-allowed border-pasir text-seduh-soft opacity-60"
      } ${className}`}
    >
      {available ? (added ? "Masuk keranjang" : "+ Tambah") : "Sedang habis"}
    </button>
  );
}
