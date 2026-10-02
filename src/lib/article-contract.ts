import { z } from "zod";

export const articleInputSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(3, "Slug terlalu pendek.")
      .max(100, "Slug terlalu panjang.")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug hanya boleh berisi huruf kecil, angka, dan tanda -.",
      ),

    title: z
      .string()
      .trim()
      .min(3, "Judul terlalu pendek.")
      .max(160, "Judul terlalu panjang."),

    excerpt: z
      .string()
      .trim()
      .min(10, "Ringkasan terlalu pendek.")
      .max(300, "Ringkasan terlalu panjang."),

    content: z
      .string()
      .trim()
      .min(20, "Isi artikel terlalu pendek.")
      .max(20_000, "Isi artikel terlalu panjang."),

    coverImageUrl: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .optional(),

    status: z.enum([
      "DRAFT",
      "PUBLISHED",
    ]),
  })
  .strict();

export type ArticleInput =
  z.infer<
    typeof articleInputSchema
  >;