// Home page: Previously on, Coming up, New since Session N. Made-up names only.
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parse, stringify } from "yaml";
import { comingUp, latestSession, trackChanges } from "../shared/home";

const y = { parse, stringify };
const page = (path: string, props: Record<string, unknown>, body = "Text.") => ({ path, text: `---\n${stringify(props).trimEnd()}\n---\n\n${body}\n` });
const s1 = page("sessions/session-1.md", { title: "Session 1", "fc-date": "10-01-01", "fc-category": "party" }, "## Overview\n\nFirst.\n\n- a\n- b");
const s2 = page("sessions/session-2.md", { title: "Session 2", "fc-date": "10-01-08", "fc-category": "party", player_title: "The [[places/mill|Mill]]", mw_dates: ["8 Firstmonth, 10 YC"] }, "## Overview\n\nThey met **Bran** at the [[places/mill|Mill]].\n\n- One\n- Two\n- Three");
const mill = page("places/mill.md", { title: "Mill" });
const folder = { path: "places/index.md", text: "---\ntitle: Places\nmw_folder: true\n---\n" };

test("Previously on: the newest session, first line and two points as plain text", () => {
  const last = latestSession([s1, s2, mill], y)!;
  assert.equal(last.to, "sessions/session-2");
  assert.equal(last.session, "Session 2");
  assert.equal(last.date, "8 Firstmonth, 10 YC");
  assert.equal(last.lead, "They met Bran at the Mill.");
  assert.deepEqual(last.points, ["One", "Two"]);
});

test("Coming up: yearly events after today, nearest first, with days to go", () => {
  const cal = {
    today: { year: 10, month: 1, day: 5 },
    months: ["Firstmonth", "Secondmonth"],
    monthLengths: [30, 30],
    categories: [{ id: "f", name: "Festivals" }, { id: "s", name: "Star signs" }],
    events: [
      { name: "Star sign: Oaken (the Tree)", category: "s", date: { year: null, month: 1, day: 10 } },
      { name: "Frost Fair", category: "f", date: { year: null, month: 0, day: 2 } },
      { name: "Today Fest", category: "f", date: { year: null, month: 1, day: 5 } },
    ],
  } as never;
  const c = comingUp(cal);
  assert.deepEqual(c.map((x) => [x.name, x.kind, x.days]), [["Today Fest", "Festival", 0], ["Oaken, the Tree", "Star sign", 5], ["Frost Fair", "Festival", 27]]);
});

test("New since: nothing new on the first Publish, then new and updated pages", () => {
  const a = trackChanges([s1, mill, folder], null, "2026-01-01", y);
  assert.equal(a.items.length, 0);
  const mill2 = page("places/mill.md", { title: "Mill" }, "Changed text.");
  const forge = page("places/forge.md", { title: "Forge" });
  const b = trackChanges([s1, s2, mill2, forge, folder], a.state, "2026-01-08", y);
  assert.equal(b.since, "Session 2");
  assert.deepEqual(b.items.map((i) => [i.title, i.kind, i.section]).sort(), [["Forge", "new", "Places"], ["Mill", "updated", "Places"]]);
  // A later Publish with no real changes keeps the same list; date cards don't count as changes
  const mill3 = page("places/mill.md", { title: "Mill", mw_dates: ["1 Firstmonth, 10 YC"] }, "Changed text.");
  const c = trackChanges([s1, s2, mill3, forge, folder], b.state, "2026-01-09", y);
  assert.deepEqual(c.items.map((i) => i.title).sort(), ["Forge", "Mill"]);
  assert.equal(JSON.parse(c.state).log.length, JSON.parse(b.state).log.length);
});

test("New since: a newer session recap starts a fresh list", () => {
  const a = trackChanges([s1, mill], null, "2026-01-01", y);
  const b = trackChanges([s1, mill, page("places/forge.md", { title: "Forge" })], a.state, "2026-01-02", y);
  const c = trackChanges([s1, s2, mill, page("places/forge.md", { title: "Forge" }), page("places/well.md", { title: "Well" })], b.state, "2026-01-08", y);
  assert.equal(c.since, "Session 2");
  assert.deepEqual(c.items.map((i) => i.title), ["Well"]);
});
