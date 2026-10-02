import {
  describe,
  expect,
  it,
} from "vitest";

import CeritaPage from "./page";

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

describe("cerita page", () => {
  it("renders the Tehyan brand story", () => {
    const page =
      CeritaPage();

    const text =
      textFromReactNode(
        page,
      );

    expect(text).toContain(
      "Teh tidak harus rumit untuk terasa berarti.",
    );

    expect(text).toContain(
      "Tidak terburu-buru.",
    );

    expect(text).toContain(
      "Akrab, bukan rumit.",
    );

    expect(text).toContain(
      "Punya tempat.",
    );
  });
});