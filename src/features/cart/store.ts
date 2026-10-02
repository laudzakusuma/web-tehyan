"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { agentUIActionSchema } from "@/lib/chat-contract";

export type CartOptions = Record<string, string>;

export type CartItem = {
  key: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  options?: CartOptions;
};

type AddItemInput = Omit<CartItem, "key" | "quantity"> & { quantity?: number };
export type CartActionReceipt = {
  status: "applied" | "duplicate" | "invalid";
  quantityAdded: number;
};

type CartState = {
  items: CartItem[];
  appliedActionIds: string[];
  addItem: (item: AddItemInput) => void;
  applyAgentAction: (action: unknown) => CartActionReceipt;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

function optionsKey(options?: CartOptions) {
  if (!options) return "";
  return Object.entries(options)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
}

export function cartItemKey(productId: string, options?: CartOptions) {
  const suffix = optionsKey(options);
  return suffix ? `${productId}::${suffix}` : productId;
}

function addToItems(items: CartItem[], input: AddItemInput) {
  const quantity = Math.max(1, Math.min(20, Math.trunc(input.quantity ?? 1)));
  const key = cartItemKey(input.productId, input.options);
  const existing = items.find((item) => item.key === key);
  const quantityAdded = Math.min(quantity, 20 - (existing?.quantity ?? 0));
  return {
    quantityAdded,
    items: existing
      ? items.map((item) => item.key === key
        ? { ...item, name: input.name, price: input.price, quantity: item.quantity + quantityAdded }
        : item)
      : [...items, { ...input, key, quantity }],
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      appliedActionIds: [],
      addItem: (input) => {
        if (!Number.isFinite(input.quantity ?? 1)) return;
        set((state) => ({ items: addToItems(state.items, input).items }));
      },
      applyAgentAction: (input) => {
        const parsed = agentUIActionSchema.safeParse(input);
        if (!parsed.success) return { status: "invalid", quantityAdded: 0 };
        const action = parsed.data;
        let receipt: CartActionReceipt = { status: "duplicate", quantityAdded: 0 };
        set((state) => {
          if (state.appliedActionIds.includes(action.id)) return state;
          const { product, quantity } = action.payload;
          const result = addToItems(state.items, {
            productId: product.id, name: product.name, price: product.price, quantity,
          });
          receipt = { status: "applied", quantityAdded: result.quantityAdded };
          // Persist both mutation and receipt together, including a cart at its limit.
          return { items: result.items, appliedActionIds: [...state.appliedActionIds, action.id] };
        });
        return receipt;
      },
      setQuantity: (key, quantity) => {
        if (!Number.isFinite(quantity)) return;
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((item) => item.key !== key)
              : state.items.map((item) =>
                  item.key === key ? { ...item, quantity: Math.max(1, Math.min(20, Math.trunc(quantity))) } : item,
                ),
        }));
      },
      removeItem: (key) => set((state) => ({ items: state.items.filter((item) => item.key !== key) })),
      // Clearing the cart must not make a confirmed action executable again.
      clear: () => set({ items: [] }),
    }),
    {
      name: "kedai-tehyan-cart", version: 1, skipHydration: true,
      partialize: ({ items, appliedActionIds }) => ({ items, appliedActionIds }),
    },
  ),
);
