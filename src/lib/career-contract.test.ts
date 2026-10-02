import {
  describe,
  expect,
  it,
} from "vitest";

import {
  jobApplicationInputSchema,
} from "./career-contract";

describe(
  "career application contract",
  () => {
    it(
      "accepts a valid application",
      () => {
        const result =
          jobApplicationInputSchema.safeParse(
            {
              jobSlug:
                "barista",

              name:
                "Laudza Kusuma",

              email:
                "LAUDZA@example.com",

              phone:
                "+62 812-3456-7890",

              portfolioUrl:
                "https://example.com",

              message:
                "Saya tertarik bergabung.",
            },
          );

        expect(
          result.success,
        ).toBe(true);

        if (result.success) {
          expect(
            result.data.email,
          ).toBe(
            "laudza@example.com",
          );
        }
      },
    );

    it(
      "rejects invalid application data",
      () => {
        const result =
          jobApplicationInputSchema.safeParse(
            {
              jobSlug:
                "INVALID SLUG",

              name: "A",

              email:
                "bukan-email",

              phone: "123",

              portfolioUrl:
                "bukan-url",
            },
          );

        expect(
          result.success,
        ).toBe(false);
      },
    );
  },
);