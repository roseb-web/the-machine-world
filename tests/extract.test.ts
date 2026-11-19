import { strict as assert } from "node:assert";
import { parse, stringify } from "yaml";
import { extractPlayerNote, renderPlayerNote } from "../shared/extract";
const yaml = { parse, stringify };

const pell = `---
tags: [npc, character]
where_now: "[[Thornwick]], under a false name"
status: "Alive"
company: "Hidden Society"
photo: "Art/NPCs/Pell.png"
player_title: Ink-stained traveller
player_species: Tiefling
player_favour: Warm
---
# Pell

Generic text: SECRET-GENERIC wants Old Hand writing.

> [!quote] Read aloud
> SECRET-FIRST-IMPRESSION grey-skinned tiefling.

> [!player] Overview
> A fast-talking tiefling who reads a little Old Hand.

> [!player] Session 4
> Rents a room at [[The Banked Fire]] as "Mr Penn".
> %% SECRET-COMMENT he is really Hidden Society %%

> [!danger] DM only
> SECRET-DM Reports to [[Secret Contact]].

> [!player]- Session 5
> Wrote the notice board note. Shipping out tonight.
> > [!danger] DM only
> > SECRET-NESTED his hand glows.
> Back in the player callout.
`;

const out = extractPlayerNote("4. People/NPCs/Pell.md", pell, yaml);
assert.ok(out, "Pell should be published");
const md = renderPlayerNote(out!, yaml);
console.log(md);

assert.ok(!md.includes("SECRET"), "No secret text gets through");
for (const k of ["status", "company", "where_now", "tags"]) assert.ok(!(k in out!.properties), `${k} dropped`);
assert.equal(out!.properties["player_favour"], "Warm");
assert.equal(out!.title, "Pell");
assert.equal(out!.overview, "A fast-talking tiefling who reads a little Old Hand.");
assert.deepEqual(out!.entries.map(e => e.label), ["Session 4", "Session 5"]);
assert.ok(md.includes("Back in the player callout."));

assert.equal(extractPlayerNote("x.md", "# No player info\n> [!danger] DM only\n> secret", yaml), null);

const example = "# Notes\n```markdown\n> [!player] Overview\n> Just an example.\n```\n";
assert.equal(extractPlayerNote("x.md", example, yaml), null, "Callouts inside code blocks are ignored");

const god =`---\nplayer_name: The Kindled\n---\n> [!player] Overview\n> The light that never goes out.`;
assert.equal(extractPlayerNote("Gods/Lucastra.md", god, yaml)!.title, "The Kindled");
console.log("All tests passed");
