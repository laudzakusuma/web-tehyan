import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentUIAction } from "@/lib/chat-contract";

const memory = new Map<string, string>();
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: vi.fn((key: string, value: string) => { memory.set(key, value); }),
  removeItem: (key: string) => { memory.delete(key); },
};
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("window", { localStorage: storage });
const { useCartStore } = await import("./store");

const action: AgentUIAction = {
  id: "request:cart:1",
  type: "ADD_TO_CART",
  payload: {
    product: { id: "tea", slug: "teh-lemon", name: "Teh Lemon", price: 18000, imageUrl: null },
    quantity: 2,
  },
};

beforeEach(() => {
  memory.clear();
  useCartStore.setState({ items: [], appliedActionIds: [] });
  storage.setItem.mockClear();
});

describe("confirmed agent cart actions", () => {
  it("stores the cart mutation and deduplication receipt together, then rejects replay", () => {
    expect(useCartStore.getState().applyAgentAction(action)).toEqual({ status: "applied", quantityAdded: 2 });
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(memory.get("kedai-tehyan-cart")!);
    expect(saved.state.items[0].quantity).toBe(2);
    expect(saved.state.appliedActionIds).toEqual([action.id]);
    expect(useCartStore.getState().applyAgentAction(action)).toEqual({ status: "duplicate", quantityAdded: 0 });
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it("keeps replay protection after removing or clearing items", () => {
    useCartStore.getState().applyAgentAction(action);
    useCartStore.getState().clear();
    expect(useCartStore.getState().applyAgentAction(action).status).toBe("duplicate");
    expect(useCartStore.getState().items).toEqual([]);
  });

  it("rehydrates action receipts and does not add an action again after reload", async () => {
    useCartStore.getState().applyAgentAction(action);
    vi.resetModules();
    const { useCartStore: reloaded } = await import("./store");
    await reloaded.persist.rehydrate();
    expect(reloaded.getState().applyAgentAction(action).status).toBe("duplicate");
    expect(reloaded.getState().items[0].quantity).toBe(2);
  });

  it("preserves old cart storage without receipts and refreshes server-resolved product data", async () => {
    storage.setItem("kedai-tehyan-cart", JSON.stringify({ version: 1, state: { items: [
      { key: "tea", productId: "tea", name: "Old name", price: 1000, quantity: 19 },
    ] } }));
    await useCartStore.persist.rehydrate();
    expect(useCartStore.getState().applyAgentAction(action)).toEqual({ status: "applied", quantityAdded: 1 });
    expect(useCartStore.getState().items[0]).toMatchObject({ name: "Teh Lemon", price: 18000, quantity: 20 });
  });

  it("reports a full cart honestly and consumes that action once", () => {
    useCartStore.getState().addItem({ productId: "tea", name: "Teh Lemon", price: 18000, quantity: 20 });
    expect(useCartStore.getState().applyAgentAction(action)).toEqual({ status: "applied", quantityAdded: 0 });
    useCartStore.getState().setQuantity("tea", 1);
    expect(useCartStore.getState().applyAgentAction(action).status).toBe("duplicate");
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it.each([
    null,
    { ...action, type: "EXECUTE_CODE" },
    { ...action, payload: { ...action.payload, quantity: -1 } },
    { ...action, payload: { ...action.payload, quantity: 1.5 } },
    { ...action, payload: { ...action.payload, quantity: 21 } },
    { ...action, payload: { ...action.payload, product: { ...action.payload.product, price: -1 } } },
    { ...action, payload: { ...action.payload, options: { price: "1" } } },
  ])("rejects malformed or unsupported actions at the cart boundary: %j", (invalid) => {
    expect(useCartStore.getState().applyAgentAction(invalid)).toEqual({ status: "invalid", quantityAdded: 0 });
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().appliedActionIds).toEqual([]);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("preserves normal cart addition and option grouping", () => {
    const input = { productId: "tea", name: "Teh Lemon", price: 18000, quantity: 1, options: { sugar: "less" } };
    useCartStore.getState().addItem(input);
    useCartStore.getState().addItem({ ...input, price: 19000 });
    useCartStore.getState().addItem({ ...input, options: { sugar: "normal" } });
    expect(useCartStore.getState().items).toHaveLength(2);
    expect(useCartStore.getState().items[0]).toMatchObject({ price: 19000, quantity: 2 });
    expect(useCartStore.getState().appliedActionIds).toEqual([]);
  });
});
