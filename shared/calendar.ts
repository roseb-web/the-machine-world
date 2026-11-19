// Works out today's in-game date from Calendarium's settings, in the three styles people use.
// Only the current date leaves the vault here. Events are not exported yet.

export interface GameDate {
  day: number;
  month: string; // old name, e.g. "Orrimel"
  year: number;
  era: string; // e.g. "YC"
  weekday: string; // e.g. "Morva"
  concord: string; // e.g. "3 Septimus, 100 YC"
  season: string; // e.g. "Autumn 33"
}

const CONCORD_MONTHS = [
  "Primus", "Secundus", "Tertius", "Quartus", "Quintus",
  "Sextus", "Septimus", "Octavus", "Nonus", "Decimus",
];

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

export function gameDateFrom(data: unknown): GameDate | null {
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

  const era = now.year >= 1 ? "YC" : "BL";
  const year = now.year >= 1 ? now.year : 1 - now.year;
  return {
    day: now.day,
    month: months[now.month].name,
    year,
    era,
    weekday,
    concord: `${now.day} ${CONCORD_MONTHS[now.month] ?? ""}, ${year} ${era}`,
    season: `${SEASONS[seasonIndex]} ${seasonDay}`,
  };
}
