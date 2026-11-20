// People web page: only published people, only their player_ properties. Made-up names only.
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parse, stringify } from "yaml";
import { exportWiki } from "../shared/export";

const notes = [
  {
    path: "People/Bran.md",
    text: '---\nphoto: "[[bran.png]]"\ngroups: ["[[The Secret Ring]]"]\nrelations: ["[[Hidden]] | lover"]\nplayer_groups: ["Millbrook residents", "[[The Lantern Guild]]"]\nplayer_relations: ["[[Ivy]] | friend | close", "[[Hidden]] | rival"]\n---\n> [!player] Overview\n> A miller.\n',
  },
  { path: "People/Ivy.md", text: "---\nplayer_groups: [Millbrook residents]\n---\n> [!player] Overview\n> A weaver.\n" },
  { path: "People/Hidden.md", text: "---\nplayer_groups: [Millbrook residents]\n---\n# DM only\n" },
  { path: "People/Quiet.md", text: "---\ngroups: [Millbrook residents]\n---\n> [!player] Overview\n> Published, but not in the web yet.\n" },
  { path: "People/Loner.md", text: '---\nplayer_relations: ["[[Hidden]]"]\n---\n> [!player] Overview\n> Only tied to someone unpublished.\n' },
  { path: "Player Pages/Tam.md", text: "---\nplayer_groups: [The party]\nplayer_relations: [\"[[Bran]]\"]\n---\nTam's page.\n" },
  { path: "Factions/The Lantern Guild.md", text: "# DM only\n" },
  { path: "Wiki/People web groups.md", text: "---\nlocation: [Millbrook residents]\ncollective: [\"[[The Lantern Guild]]\"]\n---\n" },
];
const files = [...notes.map((n) => n.path), "Art/bran.png"];
const r = exportWiki(notes, {
  sections: [{ folder: "People", section: "people" }],
  defaultSection: "misc",
  playerPagesFolder: "Player Pages",
  groupTypesNote: "Wiki/People web groups.md",
  resolveLink: (l) => files.find((p) => p.endsWith(`/${l}`) || p.endsWith(`/${l}.md`)) ?? null,
  yaml: { parse, stringify },
});
const page = r.files.find((f) => f.path === "people-web.md")!;
type W = { people: { id: string; name: string; groups: string[]; pc?: boolean; photo?: string }[]; groups: { id: string; name: string; type?: string; open?: string; party?: boolean }[]; ties: { a: string; b: string; type: string; strength?: string }[] };
const web = (parse(page.text!.split("---")[1]) as { mw_web: W }).mw_web;

test("only published people with player groups or ties are in the web", () => {
  assert.deepEqual(web.people.map((p) => p.name).sort(), ["Bran", "Ivy", "Tam"]);
});

test("someone with nothing shown is left out", () => {
  assert.ok(!web.people.some((p) => p.name === "Loner"));
});

test("the DM's own groups and relations never leak", () => {
  assert.ok(!page.text!.includes("Secret Ring"));
  assert.ok(!page.text!.includes("lover"));
  assert.ok(!page.text!.includes("DM only"));
  assert.ok(!web.groups.some((g) => g.open)); // the Lantern Guild page isn't published
});

test("ties go only between people in the web", () => {
  assert.deepEqual(
    web.ties.map((t) => `${t.a}>${t.b}:${t.type}${t.strength ? ":" + t.strength : ""}`).sort(),
    ["people/bran>people/ivy:friend:close", "tam>people/bran:knows"],
  );
});

test("group types come from the groups note; the party is marked", () => {
  const g = Object.fromEntries(web.groups.map((x) => [x.id, x]));
  assert.equal(g["millbrook residents"].type, "location");
  assert.equal(g["the lantern guild"].type, "collective");
  assert.equal(g["the party"].party, true);
  assert.equal(web.people.find((p) => p.name === "Tam")!.pc, true);
  assert.equal(web.people.find((p) => p.name === "Bran")!.photo, "assets/bran.png");
});
