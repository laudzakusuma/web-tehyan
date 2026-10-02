import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import type {
  PromotionInput,
} from "@/lib/promotion-contract";

import {
  promotionEndsAt,
} from "@/lib/promotion-contract";

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

export type PromotionServiceErrorCode =
  | "PROMOTION_NOT_FOUND"
  | "PROMOTION_DELETE_ACTIVE";

export class PromotionServiceError extends Error {
  constructor(
    public readonly code:
      PromotionServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name =
      "PromotionServiceError";
  }
}

export const listAdminPromotions =
  () =>
    db.promotion.findMany({
      orderBy: [
        {
          active: "desc",
        },
        {
          endsAt: "asc",
        },
        {
          title: "asc",
        },
      ],

      select: {
        id: true,
        title: true,
        detail: true,
        active: true,
        endsAt: true,
      },
    });

export async function createPromotion(
  input: PromotionInput,
) {
  return db.promotion.create({
    data: {
      title: input.title.trim(),
      detail:
        input.detail.trim(),
      active: input.active,
      endsAt:
        promotionEndsAt(
          input.endsOn,
        ),
    },

    select: {
      id: true,
      title: true,
      detail: true,
      active: true,
      endsAt: true,
    },
  });
}

export async function updatePromotion(
  id: string,
  input: PromotionInput,
) {
  const result =
    await db.promotion.updateMany({
      where: {
        id,
      },

      data: {
        title: input.title.trim(),
        detail:
          input.detail.trim(),
        active: input.active,
        endsAt:
          promotionEndsAt(
            input.endsOn,
          ),
      },
    });

  if (result.count !== 1) {
    throw new PromotionServiceError(
      "PROMOTION_NOT_FOUND",
      "Promo tidak ditemukan.",
    );
  }

  return db.promotion.findUniqueOrThrow({
    where: {
      id,
    },

    select: {
      id: true,
      title: true,
      detail: true,
      active: true,
      endsAt: true,
    },
  });
}

export async function deletePromotion(
  id: string,
) {
  const promotion =
    await db.promotion.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        active: true,
      },
    });

  if (!promotion) {
    throw new PromotionServiceError(
      "PROMOTION_NOT_FOUND",
      "Promo tidak ditemukan.",
    );
  }

  /*
   * Promo aktif tidak boleh langsung
   * dihapus. Nonaktifkan dahulu agar
   * salah klik admin tidak langsung
   * menghapus konten publik.
   */
  if (promotion.active) {
    throw new PromotionServiceError(
      "PROMOTION_DELETE_ACTIVE",
      "Promo aktif harus dinonaktifkan sebelum dihapus.",
    );
  }

  await db.promotion.delete({
    where: {
      id,
    },
  });

  return {
    id,
  };
}