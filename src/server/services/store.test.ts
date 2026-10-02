import { describe, expect, it } from "vitest";
import { outletOpenStatus } from "./store";

describe("WIB outlet opening calculation", () => {
  const overnight = [{ weekday: 6, openMin: 1200, closeMin: 120 }];
  it("includes yesterday's overnight opening and excludes its closing boundary", () => {
    expect(outletOpenStatus(overnight, new Date("2026-10-03T17:30:00Z")).open).toBe(true);
    expect(outletOpenStatus(overnight, new Date("2026-10-03T19:00:00Z")).open).toBe(false);
  });
  it("does not treat Sunday morning as part of Sunday night's future overnight shift", () => {
    const sunday = [{ weekday: 0, openMin: 1200, closeMin: 120 }];
    expect(outletOpenStatus(sunday, new Date("2026-10-03T18:00:00Z")).open).toBe(false);
    expect(outletOpenStatus(sunday, new Date("2026-10-04T13:00:00Z")).open).toBe(true);
  });
  it("uses opening-inclusive and closing-exclusive same-day hours", () => {
    const friday = [{ weekday: 5, openMin: 600, closeMin: 1260 }];
    expect(outletOpenStatus(friday, new Date("2026-10-02T03:00:00Z")).open).toBe(true);
    expect(outletOpenStatus(friday, new Date("2026-10-02T14:00:00Z")).open).toBe(false);
  });
  it("distinguishes missing information, invalid data and a closed day", () => {
    expect(outletOpenStatus([]).open).toBeNull();
    expect(outletOpenStatus([{ weekday: 5, openMin: -1, closeMin: 1260 }], new Date("2026-10-02T03:00:00Z")).open).toBeNull();
    expect(outletOpenStatus([{ weekday: 5, openMin: 600, closeMin: 600 }], new Date("2026-10-02T03:00:00Z")).open).toBe(false);
  });
});
