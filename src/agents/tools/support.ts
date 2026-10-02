import { z } from "zod";
import { getPromotions } from "@/server/services/catalog";
import { searchKnowledge } from "@/server/services/knowledge";
import { getPublicOrderStatus } from "@/server/services/orders";
import { defineTool, failure, objectJson, textJson } from "./shared";

export const supportTools = [
  defineTool({
    name: "getActivePromotions",
    description: "Daftar promo berflag aktif dan belum kedaluwarsa. Kelayakan syarat teks (hari, stok, minimum pembelian) BELUM diverifikasi. Wajib sampaikan terms dan eligibility UNVERIFIED; jangan menjanjikan promo berlaku hari ini atau menghitung diskon.",
    schema: z.object({ limit: z.number().int().min(1).max(5).default(5) }).strict(),
    parameters: objectJson({ limit: { type: "integer", minimum: 1, maximum: 5, default: 5 } }),
    async run(input) {
      const now = new Date();
      const promotions = await getPromotions(now, input.limit);
      return { ok: true, data: {
        checkedAt: now.toISOString(),
        promotions: promotions.map((promotion) => ({
          title: promotion.title, terms: promotion.detail, endsAt: promotion.endsAt?.toISOString() ?? null,
          eligibility: "UNVERIFIED",
        })),
        notice: "Daftar belum memastikan promo berlaku untuk hari atau pesanan ini. Sampaikan semua syarat yang tersimpan dan konfirmasi ke kedai.",
      } };
    },
  }),
  defineTool({
    name: "checkOrderStatus",
    description: "Cek status publik terbatas dari kode pesanan yang diberikan pelanggan. Hanya kode dan status; tidak tersedia identitas, item, alamat, atau total. Jangan menebak atau mencoba kode lain.",
    schema: z.object({ code: z.string().trim().toUpperCase().min(4).max(40).regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/) }).strict(),
    parameters: objectJson({ code: { type: "string", minLength: 4, maxLength: 40, pattern: "^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$" } }, ["code"]),
    async run(input) {
      const order = await getPublicOrderStatus(input.code);
      return order ? { ok: true, data: { order: { code: order.code, status: order.status } } } : failure("NOT_FOUND", "Status pesanan tidak ditemukan. Periksa kode atau hubungi kedai.");
    },
  }),
  defineTool({
    name: "searchKnowledge",
    description: "Cari FAQ/kebijakan yang tersimpan. Jangan menganggap fitur dalam FAQ pasti sudah tersedia di aplikasi; informasi yang tidak ditemukan harus diakui belum tersedia.",
    schema: z.object({ query: z.string().trim().min(1).max(120), limit: z.number().int().min(1).max(5).default(3) }).strict(),
    parameters: objectJson({ query: textJson(120), limit: { type: "integer", minimum: 1, maximum: 5, default: 3 } }, ["query"]),
    async run(input) {
      return { ok: true, data: { answers: await searchKnowledge(input.query, input.limit) } };
    },
  }),
];
