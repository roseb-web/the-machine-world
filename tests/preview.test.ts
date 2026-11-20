// Wiki preview: labelling what's published and what isn't. Made-up names only.
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { linksIn, noteParts, secretNames } from "../shared/preview";

const note = `---
where_now: the cellar
---
# Bran

DM notes. %% a reminder %% More notes.

> [!player] Overview
> Flour on everything.

> [!danger] DM only
> He owes the guild.

> [!player] Session 2
> Met [[Ivy Marsh|Ivy]].
> > [!danger] Secret
> > Not this.
`;

test("splits a note into published and private parts, in order", () => {
  const p = noteParts(note);
  assert.deepEqual(p.map((x) => x.kind), ["text", "comment", "text", "player", "callout", "player"]);
  assert.equal(p[1].text, "a reminder");
  assert.equal((p[3] as { title: string }).title, "Overview");
  assert.equal((p[4] as { type: string }).type, "danger");
  assert.equal((p[5] as { hasHidden: boolean }).hasHidden, true);
  assert.equal((p[3] as { hasHidden: boolean }).hasHidden, false);
});

test("a callout written inside a code block is just text", () => {
  const p = noteParts("```\n> [!player] Example\n> text\n```\n");
  assert.deepEqual(p.map((x) => x.kind), ["text"]);
});

test("finds links and what they show", () => {
  assert.deepEqual(linksIn("See [[Ivy Marsh|Ivy]] and ![[map.png]] and [[Old Tam#Past]]"), [
    { target: "Ivy Marsh", shown: "Ivy", embed: false },
    { target: "map.png", shown: "map.png", embed: true },
    { target: "Old Tam", shown: "Old Tam", embed: false },
  ]);
});

test("spots names the party doesn't know", () => {
  const secret = new Map([["Rowan", "The Grey Lady"], ["Tam", "Tam"]]);
  assert.deepEqual(secretNames("Rowan was at the mill.", secret), [{ name: "Rowan", known: "The Grey Lady" }]);
  assert.deepEqual(secretNames("Rowanberry jam.", secret), []);
  assert.deepEqual(secretNames("We met [[Rowan|the lady in grey]].", secret), []);
});
