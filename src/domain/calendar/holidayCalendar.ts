import type { Holiday } from "../shared/types";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function shiftedDay(base: Date, offsetDays: number): string {
  const result = new Date(base);
  result.setUTCDate(result.getUTCDate() + offsetDays);
  return formatDate(result.getUTCFullYear(), result.getUTCMonth() + 1, result.getUTCDate());
}

export function getCzechHolidaysForYear(year: number): Holiday[] {
  const easter = easterSunday(year);

  return [
    { date: formatDate(year, 1, 1), name: "Nový rok" },
    { date: shiftedDay(easter, -2), name: "Velký pátek" },
    { date: shiftedDay(easter, 1), name: "Velikonoční pondělí" },
    { date: formatDate(year, 5, 1), name: "Svátek práce" },
    { date: formatDate(year, 5, 8), name: "Den vítězství" },
    { date: formatDate(year, 7, 5), name: "Den slovanských věrozvěstů" },
    { date: formatDate(year, 7, 6), name: "Den upálení mistra Jana Husa" },
    { date: formatDate(year, 9, 28), name: "Den české státnosti" },
    { date: formatDate(year, 10, 28), name: "Den vzniku čs. státu" },
    { date: formatDate(year, 11, 17), name: "Den boje za svobodu" },
    { date: formatDate(year, 12, 24), name: "Štědrý den" },
    { date: formatDate(year, 12, 25), name: "1. svátek vánoční" },
    { date: formatDate(year, 12, 26), name: "2. svátek vánoční" },
  ];
}

export function mergeHolidayYears(existing: Holiday[], years: number[]): Holiday[] {
  const map = new Map(existing.map(holiday => [holiday.date, holiday]));

  for (const year of years) {
    for (const holiday of getCzechHolidaysForYear(year)) {
      if (!map.has(holiday.date)) {
        map.set(holiday.date, holiday);
      }
    }
  }

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}
