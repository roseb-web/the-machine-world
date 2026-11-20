// Gallery: one note per picture becomes the Gallery page. Made-up names only.
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parse, stringify } from "yaml";
import { exportWiki } from "../shared/export";

const notes = [
  { path: "People/Bran.md", text: "---\nplayer_type: Person\n---\n> [!player] Overview\n> A miller.\n" },
  { path: "People/Hidden.md", text: "# DM only\n" },
  { path: "Art/Bran sketch.md", text: '---\nimage: "[[bran.png]]"\ndescription: Bran at the mill\nartist: Alex\nsession: "[[Session 1]]"\ncharacter: ["[[Bran]]", "Ivy"]\ndate: 2026-01-05\n---\n' },
  { path: "Art/Second.md", text: "---\ndescription: Night sky\nartist: Sam\ncharacter: \"[[Hidden|The stranger]]\"\ndate: 2026-02-01\n---\n\n![[sky.jpg]]\n" },
  { path: "Art/No picture.md", text: "---\ndescription: Nothing\n---\n" },
];
const files = ["People/Bran.md", "People/Hidden.md", "Art/bran.png", "Art/sky.jpg"];
const r = exportWiki(notes, {
  sections: [{ folder: "People", section: "people" }],
  defaultSection: "misc",
  playerPagesFolder: "Player Pages",
  galleryFolder: "Art",
  resolveLink: (l) => files.find((p) => p.endsWith(`/${l}`) || p.endsWith(`/${l}.md`)) ?? null,
  yaml: { parse, stringify },
});

test("art notes become the Gallery page, newest first, pictures copied", () => {
  const g = r.files.find((f) => f.path === "gallery.md")!;
  const items = (parse(g.text!.split("---")[1]) as { mw_gallery: { description: string; img: string; characters: { name: string; to?: string }[]; date: string }[] }).mw_gallery;
  assert.deepEqual(items.map((i) => i.description), ["Night sky", "Bran at the mill"]);
  assert.equal(items[1].date, "2026-01-05");
  assert.deepEqual(items[1].characters, [{ name: "Bran", to: "people/bran" }, { name: "Ivy" }]);
  // A link to an unpublished page: just the name shown, no link
  assert.deepEqual(items[0].characters, [{ name: "The stranger" }]);
  assert.ok(r.files.some((f) => f.copyFrom === "Art/bran.png"));
  assert.ok(r.files.some((f) => f.copyFrom === "Art/sky.jpg"));
  assert.ok(!g.text!.includes("DM only"));
});

test("art notes aren't pages of their own", () => {
  assert.ok(!r.files.some((f) => f.path.toLowerCase().includes("sketch")));
});
