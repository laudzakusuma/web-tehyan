import {
  describe,
  expect,
  it,
} from "vitest";

import TehKamiPage from "./page";

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

describe("teh kami page", () => {
  it("renders the tea selection", () => {
    const page =
      TehKamiPage();

    const text =
      textFromReactNode(
        page,
      );

    expect(text).toContain(
      "Teh Manis Tehyan",
    );

    expect(text).toContain(
      "Teh Tawar Hangat",
    );

    expect(text).toContain(
      "Teh Susu Gula Aren",
    );

    expect(text).toContain(
      "Teh Tarik Tehyan",
    );

    expect(text).toContain(
      "Teh Leci",
    );

    expect(text).toContain(
      "Teh Lemon Madu",
    );
  });
});