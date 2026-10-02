import { z } from "zod";
import { getWeeklyHours } from "@/lib/outlets";
import { getOutletById, getOutletBySlug, listActiveOutlets, type PublicOutlet } from "@/server/services/outlets";
import { outletOpenStatus } from "@/server/services/store";
import { defineTool, failure, idJson, idSchema, objectJson, slugJson, slugSchema, textJson } from "./shared";

const outletData = (outlet: PublicOutlet) => ({
  id: outlet.id, slug: outlet.slug, name: outlet.name, city: outlet.city,
  address: outlet.address, phone: outlet.phone || null,
  description: outlet.description, facilities: outlet.facilities,
  timeZone: "Asia/Jakarta", weeklyHours: outlet.hours.length ? getWeeklyHours(outlet.hours) : [],
  current: outletOpenStatus(outlet.hours),
});

export const outletTools = [
  defineTool({
    name: "listOutlets",
    description: "Cari outlet aktif berdasarkan kota atau nama/alamat. Semua jam memakai WIB. Pertahankan penanda Demo dari data. Tidak ada perhitungan outlet terdekat.",
    schema: z.object({
      city: z.string().trim().min(1).max(80).optional(),
      query: z.string().trim().min(1).max(100).optional(),
      limit: z.number().int().min(1).max(10).default(5),
    }).strict(),
    parameters: objectJson({ city: textJson(80), query: textJson(100), limit: { type: "integer", minimum: 1, maximum: 10, default: 5 } }),
    async run(input) {
      return { ok: true, data: { outlets: (await listActiveOutlets(input)).map(outletData) } };
    },
  }),
  defineTool({
    name: "getOutletDetail",
    description: "Ambil alamat, kontak, fasilitas dan jam outlet aktif. Pilih tepat satu ID atau slug dari pencarian. Jadwal kosong berarti informasi belum tersedia.",
    schema: z.object({ outletId: idSchema.optional(), slug: slugSchema.optional() }).strict()
      .refine((input) => Number(!!input.outletId) + Number(!!input.slug) === 1),
    parameters: { ...objectJson({ outletId: idJson, slug: slugJson }), oneOf: [{ required: ["outletId"] }, { required: ["slug"] }] },
    async run(input) {
      const outlet = input.outletId ? await getOutletById(input.outletId) : await getOutletBySlug(input.slug!);
      return outlet ? { ok: true, data: { outlet: outletData(outlet) } } : failure("NOT_FOUND", "Outlet tidak ditemukan.");
    },
  }),
];
