import { beforeEach, describe, expect, it, vi } from "vitest";
import { runTool, toolDefs } from "./tools";

const mocks = vi.hoisted(() => ({
  product: { findMany: vi.fn(), findUnique: vi.fn() },
  promotion: { findMany: vi.fn() },
  store: { findMany: vi.fn(), findFirst: vi.fn() },
  order: { findUnique: vi.fn() },
  faq: { findMany: vi.fn() },
}));
vi.mock("@/server/db/client", () => ({ db: mocks }));

const context = { userId: null, requestId: "730911cc-08da-43dd-90cd-ff8c489b28b5" };
const product = {
  id: "real-product", slug: "teh-lemon", name: "Teh Lemon", price: 18000,
  description: "Lemon segar, cocok diminum dingin.", sweetness: 1,
  isBestSeller: true, available: true, imageUrl: null, categoryId: "category",
  category: { id: "category", slug: "teh-buah", name: "Teh Buah", sort: 3 },
};
const call = (name: string, args: unknown) => runTool(name, JSON.stringify(args), context);

beforeEach(() => {
  vi.resetAllMocks();
  mocks.product.findMany.mockResolvedValue([product]);
  mocks.product.findUnique.mockResolvedValue(product);
  mocks.promotion.findMany.mockResolvedValue([]);
  mocks.store.findMany.mockResolvedValue([]);
  mocks.store.findFirst.mockResolvedValue(null);
  mocks.order.findUnique.mockResolvedValue(null);
  mocks.faq.findMany.mockResolvedValue([]);
});

describe("validated product tools", () => {
  it("pushes budget, availability, category and limits into the shared database query", async () => {
    const output = await call("searchProducts", { query: "lemon", minPrice: 10000, maxPrice: 20000, priceBelow: 20000, category: "teh-buah", limit: 3 });
    expect(mocks.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 3,
      where: expect.objectContaining({
        available: true, price: { gte: 10000, lte: 20000, lt: 20000 },
        category: { slug: { equals: "teh-buah", not: undefined } },
        OR: expect.arrayContaining([{ name: { contains: "lemon", mode: "insensitive" } }]),
      }),
    }));
    expect(output).toMatchObject({ ok: true, data: { products: [{ id: product.id, price: 18000, slug: "teh-lemon", category: "Teh Buah" }] } });
    expect(JSON.stringify(output)).not.toContain("categoryId");
  });

  it.each([
    { limit: 0 }, { limit: 11 }, { query: " " }, { maxPrice: -1 }, { maxPrice: 1.5 },
    { minPrice: 20000, maxPrice: 10000 }, { minPrice: 20000, priceBelow: 20000 },
    { category: "kopi", excludedCategory: "kopi" }, { sql: "DROP TABLE Product" },
    { sweetness: "invented" }, null, [],
  ])("rejects invalid search arguments without querying (%j)", async (args) => {
    expect(await call("searchProducts", args)).toMatchObject({ ok: false, data: { error: { code: "INVALID_ARGUMENTS" } } });
    expect(mocks.product.findMany).not.toHaveBeenCalled();
  });

  it("uses supported sweetness and exclusion filters, never invented temperature fields", async () => {
    await call("recommendProducts", { maxSweetness: 0, excludedCategory: "kopi", bestSellerOnly: true });
    expect(mocks.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3, where: expect.objectContaining({
      sweetness: { lte: 0 }, category: { slug: { equals: undefined, not: "kopi" } }, isBestSeller: true, available: true,
    }) }));
    expect(await call("recommendProducts", { temperature: "cold" })).toMatchObject({ ok: false });
    expect(await call("recommendProducts", { availableOnly: false })).toMatchObject({ ok: false });
  });

  it("returns authoritative empty search results", async () => {
    mocks.product.findMany.mockResolvedValue([]);
    expect(await call("searchProducts", { query: "Matcha Strawberry" })).toEqual({ ok: true, data: { products: [] } });
  });

  it("requires exactly one detail identifier and distinguishes a missing product", async () => {
    expect(await call("getProductDetail", {})).toMatchObject({ ok: false });
    expect(await call("getProductDetail", { productId: "one", slug: "one" })).toMatchObject({ ok: false });
    expect(mocks.product.findUnique).not.toHaveBeenCalled();
    await call("getProductDetail", { slug: "teh-lemon" });
    expect(mocks.product.findUnique).toHaveBeenCalledWith({ where: { slug: "teh-lemon" }, include: { category: true } });
    mocks.product.findUnique.mockResolvedValue(null);
    expect(await call("getProductDetail", { productId: "missing" })).toMatchObject({ ok: false, data: { error: { code: "NOT_FOUND" } } });
  });
});

describe("cart actions", () => {
  it("resolves the product again and prepares a typed UI action using the database price", async () => {
    const output = await call("addToCart", { productId: product.id, quantity: 2 });
    expect(output).toMatchObject({ ok: true, data: { status: "ACTION_PREPARED" }, action: {
      type: "ADD_TO_CART", payload: { product: { id: product.id, name: product.name, price: 18000 }, quantity: 2 },
    } });
  });

  it.each([{ productId: "real-product", price: 1 }, { productId: "real-product", quantity: 21 }, { productId: "real-product", quantity: 0 }, { productId: "real-product", options: { free: "yes" } }])("rejects client/model authority over price or unsupported data (%j)", async (args) => {
    expect(await call("addToCart", args)).toMatchObject({ ok: false });
    expect(mocks.product.findUnique).not.toHaveBeenCalled();
  });

  it.each([null, { ...product, available: false }])("never returns a cart action for missing or unavailable products", async (record) => {
    mocks.product.findUnique.mockResolvedValue(record);
    const output = await call("addToCart", { productId: "real-product" });
    expect(output).toMatchObject({ ok: false, data: { error: { code: "UNAVAILABLE" } } });
    expect(output.action).toBeUndefined();
  });
});

describe("support tools and privacy", () => {
  it("filters active/unexpired promotions but preserves unverified text conditions", async () => {
    mocks.promotion.findMany.mockResolvedValue([{ title: "Promo", detail: "Senin–Kamis, selama stok ada.", endsAt: null }]);
    const output = await call("getActivePromotions", {});
    expect(mocks.promotion.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { active: true, OR: [{ endsAt: null }, { endsAt: { gt: expect.any(Date) } }] }, take: 5,
    }));
    expect(output).toMatchObject({ ok: true, data: { promotions: [{ terms: "Senin–Kamis, selama stok ada.", eligibility: "UNVERIFIED" }] } });
  });

  it("filters outlet searches in PostgreSQL and refuses inactive detail results", async () => {
    expect(await call("listOutlets", { city: "Depok", query: "Margonda", limit: 2 })).toEqual({ ok: true, data: { outlets: [] } });
    expect(mocks.store.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 2, where: expect.objectContaining({ active: true, city: { contains: "Depok", mode: "insensitive" } }) }));
    expect(await call("getOutletDetail", { slug: "inactive" })).toMatchObject({ ok: false });
    expect(mocks.store.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: "inactive", active: true } }));
  });

  it("does not present an absent schedule as seven closed days", async () => {
    mocks.store.findFirst.mockResolvedValue({
      id: "no-hours", slug: "no-hours", name: "Outlet Demo", city: "Depok", address: "Demo",
      phone: "", description: "Data demo", facilities: [], hours: [],
    });
    expect(await call("getOutletDetail", { slug: "no-hours" })).toMatchObject({
      ok: true, data: { outlet: { weeklyHours: [], current: { open: null } } },
    });
  });

  it("queries and projects only public order code/status, even if a future service returns additional data", async () => {
    mocks.order.findUnique.mockResolvedValue({ code: "THY-1234", status: "PREPARING", customerName: "Private", phone: "secret", total: 18000 });
    expect(await call("checkOrderStatus", { code: "thy-1234" })).toEqual({ ok: true, data: { order: { code: "THY-1234", status: "PREPARING" } } });
    expect(mocks.order.findUnique).toHaveBeenCalledWith({ where: { code: "THY-1234" }, select: { code: true, status: true } });
  });

  it("returns one generic missing-order message and rejects extra customer fields", async () => {
    expect(await call("checkOrderStatus", { code: "THY-0000" })).toMatchObject({ ok: false, data: { error: { code: "NOT_FOUND" } } });
    expect(await call("checkOrderStatus", { code: "THY-0000", userId: "other-user" })).toMatchObject({ ok: false, data: { error: { code: "INVALID_ARGUMENTS" } } });
  });

  it("bounds FAQ search and avoids full-table queries for short empty tokens", async () => {
    expect(await call("searchKnowledge", { query: "di ke" })).toEqual({ ok: true, data: { answers: [] } });
    expect(mocks.faq.findMany).not.toHaveBeenCalled();
    await call("searchKnowledge", { query: "refund delivery", limit: 2 });
    expect(mocks.faq.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 2, select: { question: true, answer: true, topic: true } }));
  });
});

describe("tool dispatcher", () => {
  it.each(["constructor", "__proto__", "deleteDatabase"])("ignores unregistered tool %s", async (name) => {
    expect(await call(name, {})).toMatchObject({ ok: false, data: { error: { code: "UNKNOWN_TOOL" } } });
  });

  it("distinguishes malformed JSON and backend failures without exposing internals", async () => {
    expect(await runTool("searchProducts", "{broken", context)).toMatchObject({ ok: false, data: { error: { code: "INVALID_ARGUMENTS" } } });
    expect(await runTool("searchProducts", " ".repeat(8001), context)).toMatchObject({ ok: false });
    mocks.product.findMany.mockRejectedValue(new Error("postgres://secret@private-host"));
    const output = await call("searchProducts", {});
    expect(output).toMatchObject({ ok: false, data: { error: { code: "SERVICE_UNAVAILABLE" } } });
    expect(JSON.stringify(output)).not.toContain("private-host");
  });

  it("advertises an explicit bounded JSON schema for every registered tool", () => {
    expect(toolDefs).toHaveLength(9);
    for (const tool of toolDefs) expect(tool.function.parameters).toMatchObject({ type: "object", additionalProperties: false });
    const search = toolDefs.find((tool) => tool.function.name === "searchProducts")!;
    expect(search.function.parameters).toMatchObject({ properties: { availableOnly: { type: "boolean" }, limit: { maximum: 10 } } });
  });
});
