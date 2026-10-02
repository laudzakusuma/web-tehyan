import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "@/server/services/articles",
  () => ({
    listPublishedArticles:
      vi.fn(),
  }),
);

import JournalPage from "./page";

import {
  listPublishedArticles,
} from "@/server/services/articles";

const mockedListArticles =
  vi.mocked(
    listPublishedArticles,
  );

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
    const element =
      node as {
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
  "journal page",
  () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it(
      "renders published articles from the authoritative service",
      async () => {
        mockedListArticles.mockResolvedValue(
          [
            {
              id: "article-1",

              slug:
                "mengapa-teh-selalu-punya-tempat",

              title:
                "Mengapa Teh Selalu Punya Tempat",

              excerpt:
                "Tentang jeda dan secangkir teh.",

              coverImageUrl:
                null,

              publishedAt:
                new Date(
                  "2026-10-02T05:00:00.000Z",
                ),
            },
          ],
        );

        const page =
          await JournalPage();

        const text =
          textFromReactNode(
            page,
          );

        expect(text).toContain(
          "Mengapa Teh Selalu Punya Tempat",
        );

        expect(text).toContain(
          "Tentang jeda dan secangkir teh.",
        );

        expect(
          mockedListArticles,
        ).toHaveBeenCalledWith(
          20,
        );
      },
    );

    it(
      "renders an empty state",
      async () => {
        mockedListArticles.mockResolvedValue(
          [],
        );

        const page =
          await JournalPage();

        expect(
          textFromReactNode(
            page,
          ),
        ).toContain(
          "Belum ada catatan yang diterbitkan.",
        );
      },
    );
  },
);