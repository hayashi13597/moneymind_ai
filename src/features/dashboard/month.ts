export type DashboardMonth = {
  key: string;
  label: string;
  previousKey: string;
  nextKey: string;
};

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

function getCurrentMonthKey(now: Date) {
  return toMonthKey(now.getUTCFullYear(), now.getUTCMonth());
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
): DashboardMonth {
  const key = input && parseMonthKey(input) ? input : getCurrentMonthKey(now);
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
