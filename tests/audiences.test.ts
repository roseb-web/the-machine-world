// Audience views: locking and opening. Made-up names and passwords only.
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { audienceIndex, keyBytes, LockedSection, openSections, randomBytes, sealSections, signIn } from "../shared/audiences";

const salt = randomBytes(16);
const pw = { tam: "tam's long passphrase", ivy: "ivy's other passphrase", dm: "the dm's passphrase" };
const sections: LockedSection[] = [
  { id: 0, aud: "tam", name: "Tam", kind: "known", title: "Session 5", md: "A letter for Tam." },
  { id: 1, aud: "ivy", name: "Ivy", kind: "content", title: "", md: "Ivy's secret." },
  { id: 2, aud: "dm", name: "DM", kind: "content", title: "The truth", md: "For the DM." },
];

test("each audience opens only its own sections; the DM opens all", async () => {
  const keys = new Map<string, Uint8Array>();
  for (const [a, p] of Object.entries(pw)) keys.set(a, await keyBytes(p, salt, 1000));
  const sealed = await sealSections(sections, keys);
  const json = JSON.stringify(sealed);
  for (const secret of ["letter", "secret", "truth", "Tam", "Ivy", "tam", "ivy"]) assert.ok(!json.includes(secret), `"${secret}" is visible`);

  const ids = async (who: keyof typeof pw) => (await openSections(sealed, keys.get(who)!)).map((s) => s.id).sort();
  assert.deepEqual(await ids("tam"), [0]);
  assert.deepEqual(await ids("ivy"), [1]);
  assert.deepEqual(await ids("dm"), [0, 1, 2]);
  const wrong = await keyBytes("a guess", salt, 1000);
  assert.deepEqual(await openSections(sealed, wrong), []);
});

test("signing in finds who the password belongs to, without names in the file", async () => {
  const keys = new Map<string, Uint8Array>();
  for (const [a, p] of Object.entries(pw)) keys.set(a, await keyBytes(p, salt, 1000));
  const index = { ...(await audienceIndex(salt, keys, new Map([["tam", "Tam"], ["ivy", "Ivy"], ["dm", "DM"]]))), iterations: 1000 };
  assert.ok(!JSON.stringify(index).includes("Tam"));
  assert.equal((await signIn(pw.ivy, index))?.name, "Ivy");
  assert.equal((await signIn(pw.dm, index))?.aud, "dm");
  assert.equal(await signIn("nope", index), null);
});

test("a section nobody has a password for isn't published at all", async () => {
  const keys = new Map([["tam", await keyBytes("x", salt, 1000)]]);
  const sealed = await sealSections([{ id: 0, aud: "ivy", name: "Ivy", kind: "known", title: "", md: "hidden" }], keys);
  assert.deepEqual(sealed, []);
});

// ---- Publishing: markers on the page, the text kept aside, nothing readable in the files ----
import { parse, stringify } from "yaml";
import { exportWiki } from "../shared/export";

const bran = `---
player_title: The miller
---
DM notes.

> [!player]- Overview
> Flour on everything.

> [!player]- Session 2
> Met [[Ivy]].

> [!player-tam]- Session 3
> A letter for Tam, about [[Ivy]] and [[Secret Place]].

> [!dm|content]- The truth
> Works for the guild.

> [!player-ivy]- Hers
> Ivy has no password, so this stays out.
`;
const notes = [
  { path: "People/Bran.md", text: bran },
  { path: "People/Ivy.md", text: "> [!player] Overview\n> A weaver.\n" },
  { path: "Places/Secret Place.md", text: "DM only.\n" },
  { path: "People/Only Tam.md", text: "> [!player-tam] Hi\n> Only Tam knows.\n" },
];
const paths = notes.map((n) => n.path);
const r = exportWiki(notes, {
  sections: [{ folder: "People", section: "people" }, { folder: "Places", section: "places" }],
  defaultSection: "misc",
  playerPagesFolder: "Player Pages",
  audiences: { tam: "Tam", dm: "DM" },
  resolveLink: (l) => paths.find((p) => p.endsWith(`/${l}.md`)) ?? null,
  yaml: { parse, stringify },
});

test("publishing puts markers where locked sections go, and no locked text in any file", () => {
  const page = r.files.find((f) => f.path === "people/bran.md")!.text!;
  const all = r.files.map((f) => f.text ?? "").join("\n");
  for (const secret of ["letter", "truth", "guild", "Hers", "stays out"]) assert.ok(!all.includes(secret), `"${secret}" leaked`);
  // The DM's Content section goes before "What we know"; Tam's entry after Session 2
  const truth = page.indexOf('data-mw-lock="1"');
  const known = page.indexOf("## What we know");
  const s2 = page.indexOf("### Session 2");
  const tam = page.indexOf('data-mw-lock="0"');
  assert.ok(truth > 0 && truth < known && s2 < tam, page);
  assert.ok(!r.files.some((f) => f.path.includes("only-tam")), "a note with nothing for everyone isn't a page yet");
});

test("locked sections: links point at wiki pages; unpublished ones become plain text; no-password audiences are left out", () => {
  const sections = r.locked.find((l) => l.page === "people/bran")!.sections;
  assert.deepEqual(sections.map((s) => s.aud), ["tam", "dm"]);
  assert.equal(sections[0].md, "A letter for Tam, about [Ivy](wiki:people/ivy) and Secret Place.");
  assert.equal(sections[1].kind, "content");
  assert.equal(sections[1].name, "DM");
});
