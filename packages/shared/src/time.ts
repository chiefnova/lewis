import { addDays, differenceInCalendarDays } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const MONTANA_TIME_ZONE = "America/Denver";

export function montanaNow(now: Date = new Date()): Date {
  return toZonedTime(now, MONTANA_TIME_ZONE);
}

export function montanaDeadline(date: Date, days: number): Date {
  const montanaDate = toZonedTime(date, MONTANA_TIME_ZONE);
  return fromZonedTime(addDays(montanaDate, days), MONTANA_TIME_ZONE);
}

export function daysUntilDeadline(deadline: Date, now: Date = new Date()): number {
  return differenceInCalendarDays(toZonedTime(deadline, MONTANA_TIME_ZONE), montanaNow(now));
}

export function formatMontana(date: Date, pattern = "yyyy-MM-dd HH:mm zzz"): string {
  return formatInTimeZone(date, MONTANA_TIME_ZONE, pattern);
}
