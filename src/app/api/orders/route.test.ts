import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "@/server/chat-security",
  () => ({
    isSameOriginRequest: vi.fn(
      () => true,
    ),

    rateAllowed: vi.fn(
      () => true,
    ),
  }),
);

vi.mock(
  "@/server/services/orders",
  async () => {
    const actual = await vi.importActual<
      typeof import(
        "@/server/services/orders"
      )
    >(
      "@/server/services/orders",
    );

    return {
      ...actual,

      createOrder: vi.fn(),
    };
  },
);

import { POST } from "./route";
import {
  OrderServiceError,
  createOrder,
} from "@/server/services/orders";
import {
  isSameOriginRequest,
  rateAllowed,
} from "@/server/chat-security";

const mockedCreateOrder =
  vi.mocked(createOrder);

const mockedSameOrigin =
  vi.mocked(isSameOriginRequest);

const mockedRateAllowed =
  vi.mocked(rateAllowed);

function request(
  body: unknown,
) {
  return new Request(
    "http://localhost:3000/api/orders",
    {
      method: "POST",

      headers: {
        "content-type":
          "application/json",

        origin:
          "http://localhost:3000",
      },

      body: JSON.stringify(body),
    },
  );
}

const validOrder = {
  customerName: "Laudza",
  phone: "081234567890",
  type: "PICKUP",
  notes: "Es sedikit",
  items: [
    {
      productId: "product-1",
      quantity: 2,
    },
  ],
};

describe(
  "POST /api/orders",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      mockedSameOrigin.mockReturnValue(
        true,
      );

      mockedRateAllowed.mockReturnValue(
        true,
      );
    });

    it(
      "creates an order using server service",
      async () => {
        mockedCreateOrder.mockResolvedValue(
          {
            code: "THY-261002-ABC123",
            status: "PENDING",
            subtotal: 32000,
            discount: 0,
            fee: 0,
            total: 32000,
          },
        );

        const response = await POST(
          request(
            validOrder,
          ) as never,
        );

        expect(
          response.status,
        ).toBe(201);

        const body =
          await response.json();

        expect(body.order).toEqual({
          code: "THY-261002-ABC123",
          status: "PENDING",
          subtotal: 32000,
          discount: 0,
          fee: 0,
          total: 32000,
        });

        expect(
          mockedCreateOrder,
        ).toHaveBeenCalledWith(
          validOrder,
          null,
        );
      },
    );

    it(
      "rejects invalid checkout input",
      async () => {
        const response = await POST(
          request({
            customerName: "",
            phone: "1",
            type: "PICKUP",
            items: [],
          }) as never,
        );

        expect(
          response.status,
        ).toBe(400);

        expect(
          mockedCreateOrder,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "rejects cross-origin requests",
      async () => {
        mockedSameOrigin.mockReturnValue(
          false,
        );

        const response = await POST(
          request(
            validOrder,
          ) as never,
        );

        expect(
          response.status,
        ).toBe(403);

        expect(
          mockedCreateOrder,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "rate limits order creation",
      async () => {
        mockedRateAllowed.mockReturnValue(
          false,
        );

        const response = await POST(
          request(
            validOrder,
          ) as never,
        );

        expect(
          response.status,
        ).toBe(429);
      },
    );

    it(
      "returns conflict for unavailable products",
      async () => {
        mockedCreateOrder.mockRejectedValue(
          new OrderServiceError(
            "PRODUCT_UNAVAILABLE",
            "Teh Tarik sedang tidak tersedia.",
          ),
        );

        const response = await POST(
          request(
            validOrder,
          ) as never,
        );

        expect(
          response.status,
        ).toBe(409);

        const body =
          await response.json();

        expect(body.code).toBe(
          "PRODUCT_UNAVAILABLE",
        );
      },
    );
  },
);