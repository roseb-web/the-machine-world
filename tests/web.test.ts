// People web helpers. Made-up names only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { areaOf, cleanTies, groupName, parseRelation } from "../shared/web";

test("reads a tie with a type and strength", () => {
  assert.deepEqual(parseRelation("[[Tam Holloway]] | friend | close"), { target: "Tam Holloway", type: "friend", strength: "close" });
  assert.deepEqual(parseRelation("[[Tam Holloway|Tam]]"), { target: "Tam Holloway", type: "knows" });
  assert.deepEqual(parseRelation("Tam Holloway | rival"), { target: "Tam Holloway", type: "rival" });
  assert.equal(parseRelation(""), null);
});

test("group names come from links, aliases or plain text", () => {
  assert.equal(groupName("[[The Lantern Guild]]"), "The Lantern Guild");
  assert.equal(groupName("[[The Lantern Guild|Lanterns]]"), "Lanterns");
  assert.equal(groupName("Millbrook residents"), "Millbrook residents");
  assert.equal(groupName(""), null);
});

test("a person's place climbs up to their town", () => {
  const places: Record<string, { type?: string; in?: string }> = {
    "The Crooked Mug": { type: "Inn and tavern", in: "Millbrook" },
    Millbrook: { type: "Village", in: "The Fenlands" },
    "The Fenlands": { type: "Region" },
  };
  assert.equal(areaOf("The Crooked Mug", (n) => places[n]), "Millbrook");
  assert.equal(areaOf("Millbrook", (n) => places[n]), "Millbrook");
  assert.equal(areaOf(undefined, (n) => places[n]), undefined);
});

test("ties are tidied: unknown people dropped, a named tie beats 'knows'", () => {
  const people = ["a", "b", "c"].map((id) => ({ id, name: id, groups: [] }));
  const out = cleanTies(
    [
      { a: "a", b: "b", type: "knows" },
      { a: "b", b: "a", type: "friend" },
      { a: "a", b: "zz", type: "rival" },
      { a: "c", b: "c", type: "knows" },
    ],
    people,
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].type, "friend");
});
