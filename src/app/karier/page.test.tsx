import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "@/server/services/careers",
  () => ({
    listPublishedJobs:
      vi.fn(),
  }),
);

import CareersPage from "./page";

import {
  listPublishedJobs,
} from "@/server/services/careers";

const mockedListJobs =
  vi.mocked(
    listPublishedJobs,
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

describe("career page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it(
    "renders published jobs",
    async () => {
      mockedListJobs.mockResolvedValue(
        [
          {
            id: "job-1",
            slug: "barista",
            title: "Barista",
            location:
              "Depok",
            employmentType:
              "FULL_TIME",
            summary:
              "Menyiapkan minuman dan menjaga pengalaman pelanggan.",
            publishedAt:
              new Date(
                "2026-10-02T00:00:00.000Z",
              ),
          },
        ],
      );

      const page =
        await CareersPage();

      const text =
        textFromReactNode(
          page,
        );

      expect(text).toContain(
        "Barista",
      );

      expect(text).toContain(
        "Depok",
      );

      expect(text).toContain(
        "Menyiapkan minuman dan menjaga pengalaman pelanggan.",
      );
    },
  );

  it(
    "renders empty state when no jobs are open",
    async () => {
      mockedListJobs.mockResolvedValue(
        [],
      );

      const page =
        await CareersPage();

      expect(
        textFromReactNode(
          page,
        ),
      ).toContain(
        "Belum ada posisi yang sedang dibuka.",
      );
    },
  );
});