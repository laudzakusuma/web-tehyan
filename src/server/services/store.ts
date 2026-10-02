import { formatOutletHours, type OutletHour } from "@/lib/outlets";
import { getPrimaryOutlet } from "@/server/services/outlets";

export const getStoreInfo = getPrimaryOutlet;

export function outletOpenStatus(hours: OutletHour[], now = new Date()) {
  if (hours.length === 0) return { open: null, hoursToday: "Jam operasional belum tersedia" };
  const wib = new Date(now.getTime() + 7 * 3600_000);
  const weekday = wib.getUTCDay();
  const minute = wib.getUTCHours() * 60 + wib.getUTCMinutes();
  const today = hours.find((hour) => hour.weekday === weekday);
  const yesterday = hours.find((hour) => hour.weekday === (weekday + 6) % 7);
  const valid = (hour?: OutletHour): hour is OutletHour => !!hour &&
    Number.isInteger(hour.openMin) && Number.isInteger(hour.closeMin) &&
    hour.openMin >= 0 && hour.openMin < 1440 && hour.closeMin >= 0 && hour.closeMin <= 1440;

  if ((today && !valid(today)) || (yesterday && !valid(yesterday))) {
    return { open: null, hoursToday: formatOutletHours(today) };
  }
  const fromYesterday = valid(yesterday) && yesterday.closeMin < yesterday.openMin && minute < yesterday.closeMin;
  const fromToday = valid(today) && today.openMin !== today.closeMin &&
    minute >= today.openMin && (today.closeMin < today.openMin || minute < today.closeMin);
  return { open: fromYesterday || fromToday, hoursToday: formatOutletHours(today) };
}

export async function checkOpenStatus(now = new Date()) {
  const store = await getStoreInfo();
  return store ? outletOpenStatus(store.hours, now) : { open: null, hoursToday: "Info toko belum tersedia" };
}
