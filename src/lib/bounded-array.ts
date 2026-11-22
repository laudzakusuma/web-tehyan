import { z } from "zod";

/** Reject the length before Zod iterates or allocates an issue for each element. */
export function boundedArray<T extends z.ZodTypeAny>(item: T, max: number) {
  return z.custom<unknown[]>(value => Array.isArray(value) && value.length <= max, {
    message: `Daftar harus berisi maksimal ${max} item.`,
  }).pipe(z.array(item));
}
