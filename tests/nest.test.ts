// Pages sort into folders: Region > Town > Building. Made-up names only.
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parse, stringify } from "yaml";
import { exportWiki } from "../shared/export";

const card = (props: string) => `---\n${props}\n---\n# X\n\n> [!player] Overview\n> Hello.\n`;
const notes = [
  { path: "Places/Regions/Greenvale.md", text: card("player_type: Region") },
  { path: "Places/Regions/Millbrook.md", text: card('player_in: "[[Greenvale]]"') },
  { path: "Places/Millbrook/The Mill.md", text: card('player_in: "[[Millbrook]]"') },
  { path: "Places/Faraway.md", text: card("player_in: The Far Lands") },
  { path: "Places/Loose.md", text: card("player_type: Ruin") },
  { path: "NPCs/Greenvale/Millbrook/Ada.md", text: card("player_title: Miller") },
  { path: "NPCs/Secret Club/Bob.md", text: card("player_title: Baker") },
];
const all = notes.map((n) => n.path);
const resolveLink = (l: string) => all.find((p) => p.split("/").pop() === `${l}.md`) ?? null;
const r = exportWiki(notes, {
  sections: [{ folder: "Places", section: "places" }, { folder: "NPCs", section: "people" }],
  defaultSection: "misc",
  playerPagesFolder: "Player Pages",
  sectionTitles: { places: "Places", people: "People" },
  resolveLink,
  yaml: { parse, stringify },
});
const to = Object.fromEntries(r.published.map((p) => [p.from.split("/").pop(), p.to]));
const file = (path: string) => r.files.find((f) => f.path === path)?.text ?? "";

test("places nest with player_in", () => {
  assert.equal(to["Greenvale.md"], "places/greenvale/index");
  assert.equal(to["Millbrook.md"], "places/greenvale/millbrook/index");
  assert.equal(to["The Mill.md"], "places/greenvale/millbrook/the-mill");
  assert.equal(to["Loose.md"], "places/loose");
});

test("plain-text player_in makes a folder page with that title", () => {
  assert.equal(to["Faraway.md"], "places/the-far-lands/faraway");
  assert.match(file("places/the-far-lands/index.md"), /title: "The Far Lands"\nmw_folder: true/);
});

test("people follow vault folders only when they match a place", () => {
  assert.equal(to["Ada.md"], "people/greenvale/millbrook/ada");
  assert.match(file("people/greenvale/millbrook/index.md"), /title: "Millbrook"/);
  assert.equal(to["Bob.md"], "people/bob");
  assert.ok(!r.files.some((f) => /secret/.test(f.path + (f.text ?? ""))));
});

test("links point to the nested page", () => {
  assert.match(file("places/greenvale/millbrook/the-mill.md"), /player_in: "?\[\[places\/greenvale\/millbrook\/index\|/);
});
