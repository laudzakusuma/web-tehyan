export type OutletHour = {
  weekday: number;
  openMin: number;
  closeMin: number;
};

const weekdays = [
  { weekday: 1, name: "Senin" },
  { weekday: 2, name: "Selasa" },
  { weekday: 3, name: "Rabu" },
  { weekday: 4, name: "Kamis" },
  { weekday: 5, name: "Jumat" },
  { weekday: 6, name: "Sabtu" },
  { weekday: 0, name: "Minggu" },
];

export function isOutletSlug(slug: string) {
  return slug.length <= 120 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

const formatMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}.${String(minutes % 60).padStart(2, "0")}`;

export function formatOutletHours(hour?: OutletHour) {
  if (!hour) return "Tutup";
  const { openMin, closeMin } = hour;
  if (!Number.isInteger(openMin) || !Number.isInteger(closeMin) ||
      openMin < 0 || openMin >= 1440 || closeMin < 0 || closeMin > 1440) {
    return "Jam belum tersedia";
  }
  if (openMin === closeMin) return "Tutup";
  const overnight = closeMin < openMin ? " (hari berikutnya)" : "";
  return `${formatMinutes(openMin)} - ${formatMinutes(closeMin)} WIB${overnight}`;
}

export function getWeeklyHours(hours: OutletHour[]) {
  return weekdays.map((day) => ({
    ...day,
    schedule: formatOutletHours(hours.find((hour) => hour.weekday === day.weekday)),
  }));
}

export function getHoursSummary(hours: OutletHour[]) {
  if (hours.length === 0) return "Jam operasional belum tersedia";
  const week = getWeeklyHours(hours);
  if (week.every((day) => day.schedule === week[0].schedule)) {
    if (week[0].schedule === "Jam belum tersedia") return "Jam operasional belum tersedia";
    return week[0].schedule === "Tutup" ? "Tutup setiap hari" : `Setiap hari, ${week[0].schedule}`;
  }
  return "Jam berbeda tiap hari";
}

export function getSafeWebUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function getOutletImageSrc(value: string | null) {
  if (!value) return null;
  // Permit local raster assets, but not protocol-relative URLs or SVG payloads.
  if (/^\/(?!\/)[a-zA-Z0-9/_-]+\.(?:avif|webp|png|jpe?g)$/i.test(value)) return value;
  return getSafeWebUrl(value);
}

export function getPhoneHref(phone: string) {
  const normalized = phone.replace(/[\s().-]/g, "");
  return /^\+?\d{7,15}$/.test(normalized) ? `tel:${normalized}` : null;
}
