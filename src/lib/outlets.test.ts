import { describe, expect, it } from "vitest";
import { formatOutletHours, getHoursSummary, getOutletImageSrc, getPhoneHref, getSafeWebUrl, getWeeklyHours, isOutletSlug } from "./outlets";

describe("outlet operating hours", () => {
  it("maps database Sunday=0 to an Indonesian Monday-first week", () => {
    const week = getWeeklyHours([
      { weekday: 0, openMin: 720, closeMin: 1260 },
      { weekday: 1, openMin: 600, closeMin: 1200 },
    ]);
    expect(week.map((day) => day.name)).toEqual(["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]);
    expect(week[0].schedule).toBe("10.00 - 20.00 WIB");
    expect(week[1].schedule).toBe("Tutup");
    expect(week[6].schedule).toBe("12.00 - 21.00 WIB");
  });

  it("distinguishes missing information, uniform hours, and a closed weekday", () => {
    const daily = Array.from({ length: 7 }, (_, weekday) => ({ weekday, openMin: 600, closeMin: 1260 }));
    expect(getHoursSummary([])).toBe("Jam operasional belum tersedia");
    expect(getHoursSummary(daily)).toBe("Setiap hari, 10.00 - 21.00 WIB");
    expect(getHoursSummary(daily.filter((hour) => hour.weekday !== 1))).toBe("Jam berbeda tiap hari");
  });

  it("labels overnight schedules and does not interpret equal times as 24-hour opening", () => {
    expect(formatOutletHours({ weekday: 6, openMin: 1200, closeMin: 120 })).toBe("20.00 - 02.00 WIB (hari berikutnya)");
    expect(formatOutletHours({ weekday: 6, openMin: 600, closeMin: 1440 })).toBe("10.00 - 24.00 WIB");
    expect(formatOutletHours({ weekday: 6, openMin: 600, closeMin: 600 })).toBe("Tutup");
  });

  it.each([-1, 1440, 600.5, NaN])("does not publish invalid opening minutes (%s)", (openMin) => {
    expect(formatOutletHours({ weekday: 1, openMin, closeMin: 1260 })).toBe("Jam belum tersedia");
  });
});

describe("public outlet links", () => {
  it.each(["", "../admin", "Beji", "beji/secret", "beji--demo", "a".repeat(121)])("rejects an unsafe or noncanonical slug (%s)", (slug) => {
    expect(isOutletSlug(slug)).toBe(false);
  });

  it("accepts stable route slugs", () => expect(isOutletSlug("tehyan-beji-demo")).toBe(true));

  it.each(["javascript:alert(1)", "data:text/html,test", "//example.com/map", "https://user:password@example.com", "/admin", null])("rejects unsafe map URLs", (url) => {
    expect(getSafeWebUrl(url)).toBeNull();
  });

  it("permits HTTPS maps and local raster assets", () => {
    expect(getSafeWebUrl("https://maps.google.com/?q=Depok")).toBe("https://maps.google.com/?q=Depok");
    expect(getOutletImageSrc("/images/outlets/beji.webp")).toBe("/images/outlets/beji.webp");
    expect(getOutletImageSrc("/images/beji.svg")).toBeNull();
    expect(getOutletImageSrc("//example.com/image.png")).toBeNull();
  });

  it("produces callable phone links without accepting tel parameters", () => {
    expect(getPhoneHref("+62 (21) 1234-5678")).toBe("tel:+622112345678");
    expect(getPhoneHref("0211234567;ext=9")).toBeNull();
    expect(getPhoneHref("")).toBeNull();
  });
});
