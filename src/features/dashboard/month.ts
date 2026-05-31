export type DashboardMonth = {
  key: string;
  label: string;
  previousKey: string;
  nextKey: string;
};

export const USER_TIME_ZONE_COOKIE = "moneymind_user_time_zone";

type MonthParts = {
  year: number;
  monthIndex: number;
};

function padMonth(month: number) {
  return String(month).padStart(2, "0");
}

function toMonthKey(year: number, monthIndex: number) {
  return `${year}-${padMonth(monthIndex + 1)}`;
}

function parseMonthKey(input: string): MonthParts | null {
  const match = input.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isInteger(year) || month < 1 || month > 12) {
    return null;
  }

  return { year, monthIndex: month - 1 };
}

function getMonthPartsInTimeZone(date: Date, timeZone: string): MonthParts | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
    }).formatToParts(date);
    const year = Number(parts.find((part) => part.type === "year")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);

    if (!Number.isInteger(year) || month < 1 || month > 12) {
      return null;
    }

    return { year, monthIndex: month - 1 };
  } catch {
    return null;
  }
}

export function getCurrentMonthKey(now = new Date(), timeZone?: string) {
  const timeZoneParts = timeZone
    ? getMonthPartsInTimeZone(now, timeZone)
    : null;

  if (timeZoneParts) {
    return toMonthKey(timeZoneParts.year, timeZoneParts.monthIndex);
  }

  return toMonthKey(now.getFullYear(), now.getMonth());
}

function shiftMonthKey(monthKey: string, delta: number) {
  const parts = parseMonthKey(monthKey);

  if (!parts) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }

  const shifted = new Date(Date.UTC(parts.year, parts.monthIndex + delta, 1));
  return toMonthKey(shifted.getUTCFullYear(), shifted.getUTCMonth());
}

export function getPreviousMonthKey(monthKey: string) {
  return shiftMonthKey(monthKey, -1);
}

export function getNextMonthKey(monthKey: string) {
  return shiftMonthKey(monthKey, 1);
}

export function getMonthWindow(monthKey: string) {
  const parts = parseMonthKey(monthKey);

  if (!parts) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }

  return {
    start: new Date(Date.UTC(parts.year, parts.monthIndex, 1)),
    end: new Date(Date.UTC(parts.year, parts.monthIndex + 1, 1)),
  };
}

export function getSelectedMonth(
  input: string | undefined,
  now = new Date(),
  timeZone?: string,
): DashboardMonth {
  const key =
    input && parseMonthKey(input) ? input : getCurrentMonthKey(now, timeZone);
  const parts = parseMonthKey(key);

  if (!parts) {
    throw new Error(`Invalid month key: ${key}`);
  }

  return {
    key,
    label: `Tháng ${padMonth(parts.monthIndex + 1)}/${parts.year}`,
    previousKey: getPreviousMonthKey(key),
    nextKey: getNextMonthKey(key),
  };
}
