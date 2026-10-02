import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { getOutletBySlug, listActiveOutlets, listFeaturedOutlets } from "./outlets";

describe.skipIf(!process.env.DATABASE_URL)("public outlet queries (PostgreSQL)", () => {
  const suffix = randomUUID();
  const activeId = `outlet-test-active-${suffix}`;
  const inactiveId = `outlet-test-inactive-${suffix}`;
  const legacyId = `outlet-test-legacy-${suffix}`;
  const activeSlug = `uji-outlet-${suffix}`;
  const inactiveSlug = `uji-nonaktif-${suffix}`;

  beforeAll(async () => {
    await db.$transaction([
      db.store.create({ data: {
        id: activeId, slug: activeSlug, name: "Uji Outlet Publik", city: "Uji",
        address: "Data pengujian otomatis", phone: "", featured: true,
        hours: { create: [
          { weekday: 6, openMin: 720, closeMin: 1260 },
          { weekday: 1, openMin: 600, closeMin: 1200 },
        ] },
      } }),
      db.store.create({ data: {
        id: inactiveId, slug: inactiveSlug, name: "Uji Outlet Nonaktif", city: "Uji",
        address: "Data pengujian otomatis", phone: "", active: false, featured: true,
      } }),
      db.store.create({ data: {
        id: legacyId, name: "Uji Outlet Tanpa Slug", city: "Uji",
        address: "Data pengujian otomatis", phone: "",
      } }),
    ]);
  });

  afterAll(async () => {
    // Delete only this test run's generated rows; StoreHour uses the existing cascade relation.
    await db.store.deleteMany({ where: { id: { in: [activeId, inactiveId, legacyId] } } });
    await db.$disconnect();
  });

  it("lists active outlets while retaining legacy rows without slugs", async () => {
    const ids = (await listActiveOutlets()).map((outlet) => outlet.id);
    expect(ids).toContain(activeId);
    expect(ids).toContain(legacyId);
    expect(ids).not.toContain(inactiveId);
  });

  it("excludes inactive and unfeatured outlets from the homepage selection", async () => {
    const ids = (await listFeaturedOutlets(100)).map((outlet) => outlet.id);
    expect(ids).toContain(activeId);
    expect(ids).not.toContain(inactiveId);
    expect(ids).not.toContain(legacyId);
    expect((await listFeaturedOutlets(1)).length).toBeLessThanOrEqual(1);
  });

  it("retrieves ordered public hours without internal timestamps or flags", async () => {
    const outlet = await getOutletBySlug(activeSlug);
    expect(outlet?.id).toBe(activeId);
    expect(outlet?.hours.map((hour) => hour.weekday)).toEqual([1, 6]);
    expect(outlet).not.toHaveProperty("createdAt");
    expect(outlet).not.toHaveProperty("active");
    expect(outlet?.hours[0]).not.toHaveProperty("storeId");
  });

  it("does not expose inactive, missing, or invalid detail slugs", async () => {
    expect(await getOutletBySlug(inactiveSlug)).toBeNull();
    expect(await getOutletBySlug(`tidak-ada-${suffix}`)).toBeNull();
    expect(await getOutletBySlug("../admin")).toBeNull();
  });
});
