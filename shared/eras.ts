// How years are written. Set in the plugin's settings, so each campaign can use its own.
// Year 1 and after use `after` ("100 YC"); year 0 and before use `before` ("540 BL").
// If `before` is empty, earlier years are written with a minus sign ("-540").

export interface Eras {
  after: string; // e.g. "YC" or "DR"; may be empty
  before: string; // e.g. "BL" or "BC"; may be empty
}

// A second set of month names for the same months, e.g. another country's calendar (optional)
export interface SecondCalendar {
  label: string; // e.g. "the Concord's calendar"
  months: string[];
}

export const NO_ERAS: Eras = { after: "", before: "" };

export function yearText(year: number, eras: Eras = NO_ERAS): string {
  if (year >= 1) return `${year} ${eras.after}`.trim();
  return eras.before ? `${Math.abs(year)} ${eras.before}` : String(year);
}
