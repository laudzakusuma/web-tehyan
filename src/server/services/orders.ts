import { randomBytes } from "crypto";
import { FulfillmentType, OrderStatus } from "@prisma/client";

import { db } from "@/server/db/client";
import type { CreateOrderInput } from "@/lib/order-contract";

export type OrderServiceErrorCode =
  | "PRODUCT_NOT_FOUND"
  | "ORDER_NOT_FOUND"
  | "PRODUCT_UNAVAILABLE"
  | "FULFILLMENT_UNAVAILABLE"
  | "INVALID_QUANTITY";

export class OrderServiceError extends Error {
  constructor(
    public readonly code: OrderServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OrderServiceError";
  }
}

function generateOrderCode() {
  const now = new Date();

  const date = [
    now.getFullYear().toString().slice(-2),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  const random = randomBytes(6)
    .toString("hex")
    .toUpperCase();

  return `THY-${date}-${random}`;
}

function normalizeItems(items: CreateOrderInput["items"]) {
  const grouped = new Map<string, number>();

  for (const item of items) {
    grouped.set(
      item.productId,
      (grouped.get(item.productId) ?? 0) + item.quantity,
    );
  }

  return Array.from(grouped, ([productId, quantity]) => {
    if (quantity > 20) {
      throw new OrderServiceError(
        "INVALID_QUANTITY",
        "Jumlah maksimal satu produk adalah 20 item.",
      );
    }

    return {
      productId,
      quantity,
    };
  });
}

export async function createOrder(
  input: CreateOrderInput,
  userId?: string | null,
) {
  if (input.type !== "PICKUP") {
    throw new OrderServiceError(
      "FULFILLMENT_UNAVAILABLE",
      "Delivery belum tersedia sampai aturan ongkir dikonfigurasi.",
    );
  }

  const items = normalizeItems(input.items);

  return db.$transaction(async (tx) => {
    const productIds = items.map(
      (item) => item.productId,
    );

    const products = await tx.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      select: {
        id: true,
        name: true,
        price: true,
        available: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new OrderServiceError(
        "PRODUCT_NOT_FOUND",
        "Ada produk di keranjang yang sudah tidak ditemukan.",
      );
    }

    const productMap = new Map(
      products.map((product) => [
        product.id,
        product,
      ]),
    );

    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId);

      if (product === undefined) {
        throw new OrderServiceError(
          "PRODUCT_NOT_FOUND",
          "Produk tidak ditemukan.",
        );
      }

      if (!product.available) {
        throw new OrderServiceError(
          "PRODUCT_UNAVAILABLE",
          `${product.name} sedang tidak tersedia.`,
        );
      }

      return {
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
      };
    });

    const subtotal = orderItems.reduce(
      (sum, item) =>
        sum + item.unitPrice * item.quantity,
      0,
    );

    // Promo belum diterapkan ke checkout sampai
    // rule engine promonya bersifat deterministik.
    const discount = 0;

    // Pickup tidak memiliki ongkir.
    const fee = 0;

    const total =
      subtotal - discount + fee;

    const code = generateOrderCode();

    const order = await tx.order.create({
      data: {
        code,

        userId: userId ?? null,

        customerName:
          input.customerName.trim(),

        phone:
          input.phone.trim(),

        type: FulfillmentType.PICKUP,

        address: null,

        notes:
          input.notes?.trim() || null,

        status: OrderStatus.PENDING,

        subtotal,
        discount,
        fee,
        total,

        items: {
          create: orderItems,
        },

        history: {
          create: {
            status: OrderStatus.PENDING,
            note: "Pesanan dibuat.",
          },
        },
      },

      select: {
        code: true,
        status: true,
        subtotal: true,
        discount: true,
        fee: true,
        total: true,
      },
    });

    return order;
  });
}

/**
 * Pelanggan terautentikasi hanya boleh melihat pesanannya sendiri.
 * Kepemilikan diperiksa di service, bukan UI.
 */
export const getOrderForUser = (
  code: string,
  userId: string,
) =>
  db.order.findFirst({
    where: {
      code,
      userId,
    },

    select: {
      code: true,
      status: true,
      total: true,

      history: {
        orderBy: {
          createdAt: "asc",
        },

        select: {
          status: true,
          createdAt: true,
        },
      },
    },
  });

/**
 * Anonymous tracking hanya mengekspos status fulfillment minimal
 * untuk kode order yang diketahui.
 */
export const getPublicOrderStatus = (
  code: string,
) =>
  db.order.findUnique({
    where: {
      code,
    },

    select: {
      code: true,
      status: true,
    },
  });

export const getPublicOrderTracking = (
  code: string,
) =>
  db.order.findUnique({
    where: {
      code,
    },

    select: {
      code: true,
      status: true,
      createdAt: true,

      history: {
        orderBy: {
          createdAt: "asc",
        },

        select: {
          status: true,
          createdAt: true,
        },
      },
    },
  });

export type AdminOrderTransition =
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

const allowedTransitions = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED"],
  OUT_FOR_DELIVERY: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
} as const;

export async function listAdminOrders(
  limit = 50,
) {
  return db.order.findMany({
    orderBy: {
      createdAt: "desc",
    },

    take: Math.max(
      1,
      Math.min(100, limit),
    ),

    select: {
      id: true,
      code: true,
      customerName: true,
      phone: true,
      type: true,
      status: true,
      subtotal: true,
      discount: true,
      fee: true,
      total: true,
      notes: true,
      createdAt: true,

      items: {
        select: {
          id: true,
          name: true,
          unitPrice: true,
          quantity: true,
        },
      },

      history: {
        orderBy: {
          createdAt: "asc",
        },

        select: {
          status: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function updateOrderStatus(
  code: string,
  nextStatus: AdminOrderTransition,
) {
  return db.$transaction(async (tx) => {
    const current =
      await tx.order.findUnique({
        where: {
          code,
        },

        select: {
          id: true,
          code: true,
          status: true,
        },
      });

    if (!current) {
      throw new OrderServiceError(
        "ORDER_NOT_FOUND",
        "Pesanan tidak ditemukan.",
      );
    }

    const allowed =
      allowedTransitions[
        current.status
      ] as readonly string[];

    if (
      !allowed.includes(
        nextStatus,
      )
    ) {
      throw new Error(
        "ORDER_STATUS_TRANSITION_INVALID",
      );
    }

    /*
     * Optimistic concurrency:
     * update hanya terjadi kalau status
     * belum berubah sejak kita baca.
     */
    const updated =
      await tx.order.updateMany({
        where: {
          id: current.id,
          status:
            current.status,
        },

        data: {
          status: nextStatus,
        },
      });

    if (updated.count !== 1) {
      throw new Error(
        "ORDER_STATUS_CONFLICT",
      );
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId: current.id,
        status: nextStatus,
        note:
          "Status diperbarui oleh admin.",
      },
    });

    return {
      code: current.code,
      status: nextStatus,
    };
  });
}

export function getAllowedOrderTransitions(
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "READY"
    | "OUT_FOR_DELIVERY"
    | "COMPLETED"
    | "CANCELLED",
) {
  return [
    ...allowedTransitions[status],
  ];
}