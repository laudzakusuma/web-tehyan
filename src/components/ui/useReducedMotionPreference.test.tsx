import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import useReducedMotionPreference from "./useReducedMotionPreference";
import Reveal from "./Reveal";

describe("hydration-safe motion preference", () => {
  it("uses a stable server snapshot without reading browser APIs", () => {
    function Probe() { return <span>{String(useReducedMotionPreference())}</span>; }
    expect(renderToStaticMarkup(<Probe />)).toBe("<span>false</span>");
  });
  it("keeps server-rendered reveal content available to the reduced-motion CSS", () => {
    const html = renderToStaticMarkup(<Reveal>Konten tersimpan</Reveal>);
    expect(html).toContain("motion-reveal");
    expect(html).toContain("Konten tersimpan");
    expect(html).not.toContain('aria-hidden="true"');
  });
});
