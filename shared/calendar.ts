// Works out today's in-game date from Calendarium's settings, in the three styles people use.
// Only the current date leaves the vault here. Events are not exported yet.

import { Eras, NO_ERAS, SecondCalendar } from "./eras";

export interface GameDate {
  day: number;
  month: string; // old name, e.g. "Orrimel"
  year: number;
  era: string; // e.g. "YC" (empty if the campaign doesn't name its years)
  weekday: string; // e.g. "Morva"
  concord: string; // the same day in the second calendar, e.g. "3 Septimus, 100 YC" (empty if there isn't one)
  season: string; // e.g. "Autumn 33"
}

const SEASONS = ["Spring", "Summer", "Autumn", "Winter"];

interface CalendariumData {
  calendars?: {
    current?: { day: number; month: number; year: number };
    static?: {
      weekdays?: { name: string }[];
      months?: { name: string; length: number }[];
      firstWeekDay?: number;
    };
  }[];
}

export function gameDateFrom(data: unknown, eras: Eras = NO_ERAS, second?: SecondCalendar): GameDate | null {
  const cal = (data as CalendariumData)?.calendars?.[0];
  const now = cal?.current;
  const months = cal?.static?.months;
  const weekdays = cal?.static?.weekdays;
  if (!now || !months?.length || !weekdays?.length) return null;

  // Day of the year, counting from 1
  let dayOfYear = now.day;
  for (let i = 0; i < now.month; i++) dayOfYear += months[i].length;
  const yearLength = months.reduce((sum, m) => sum + m.length, 0);
  const seasonLength = yearLength / SEASONS.length;
  const seasonIndex = Math.min(SEASONS.length - 1, Math.floor((dayOfYear - 1) / seasonLength));
  const seasonDay = dayOfYear - Math.round(seasonIndex * seasonLength);

  // Every year here is a whole number of weeks, so the weekday only depends on the day of the year
  const first = cal?.static?.firstWeekDay ?? 0;
  const weekday = weekdays[(first + dayOfYear - 1) % weekdays.length].name;

  // Calendarium shows year -900 as "900 BL". Without a name for earlier years, it stays -900.
  const era = now.year >= 1 ? eras.after : eras.before;
  const year = now.year >= 1 || eras.before ? Math.abs(now.year) : now.year;
  const other = second?.months[now.month];
  return {
    day: now.day,
    month: months[now.month].name,
    year,
    era,
    weekday,
    concord: other ? `${now.day} ${other}, ${year} ${era}`.trim() : "",
    season: `${SEASONS[seasonIndex]} ${seasonDay}`,
  };
}
