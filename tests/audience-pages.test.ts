// Audience views, stage 2: locked pages, and details only some can see. Made-up names only.
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parse, stringify } from "yaml";
import { exportWiki } from "../shared/export";
import type { LockedDetail, LockedSection } from "../shared/audiences";

const notes = [
  { path: "People/Millbrook/Bran.md", text: "---\nplayer_title: The miller\nplayer_status: Missing\nphoto: \"[[bran.png]]\"\nplayer_seen: \"[[Millbrook]]\"\nwiki_visibility:\n  player_status: tam\n  photo: dm\n---\n> [!player] Overview\n> A miller.\n" },
  { path: "Places/Millbrook.md", text: "> [!player] Overview\n> A village.\n" },
  { path: "People/Millbrook/The Hooded Woman.md", text: "---\nplayer_title: Stranger at the docks\nplayer_in: \"[[Millbrook]]\"\nphoto: \"[[hooded secret portrait.png]]\"\nplayer_say: HOOD-ed\nwiki_visibility:\n  player_say: dm\n---\nDM: she is the Grey Queen.\n\n> [!player-tam]- Overview\n> She stopped Tam at the docks. See [[Bran]].\n\n> [!dm]- The truth\n> The Grey Queen in disguise. ![[hooded secret portrait.png]]\n" },
  { path: "People/Rowan.md", text: "> [!player-ivy] Overview\n> Ivy's cousin, who knows about [[The Hooded Woman]].\n\n> [!player-tam]- Session 2\n> Tam met Rowan too.\n" },
  { path: "People/Nobody.md", text: "> [!player-sam] Overview\n> Sam has no password.\n" },
  { path: "Templates/NPC.md", text: "> [!player-tam] Overview\n> Example.\n" },
];
const paths = [...notes.map((n) => n.path), "Art/bran.png", "Art/hooded secret portrait.png"];
const opts = {
  sections: [{ folder: "People", section: "people" }, { folder: "Places", section: "places" }],
  defaultSection: "misc",
  playerPagesFolder: "Player Pages",
  audiences: { tam: "Tam", ivy: "Ivy", dm: "DM" },
  lockSecret: "s3cret",
  ignoreFolders: ["Templates"],
  resolveLink: (l: string) => paths.find((p) => p.endsWith(`/${l}`) || p.endsWith(`/${l}.md`)) ?? null,
  yaml: { parse, stringify },
};
const r = exportWiki(notes, opts);
const all = r.files.map((f) => `${f.path}\n${f.text ?? ""}`).join("\n");
const lockedFiles = r.files.filter((f) => f.path.startsWith("locked/"));
const itemsOf = (page: string) => r.locked.find((l) => l.page === page)!.sections;

test("a note with sections only for players or the DM becomes a locked page at an address that gives nothing away", () => {
  assert.equal(lockedFiles.length, 2); // the Hooded Woman, and Rowan (not Sam's: no password; not the template)
  for (const f of lockedFiles) {
    assert.match(f.path, /^locked\/[0-9a-f]{16}\.md$/);
    assert.ok(f.text!.includes("title: Locked page") && f.text!.includes("unlisted: true") && f.text!.includes("mw_locked_page: true"));
    assert.ok(f.text!.includes("This page is for someone else"));
  }
  for (const secret of ["Hooded", "Stranger", "Grey Queen", "HOOD-ed", "Rowan", "cousin", "Sam has", "Example", "hooded-secret"])
    assert.ok(!all.includes(secret), `${secret}: ${r.files.find((f) => (f.path + (f.text ?? "")).includes(secret))?.path}`);
});

test("the same note always gets the same address; a different secret gives a different one", () => {
  const again = exportWiki(notes, opts).files.filter((f) => f.path.startsWith("locked/")).map((f) => f.path);
  assert.deepEqual(again, lockedFiles.map((f) => f.path));
  const other = exportWiki(notes, { ...opts, lockSecret: "other" }).files.filter((f) => f.path.startsWith("locked/")).map((f) => f.path);
  assert.notDeepEqual(other, again);
});

test("a locked page: its sections, its name for each audience, and details for whoever they're for", () => {
  const hooded = r.lockedMenu.find((m) => m.title === "The Hooded Woman")!;
  const items = itemsOf(hooded.to);
  const secs = items.filter((i): i is LockedSection => i.kind !== "detail");
  assert.deepEqual(secs.map((s) => [s.aud, s.kind]), [["tam", "overview"], ["dm", "known"]]);
  const rowanTo = r.lockedMenu.find((m) => m.title === "Rowan")!.to;
  assert.ok(secs[0].md.includes("[Bran](wiki:people/bran)"));
  assert.match(secs[1].md, /!\[\]\(wiki:assets\/locked-[0-9a-f]{16}\.png\)/); // the picture's name is hidden too
  const det = items.filter((i): i is LockedDetail => i.kind === "detail").map((d) => `${d.aud}:${d.key}`);
  assert.deepEqual(det.sort(), ["dm:photo", "dm:player_say", "dm:player_title", "dm:title", "tam:photo", "tam:player_title", "tam:title"].sort());
  // Rowan's page links to the Hooded Woman's locked page
  const rowan = itemsOf(rowanTo).find((i): i is LockedSection => i.kind === "overview")!;
  assert.ok(rowan.md.includes(`[The Hooded Woman](wiki:${hooded.to})`));
});

test("locked pages' places in the menu: inside their place, one entry per audience", () => {
  const hooded = r.lockedMenu.filter((m) => m.title === "The Hooded Woman");
  assert.deepEqual(hooded.map((m) => m.aud).sort(), ["dm", "tam"]);
  assert.equal(hooded[0].menu, "people"); // Millbrook is a place, not in the People section
  const rowan = r.lockedMenu.filter((m) => m.title === "Rowan");
  assert.deepEqual(rowan.map((m) => m.aud).sort(), ["ivy", "tam"]);
});

test("details only some can see: taken off the page, and locked for them", () => {
  const bran = r.files.find((f) => f.path === "people/bran.md")!.text!;
  assert.ok(bran.includes("player_title: The miller"));
  assert.ok(!bran.includes("Missing") && !bran.includes("photo") && !bran.includes("wiki_visibility"));
  const det = itemsOf("people/bran").filter((i): i is LockedDetail => i.kind === "detail");
  assert.deepEqual(det.map((d) => [d.aud, d.key]), [["tam", "player_status"], ["dm", "photo"]]);
  assert.equal(det[0].value, "Missing");
  assert.match(String(det[1].value), /^assets\/locked-[0-9a-f]{16}\.png$/);
  // A public link to a locked page is plain text, so it doesn't give the page away: and here it's not even published
  assert.ok(!bran.includes("locked/"));
});

test("without passwords, nothing locked is published at all", () => {
  const plain = exportWiki(notes, { ...opts, audiences: undefined });
  assert.equal(plain.files.filter((f) => f.path.startsWith("locked/")).length, 0);
  assert.equal(plain.lockedMenu.length, 0);
  const bran = plain.files.find((f) => f.path === "people/bran.md")!.text!;
  assert.ok(!bran.includes("Missing"));
});
