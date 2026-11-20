// The note form's Overview box. Made-up names only.
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { findOverview, playerCallouts, setOverview } from "../shared/overview";

const note = `---
player_title: The miller
---
# Bran

DM notes about Bran.

> [!player] Overview
> Flour on everything.
> Hums while he works.

> [!player] Session 2
> He owes Ivy money.
`;

test("finds the Overview and its text", () => {
  const o = findOverview(note)!;
  assert.equal(o.text, "Flour on everything.\nHums while he works.");
  assert.equal(o.simple, true);
  assert.equal(playerCallouts(note), 2);
});

test("changing it only touches its own lines", () => {
  const out = setOverview(note, "A new summary.");
  assert.equal(findOverview(out)!.text, "A new summary.");
  assert.ok(out.includes("DM notes about Bran."));
  assert.ok(out.includes("> [!player] Session 2\n> He owes Ivy money."));
  assert.ok(out.startsWith("---\nplayer_title: The miller\n---"));
});

test("a note without one gets it at the top, under the properties", () => {
  const plain = "---\ntags: [npc]\n---\n# Ivy\n\nSecret stuff.\n";
  const out = setOverview(plain, "Knows everyone.\n\nAnd their business.");
  assert.equal(out, "---\ntags: [npc]\n---\n\n> [!player] Overview\n> Knows everyone.\n>\n> And their business.\n\n# Ivy\n\nSecret stuff.\n");
  assert.equal(setOverview("No properties here.", "Hi"), "> [!player] Overview\n> Hi\n\nNo properties here.");
});

test("emptying it removes the callout, and nothing else", () => {
  const out = setOverview(note, "");
  assert.equal(findOverview(out), null);
  assert.ok(out.includes("DM notes about Bran.\n\n> [!player] Session 2"));
});

test("an Overview with a DM callout inside isn't touched", () => {
  const tricky = "> [!player] Overview\n> Public.\n> > [!danger] DM\n> > Secret.\n";
  assert.equal(findOverview(tricky)!.simple, false);
  assert.throws(() => setOverview(tricky, "New"));
});

test("Windows line endings are kept", () => {
  const out = setOverview("---\r\na: 1\r\n---\r\nText\r\n", "Hi");
  assert.ok(out.includes("\r\n> [!player] Overview\r\n> Hi\r\n"));
  assert.ok(!/[^\r]\n/.test(out));
});
