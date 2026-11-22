import { z } from "zod";
import { boundedArray } from "./bounded-array";

export const checkoutItemSchema = z.object({
  productId: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(20),
});

export const createOrderSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(80),

  phone: z
    .string()
    .trim()
    .min(8, "Nomor telepon terlalu pendek.")
    .max(20),

  type: z.enum(["PICKUP", "DELIVERY"]),

  address: z
    .string()
    .trim()
    .max(300)
    .optional()
    .nullable(),

  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable(),

  items: boundedArray(checkoutItemSchema, 50).refine(items => items.length > 0, "Keranjang kosong."),
}).superRefine((data, ctx) => {
  if (data.type === "DELIVERY") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["type"],
      message:
        "Delivery belum tersedia sampai aturan ongkir Kedai Tehyan dikonfigurasi.",
    });
  }
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const createdOrderSchema = z.object({
  code: z.string(),
  status: z.string(),
  subtotal: z.number().int(),
  discount: z.number().int(),
  fee: z.number().int(),
  total: z.number().int(),
});

export type CreatedOrder = z.infer<typeof createdOrderSchema>;
