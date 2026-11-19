// Calendar events: public categories or published notes only, names only, nothing in the future.
// Made-up names only.
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parse, stringify } from "yaml";
import { exportWiki } from "../shared/export";

const months = Array.from({ length: 10 }, (_, i) => ({ name: `Month${i}`, length: 30 }));
const raw = {
  calendars: [
    {
      current: { year: 50, month: 3, day: 10 },
      static: { months, weekdays: ["A", "B", "C", "D", "E", "F"].map((name) => ({ name })), firstWeekDay: 0, moons: [{ cycle: 30, offset: 0 }] },
      categories: [
        { id: "fest", name: "Festivals" },
        { id: "party", name: "The party" },
        { id: "hist", name: "History" },
      ],
      events: [
        { name: "Harvest Fair", description: "SECRET-DESC", category: "fest", type: "Recurring", date: { year: [null, null], month: 5, day: 1 } },
        { name: "Hidden Coup", description: "x", category: "hist", type: "Date", date: { year: 20, month: 0, day: 1 } },
        { name: "The Old Kingdom", description: "#player Old stuff", category: "hist", note: "Places/Old Kingdom.md", type: "Range", date: { year: -300, month: 0, day: 1 }, end: { year: -100, month: 0, day: 1 } },
        { name: "The Long War", description: "[Old] #player", category: "hist", note: "Places/Old Kingdom.md", type: "Range", date: { year: 40, month: 0, day: 1 }, end: { year: 60, month: 0, day: 1 } },
        { name: "SECRET-NAME becomes someone else", description: "linked but not marked", category: "hist", note: "Places/Old Kingdom.md", type: "Date", date: { year: 10, month: 0, day: 1 } },
        { name: "Future Festival", category: "fest", type: "Date", date: { year: 51, month: 0, day: 1 } },
        { name: "SECRET-FULL The bridge falls", description: "DM-NOTE-A\n#player: The bridge falls\n#player-info: Nobody crosses now.\nDM-NOTE-B", category: "hist", type: "Date", date: { year: 30, month: 0, day: 1 } },
        { name: "SECRET-INFO-ONLY", description: "#player-info: not marked on its own", category: "hist", type: "Date", date: { year: 31, month: 0, day: 1 } },
      ],
    },
  ],
};
const card = (props: string) => `---\n${props}\n---\n# X\n\n> [!player] Overview\n> Hello.\n`;
const notes = [
  { path: "Places/Old Kingdom.md", text: card("player_type: Ruin") },
  { path: "Sessions/Session 1.md", text: card("fc-date: 50-04-08\nfc-category: party") },
  { path: "Sessions/Session 9.md", text: card("fc-date: 50-09-01\nfc-category: party") },
];
const resolveLink = (l: string) => notes.map((n) => n.path).find((p) => p.endsWith(`/${l}.md`)) ?? null;
const run = (publishTimeline: boolean) =>
  exportWiki(notes, {
    sections: [{ folder: "Places", section: "places" }, { folder: "Sessions", section: "sessions" }],
    defaultSection: "misc",
    playerPagesFolder: "Player Pages",
    resolveLink,
    yaml: { parse, stringify },
    calendar: { data: raw, publicCategories: ["fest", "party"], publishTimeline },
  });
const r = run(false);
const front = (path: string) => parse(r.files.find((f) => f.path === path)!.text!.match(/^---\n([\s\S]*?)\n---/)![1]);
const cal = front("calendar.md").mw_calendar;
const names = cal.events.map((e: { name: string }) => e.name);

test("public categories and #player events only", () => {
  assert.ok(names.includes("Harvest Fair"));
  assert.ok(names.includes("The Old Kingdom"));
  assert.ok(!names.includes("Hidden Coup"));
});

test("a linked, published note is not enough: the event name could be a secret", () => {
  assert.ok(!r.files.some((f) => f.text?.includes("SECRET-NAME")));
});

test("descriptions never leave", () => {
  assert.ok(!r.files.some((f) => f.text?.includes("SECRET-DESC")));
});

test("nothing after today; long events still going lose their end", () => {
  assert.ok(!names.includes("Future Festival"));
  assert.ok(!names.includes("Session 9"));
  const war = cal.events.find((e: { name: string }) => e.name === "The Long War");
  assert.equal(war.ongoing, true);
  assert.equal(war.end, undefined);
});

test("notes with fc-date become events on their own page", () => {
  const s = cal.events.find((e: { name: string }) => e.name === "Session 1");
  assert.deepEqual(s.date, { year: 50, month: 3, day: 8 });
  assert.equal(s.page, "sessions/session-1");
});

test("timeline only when switched on", () => {
  assert.ok(!r.files.some((f) => f.path === "timeline.md"));
  assert.ok(run(true).files.some((f) => f.path === "timeline.md"));
});

test("linked pages get a date card", () => {
  assert.deepEqual(front("places/old-kingdom.md").mw_dates, ["300 BL – 100 BL", "40 YC – ongoing"]);
});

test("only used categories are listed", () => {
  assert.deepEqual(cal.categories.map((c: { id: string }) => c.id), ["fest", "party", "hist"]);
});

test("#player: gives the name the party sees; #player-info: adds one line; the rest stays", () => {
  const e = cal.events.find((x: { name: string }) => x.name === "The bridge falls");
  assert.ok(e);
  assert.equal(e.info, "Nobody crosses now.");
  for (const bad of ["SECRET-FULL", "DM-NOTE-A", "DM-NOTE-B", "SECRET-INFO-ONLY"]) assert.ok(!r.files.some((f) => f.text?.includes(bad)), bad);
});
