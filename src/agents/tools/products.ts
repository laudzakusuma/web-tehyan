import { z } from "zod";
import { agentUIActionSchema } from "@/lib/chat-contract";
import { getProduct, getProductBySlug, listProducts } from "@/server/services/catalog";
import { defineTool, failure, idJson, idSchema, objectJson, slugJson, slugSchema, textJson } from "./shared";

const price = z.number().int().min(0).max(100_000_000);
const filters = {
  query: z.string().trim().min(1).max(100).optional(),
  category: slugSchema.optional(),
  excludedCategory: slugSchema.optional(),
  minPrice: price.optional(),
  maxPrice: price.optional(),
  priceBelow: price.positive().optional(),
  maxSweetness: z.number().int().min(0).max(3).optional(),
  bestSellerOnly: z.boolean().default(false),
  availableOnly: z.boolean().default(true),
  limit: z.number().int().min(1).max(10).default(5),
};
const priceJson = { type: "integer", minimum: 0, maximum: 100_000_000 };
const filterJson = {
  query: textJson(100), category: slugJson, excludedCategory: slugJson,
  minPrice: priceJson, maxPrice: priceJson,
  priceBelow: { ...priceJson, minimum: 1, description: "Harga harus kurang dari nilai ini, bukan sama dengan." },
  maxSweetness: { type: "integer", minimum: 0, maximum: 3 },
  bestSellerOnly: { type: "boolean", default: false },
  availableOnly: { type: "boolean", default: true },
  limit: { type: "integer", minimum: 1, maximum: 10, default: 5 },
};
const searchSchema = z.object(filters).strict().refine((input) =>
  (input.minPrice === undefined || input.maxPrice === undefined || input.minPrice <= input.maxPrice) &&
  (input.minPrice === undefined || input.priceBelow === undefined || input.minPrice < input.priceBelow) &&
  (!input.category || input.category !== input.excludedCategory),
{ message: "Filter saling bertentangan." });

const productData = (product: NonNullable<Awaited<ReturnType<typeof getProduct>>>) => ({
  id: product.id, slug: product.slug, name: product.name, price: product.price,
  description: product.description.slice(0, 1000), category: product.category.name,
  categorySlug: product.category.slug, sweetness: product.sweetness,
  isBestSeller: product.isBestSeller, available: product.available,
});

async function search(input: z.infer<typeof searchSchema>) {
  const products = await listProducts({
    q: input.query, category: input.category, excludedCategory: input.excludedCategory,
    minPrice: input.minPrice, maxPrice: input.maxPrice, priceBelow: input.priceBelow,
    maxSweetness: input.maxSweetness, bestSellerOnly: input.bestSellerOnly,
    availableOnly: input.availableOnly, limit: input.limit,
  });
  return { ok: true, data: { products: products.map(productData) } };
}

export const productTools = [
  defineTool({
    name: "searchProducts",
    description: "Cari menu nyata. Harga Rupiah: maxPrice inklusif; gunakan priceBelow untuk 'di bawah'. Kategori memakai slug (teh, teh-susu, teh-buah, kopi, camilan). Rasa/suhu hanya boleh merujuk deskripsi; tidak ada kolom suhu.",
    schema: searchSchema, parameters: objectJson(filterJson), run: search,
  }),
  defineTool({
    name: "getProductDetail",
    description: "Ambil informasi menu dari ID atau slug yang ditemukan melalui pencarian. Pilih tepat satu pengenal. Jangan mengarang komposisi yang tidak tertulis.",
    schema: z.object({ productId: idSchema.optional(), slug: slugSchema.optional() }).strict()
      .refine((input) => Number(!!input.productId) + Number(!!input.slug) === 1),
    parameters: { ...objectJson({ productId: idJson, slug: slugJson }), oneOf: [{ required: ["productId"] }, { required: ["slug"] }] },
    async run(input) {
      const product = input.productId ? await getProduct(input.productId) : await getProductBySlug(input.slug!);
      return product ? { ok: true, data: { product: productData(product) } } : failure("NOT_FOUND", "Menu tidak ditemukan.");
    },
  }),
  defineTool({
    name: "recommendProducts",
    description: "Rekomendasi deterministik berdasarkan budget, kategori, pengecualian kategori, bestseller, dan sweetness 0–3. Selalu hanya menu tersedia. Untuk 'segar/dingin', cari kata pada deskripsi lalu jelaskan keterbatasan data.",
    schema: z.object({ ...filters, availableOnly: z.literal(true).default(true), limit: z.number().int().min(1).max(5).default(3) }).strict()
      .refine((input) => searchSchema.safeParse(input).success),
    parameters: objectJson({ ...filterJson, availableOnly: { type: "boolean", enum: [true], default: true }, limit: { type: "integer", minimum: 1, maximum: 5, default: 3 } }),
    run: search,
  }),
  defineTool({
    name: "addToCart",
    description: "Siapkan aksi keranjang hanya saat pelanggan meminta penambahan. Gunakan ID hasil pencarian/detail; harga dan ketersediaan diperiksa lagi. Browser akan menerapkan aksi, ini belum membuat pesanan atau pembayaran.",
    schema: z.object({ productId: idSchema, quantity: z.number().int().min(1).max(20).default(1) }).strict(),
    parameters: objectJson({ productId: idJson, quantity: { type: "integer", minimum: 1, maximum: 20, default: 1 } }, ["productId"]),
    async run(input, context) {
      const product = await getProduct(input.productId);
      if (!product || !product.available) return failure("UNAVAILABLE", "Menu tidak tersedia untuk ditambahkan.");
      const action = agentUIActionSchema.parse({
        id: `${context.requestId}:cart`, type: "ADD_TO_CART",
        payload: {
          product: { id: product.id, slug: product.slug, name: product.name, price: product.price, imageUrl: product.imageUrl },
          quantity: input.quantity,
        },
      });
      return { ok: true, data: { status: "ACTION_PREPARED", product: productData(product), quantity: input.quantity }, action };
    },
  }),
];
