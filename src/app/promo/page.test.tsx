import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "@/server/services/catalog",
  () => ({
    getPromotions: vi.fn(),
  }),
);

import PromoPage from "./page";

import {
  getPromotions,
} from "@/server/services/catalog";

const mockedGetPromotions =
  vi.mocked(getPromotions);

function textFromReactNode(
  node: unknown,
): string {
  if (
    typeof node === "string" ||
    typeof node === "number"
  ) {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node
      .map(textFromReactNode)
      .join(" ");
  }

  if (
    node &&
    typeof node === "object" &&
    "props" in node
  ) {
    const element = node as {
      props?: {
        children?: unknown;
      };
    };

    return textFromReactNode(
      element.props?.children,
    );
  }

  return "";
}

describe(
  "promo page",
  () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it(
      "renders promotions returned by the authoritative service",
      async () => {
        mockedGetPromotions.mockResolvedValue(
          [
            {
              title:
                "Beli 2 Teh Susu, gratis 1 Pisang Goreng",

              detail:
                "Berlaku Senin–Kamis, selama persediaan ada.",

              endsAt: null,
            },
          ],
        );

        const page =
          await PromoPage();

        const text =
          textFromReactNode(
            page,
          );

        expect(text).toContain(
          "Beli 2 Teh Susu, gratis 1 Pisang Goreng",
        );

        expect(text).toContain(
          "Berlaku Senin–Kamis, selama persediaan ada.",
        );

        expect(
          mockedGetPromotions,
        ).toHaveBeenCalledOnce();
      },
    );

    it(
      "renders an empty state when no promotion is active",
      async () => {
        mockedGetPromotions.mockResolvedValue(
          [],
        );

        const page =
          await PromoPage();

        const text =
          textFromReactNode(
            page,
          );

        expect(text).toContain(
          "Belum ada promo yang sedang ditayangkan.",
        );
      },
    );
  },
);