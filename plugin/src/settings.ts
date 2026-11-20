// The plugin's settings. The starting values are in defaults.ts.
import type { MoodPin } from "../../shared/pinterest";
import type { SectionRule } from "../../shared/export";

export interface WikiSettings {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  contentPath: string;
  playerPagesFolder: string;
  galleryFolder: string; // one note per picture of player art
  groupTypesNote: string; // the people web's group types
  defaultSection: string;
  sections: SectionRule[];
  sectionTitles: Record<string, string>;
  publicCategories: string[]; // Calendarium category names whose events are always public
  publishTimeline: boolean;
  pinterestToken: string; // read-only token from the Pinterest developer portal
  moodboardCache: Record<string, MoodPin[]>; // last good pins, used if Pinterest can't be reached
  worldName: string; // e.g. "Eldmoor": "Welcome to Eldmoor" on the home page
  yearAfter: string; // name for year 1 and after, e.g. "YC" (may be empty)
  yearBefore: string; // name for years before 1, e.g. "BL" (may be empty)
  secondCalendarLabel: string; // e.g. "the Concord's calendar" (empty: no second calendar)
  secondCalendarMonths: string[]; // its month names, in the same order as Calendarium's months
  audiencePasswords: Record<string, string>; // "neri" -> password, "dm" -> password. Never published.
  audienceSalt: string; // random, made once (base64): part of turning passwords into keys
}
