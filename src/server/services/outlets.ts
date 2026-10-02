import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { isOutletSlug } from "@/lib/outlets";
import { db } from "@/server/db/client";

const publicOutletSelect = {
  id: true,
  slug: true,
  name: true,
  city: true,
  address: true,
  phone: true,
  description: true,
  imageUrl: true,
  mapsUrl: true,
  facilities: true,
  hours: {
    select: { weekday: true, openMin: true, closeMin: true },
    orderBy: { weekday: "asc" },
  },
} satisfies Prisma.StoreSelect;

export type PublicOutlet = Prisma.StoreGetPayload<{ select: typeof publicOutletSelect }>;

export type OutletFilters = { city?: string; query?: string; limit?: number };

export const listActiveOutlets = (opts: OutletFilters = {}) => db.store.findMany({
  where: {
    active: true,
    city: opts.city ? { contains: opts.city, mode: "insensitive" } : undefined,
    OR: opts.query ? [
      { name: { contains: opts.query, mode: "insensitive" } },
      { address: { contains: opts.query, mode: "insensitive" } },
    ] : undefined,
  },
  select: publicOutletSelect,
  orderBy: [{ featured: "desc" }, { city: "asc" }, { name: "asc" }, { id: "asc" }],
  take: opts.limit === undefined ? undefined : Math.max(1, Math.min(10, opts.limit)),
});

export const getOutletById = (id: string) => db.store.findFirst({
  where: { id, active: true },
  select: publicOutletSelect,
});

export const listFeaturedOutlets = (limit = 2) => db.store.findMany({
  where: { active: true, featured: true },
  select: publicOutletSelect,
  orderBy: [{ city: "asc" }, { name: "asc" }, { id: "asc" }],
  take: limit,
});

export const getPrimaryOutlet = () => db.store.findFirst({
  where: { active: true },
  select: publicOutletSelect,
  orderBy: [{ featured: "desc" }, { createdAt: "asc" }, { id: "asc" }],
});

// Metadata and the page share one lookup within the same server render.
export const getOutletBySlug = cache(async (slug: string) => {
  if (!isOutletSlug(slug)) return null;
  return db.store.findFirst({
    where: { slug, active: true },
    select: publicOutletSelect,
  });
});
