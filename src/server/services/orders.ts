import { db } from "@/server/db/client";

/** Pelanggan hanya boleh melihat pesanannya sendiri; kepemilikan dicek di service, bukan di UI. */
export const getOrderForUser = (code: string, userId: string) =>
  db.order.findFirst({
    where: { code, userId },
    select: { code: true, status: true, total: true, history: { orderBy: { createdAt: "asc" }, select: { status: true, createdAt: true } } },
  });

/** Anonymous tracking exposes only the same minimal fulfillment status for a known code. */
export const getPublicOrderStatus = (code: string) => db.order.findUnique({
  where: { code },
  select: { code: true, status: true },
});
