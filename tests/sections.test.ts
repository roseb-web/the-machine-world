// Wiki sections: reading them, and moving them to the bottom of the note. Made-up names only.
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parse, stringify } from "yaml";
import { readSections, writeSections } from "../shared/sections";
import { extractPlayerNote, renderPlayerNote } from "../shared/extract";

const note = `---
tags: [npc]
---
# Bran

DM notes.

> [!player] Overview
> Flour on everything.

> [!danger] DM only
> He owes the guild.

> [!player] Session 2
> Met Ivy.

> [!player] Session 3
> Public.
> > [!danger] Secret
> > Not this.

More DM notes.
`;

test("reads the wiki sections, and leaves other callouts alone", () => {
  const s = readSections(note);
  assert.deepEqual(s.map((x) => [x.kind, x.title, x.vis, x.simple]), [
    ["overview", "", "everyone", true],
    ["known", "Session 2", "everyone", true],
    ["known", "Session 3", "everyone", false],
  ]);
});

test("saving moves them to the bottom, folded; DM callouts and tricky sections stay put", () => {
  const editable = readSections(note).filter((s) => s.simple);
  editable.push({ kind: "known", title: "Session 5", text: "A letter for Neri.", vis: "neri", simple: true });
  editable.push({ kind: "content", title: "The truth", text: "Works for the guild.", vis: "dm", simple: true });
  const out = writeSections(note, editable);
  assert.equal(
    out,
    `---
tags: [npc]
---
# Bran

DM notes.

> [!danger] DM only
> He owes the guild.

> [!player] Session 3
> Public.
> > [!danger] Secret
> > Not this.

More DM notes.

> [!player]- Overview
> Flour on everything.

> [!player]- Session 2
> Met Ivy.

> [!player-neri]- Session 5
> A letter for Neri.

> [!dm|content]- The truth
> Works for the guild.
`,
  );
  // Saving again changes nothing
  assert.equal(writeSections(out, readSections(out).filter((s) => s.simple)), out);
});

test("only everyone's sections are published; Content sits between Overview and What we know", () => {
  const n = `> [!player]- Overview\n> Hi.\n\n> [!player|content] The stars\n> | a | b |\n> |---|---|\n> | 1 | 2 |\n\n> [!player]- Session 1\n> Met.\n\n> [!player-neri]- Secret\n> For Neri.\n\n> [!dm]- Truth\n> DM.\n`;
  const p = extractPlayerNote("People/Bran.md", n, { parse, stringify })!;
  assert.equal(p.overview, "Hi.");
  assert.deepEqual(p.content, [{ label: "The stars", body: "| a | b |\n|---|---|\n| 1 | 2 |" }]);
  assert.deepEqual(p.entries, [{ label: "Session 1", body: "Met." }]);
  const md = renderPlayerNote(p, { parse, stringify });
  assert.ok(md.indexOf("## Overview") < md.indexOf("## The stars") && md.indexOf("## The stars") < md.indexOf("## What we know"));
  assert.ok(!md.includes("For Neri") && !md.includes("DM."));
});

test("a note with only a player-only or DM section isn't published", () => {
  assert.equal(extractPlayerNote("x.md", "> [!player-neri] Hi\n> Secret\n\n> [!dm] X\n> Y\n", { parse, stringify }), null);
});
