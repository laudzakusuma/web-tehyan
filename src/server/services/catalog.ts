import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";

export type ProductFilters = {
  category?: string;
  excludedCategory?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  priceBelow?: number;
  maxSweetness?: number;
  bestSellerOnly?: boolean;
  availableOnly?: boolean;
  limit?: number;
};

export function productWhere(opts: ProductFilters): Prisma.ProductWhereInput {
  return {
    category: opts.category || opts.excludedCategory ? {
      slug: { equals: opts.category, not: opts.excludedCategory },
    } : undefined,
    OR: opts.q ? [
      { name: { contains: opts.q, mode: "insensitive" } },
      { description: { contains: opts.q, mode: "insensitive" } },
    ] : undefined,
    price: { gte: opts.minPrice, lte: opts.maxPrice, lt: opts.priceBelow },
    sweetness: opts.maxSweetness === undefined ? undefined : { lte: opts.maxSweetness },
    isBestSeller: opts.bestSellerOnly ? true : undefined,
    available: opts.availableOnly ? true : undefined,
  };
}

export const listProducts = (opts: ProductFilters = {}) =>
  db.product.findMany({
    where: productWhere(opts),
    include: { category: true },
    orderBy: [{ category: { sort: "asc" } }, { name: "asc" }],
    take: opts.limit === undefined ? undefined : Math.max(1, Math.min(10, opts.limit)),
  });

// Hero and FeaturedMenu share the same query within a server render.
export const listFeaturedProducts = cache(async (limit = 4) =>
  db.product.findMany({
    where: {
      available: true,
      isBestSeller: true,
    },
    include: {
      category: true,
    },
    orderBy: {
      name: "asc",
    },
    take: limit,
  }));

export const listCategories = () => db.category.findMany({ orderBy: { sort: "asc" } });
export const getProduct = (id: string) => db.product.findUnique({ where: { id }, include: { category: true } });
export const getProductBySlug = cache(async (slug: string) => db.product.findUnique({ where: { slug }, include: { category: true } }));
// Date/flag validity is machine-readable; eligibility conditions in detail are not.
export const getPromotions = (now = new Date(), limit = 5) => db.promotion.findMany({
  where: { active: true, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
  select: { title: true, detail: true, endsAt: true },
  orderBy: [{ endsAt: "asc" }, { id: "asc" }],
  take: Math.max(1, Math.min(10, limit)),
});
export const rupiah = (n: number) => "Rp" + n.toLocaleString("id-ID");
