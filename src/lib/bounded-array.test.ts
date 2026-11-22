import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { boundedArray } from "./bounded-array";

describe("boundedArray", () => {
  it("checks size before validating any elements", () => {
    const validate = vi.fn(() => true);
    const schema = boundedArray(z.string().refine(validate), 2);
    expect(schema.safeParse(["a", "b", "c"]).success).toBe(false);
    expect(validate).not.toHaveBeenCalled();
    expect(schema.parse(["a", "b"])).toEqual(["a", "b"]);
    expect(validate).toHaveBeenCalledTimes(2);
  });
});
