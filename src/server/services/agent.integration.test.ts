import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runTool } from "@/agents/tools";
import { db } from "@/server/db/client";
import { listProducts } from "./catalog";
import { getPublicOrderStatus } from "./orders";
import { getOutletById, listActiveOutlets } from "./outlets";

describe.skipIf(!process.env.DATABASE_URL)("agent domain queries (PostgreSQL)", () => {
  const suffix = randomUUID();
  const categoryId = `agent-category-${suffix}`;
  const productIds = ["under", "equal", "unavailable"].map((name) => `agent-${name}-${suffix}`);
  const storeIds = ["active", "inactive"].map((name) => `agent-outlet-${name}-${suffix}`);
  const orderId = `agent-order-${suffix}`;
  const orderCode = `THY-${suffix.replaceAll("-", "").slice(0, 20).toUpperCase()}`;
  const city = `Test ${suffix}`;

  beforeAll(async () => {
    await db.$transaction(async (tx) => {
      await tx.category.create({ data: { id: categoryId, name: "Agent fixture", slug: `agent-fixture-${suffix}` } });
      await tx.product.createMany({ data: productIds.map((id, index) => ({
        id, slug: id, name: `Agent fixture ${suffix} ${index}`, description: "Temporary automated test fixture",
        price: index === 0 ? 19999 : index === 1 ? 20000 : 10000,
        available: index !== 2, sweetness: index, categoryId,
      })) });
      await tx.store.createMany({ data: storeIds.map((id, index) => ({
        id, slug: id, name: `Agent fixture ${suffix}`, city,
        address: "Temporary automated test fixture", phone: "", active: index === 0,
      })) });
      await tx.order.create({ data: {
        id: orderId, code: orderCode, customerName: "Private fixture customer", phone: "PRIVATE-PHONE",
        address: "Private fixture address", notes: "Private fixture notes", type: "DELIVERY", status: "PREPARING",
        subtotal: 19999, total: 19999,
      } });
    });
  });

  afterAll(async () => {
    // Only UUID-scoped rows created by this test; preserve all business records.
    await db.$transaction([
      db.order.deleteMany({ where: { id: orderId } }),
      db.product.deleteMany({ where: { id: { in: productIds } } }),
      db.category.deleteMany({ where: { id: categoryId } }),
      db.store.deleteMany({ where: { id: { in: storeIds } } }),
    ]);
    await db.$disconnect();
  });

  it("distinguishes inclusive budget from strictly-below and excludes unavailable products", async () => {
    const inclusive = await listProducts({ q: suffix, maxPrice: 20000, availableOnly: true, limit: 10 });
    expect(inclusive.map((product) => product.id).sort()).toEqual(productIds.slice(0, 2).sort());
    const strict = await listProducts({ q: suffix, priceBelow: 20000, availableOnly: true, limit: 10 });
    expect(strict.map((product) => product.id)).toEqual([productIds[0]]);
    expect(await listProducts({ q: suffix, maxPrice: 9999, availableOnly: true, limit: 10 })).toEqual([]);
    expect((await listProducts({ q: suffix, availableOnly: true, limit: 1 })).length).toBe(1);
  });

  it("keeps active-only rules for city search and internal ID lookup", async () => {
    expect((await listActiveOutlets({ city, limit: 10 })).map((outlet) => outlet.id)).toEqual([storeIds[0]]);
    expect(await getOutletById(storeIds[1])).toBeNull();
  });

  it("projects minimal public order data from an order containing private fields", async () => {
    expect(await getPublicOrderStatus(orderCode)).toEqual({ code: orderCode, status: "PREPARING" });
    expect(await runTool("checkOrderStatus", JSON.stringify({ code: orderCode }), { userId: null, requestId: suffix }))
      .toEqual({ ok: true, data: { order: { code: orderCode, status: "PREPARING" } } });
    expect(await getPublicOrderStatus(`MISSING-${suffix}`)).toBeNull();
  });

  it("resolves cart actions from real database prices and rejects unavailable menu", async () => {
    const valid = await runTool("addToCart", JSON.stringify({ productId: productIds[0], quantity: 2 }), { userId: null, requestId: suffix });
    expect(valid).toMatchObject({ ok: true, action: { type: "ADD_TO_CART", payload: { product: { id: productIds[0], price: 19999 }, quantity: 2 } } });
    const unavailable = await runTool("addToCart", JSON.stringify({ productId: productIds[2] }), { userId: null, requestId: suffix });
    expect(unavailable.ok).toBe(false);
    expect(unavailable.action).toBeUndefined();
  });
});
