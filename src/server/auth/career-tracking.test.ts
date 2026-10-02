import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  createCareerTrackingCode,
  parseCareerTrackingCode,
} from "./career-tracking";

const originalSecret =
  process.env
    .CAREER_TRACKING_SECRET;

describe(
  "career tracking code",
  () => {
    beforeEach(() => {
      process.env.CAREER_TRACKING_SECRET =
        "a".repeat(64);
    });

    afterAll(() => {
      if (
        originalSecret ===
        undefined
      ) {
        delete process.env
          .CAREER_TRACKING_SECRET;
      } else {
        process.env.CAREER_TRACKING_SECRET =
          originalSecret;
      }
    });

    it(
      "creates and verifies a tracking code",
      () => {
        const id =
          "cmur2seeh0002ui4wlso5dtud";

        const code =
          createCareerTrackingCode(
            id,
          );

        expect(
          code.startsWith(
            "KAR.",
          ),
        ).toBe(true);

        expect(
          parseCareerTrackingCode(
            code,
          ),
        ).toBe(id);
      },
    );

    it(
      "rejects a tampered tracking code",
      () => {
        const code =
          createCareerTrackingCode(
            "cmur2seeh0002ui4wlso5dtud",
          );

        const tampered =
          `${code.slice(
            0,
            -1,
          )}x`;

        expect(
          parseCareerTrackingCode(
            tampered,
          ),
        ).toBeNull();
      },
    );
  },
);