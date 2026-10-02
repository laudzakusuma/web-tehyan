import { z } from "zod";

const DATE_ONLY =
  /^\d{4}-\d{2}-\d{2}$/;

function validDateOnly(
  value: string,
) {
  if (!DATE_ONLY.test(value)) {
    return false;
  }

  const [year, month, day] =
    value
      .split("-")
      .map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  );

  return (
    date.getUTCFullYear() ===
      year &&
    date.getUTCMonth() ===
      month - 1 &&
    date.getUTCDate() ===
      day
  );
}

const endsOnSchema = z.union([
  z
    .string()
    .refine(
      validDateOnly,
      "Tanggal berakhir tidak valid.",
    ),
  z.null(),
]);

export const promotionInputSchema =
  z
    .object({
      title: z
        .string()
        .trim()
        .min(
          3,
          "Judul terlalu pendek.",
        )
        .max(
          120,
          "Judul terlalu panjang.",
        ),

      detail: z
        .string()
        .trim()
        .min(
          3,
          "Detail promo terlalu pendek.",
        )
        .max(
          500,
          "Detail promo terlalu panjang.",
        ),

      active: z.boolean(),

      endsOn: endsOnSchema,
    })
    .strict();

export type PromotionInput =
  z.infer<
    typeof promotionInputSchema
  >;

/*
 * Promo berlaku sampai akhir hari
 * dalam waktu Jakarta.
 */
export function promotionEndsAt(
  endsOn: string | null,
) {
  if (!endsOn) {
    return null;
  }

  return new Date(
    `${endsOn}T23:59:59.999+07:00`,
  );
}