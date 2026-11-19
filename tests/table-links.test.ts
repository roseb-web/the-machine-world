// Links inside tables: the "|" in [[page|name]] must be written "\|", or it starts a new column.
// Made-up names only.
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parse, stringify } from "yaml";
import { exportWiki } from "../shared/export";

const card = (body: string) => `---\nplayer_type: Town\n---\n# X\n\n> [!player] Overview\n${body}\n`;
const notes = [
  { path: "Places/Oakhollow.md", text: card("> A town.") },
  {
    path: "Lore/Stars.md",
    text: card(
      [
        "> | Star | Seen from |",
        "> | --- | --- |",
        "> | Ash | [[Oakhollow]] |",
        "> | Elm | [[Oakhollow\\|the town]] farms |",
        "> | Fir | [[Hidden Place]] |",
        ">",
        "> Outside a table: [[Oakhollow]].",
      ].join("\n"),
    ),
  },
];
const resolveLink = (l: string) => notes.map((n) => n.path).find((p) => p.endsWith(`/${l}.md`)) ?? null;
const r = exportWiki(notes, {
  sections: [{ folder: "Places", section: "places" }, { folder: "Lore", section: "lore" }],
  defaultSection: "misc",
  playerPagesFolder: "Player Pages",
  resolveLink,
  yaml: { parse, stringify },
});
const page = r.files.find((f) => f.path === "lore/stars.md")!.text!;

test("links in table rows use \\| so the table keeps its columns", () => {
  assert.ok(page.includes("| Ash | [[places/oakhollow\\|Oakhollow]] |"), page);
  assert.ok(page.includes("| Elm | [[places/oakhollow\\|the town]] farms |"), page);
  assert.ok(page.includes("| Fir | Hidden Place |"), page);
});

test("links outside tables are unchanged", () => {
  assert.ok(page.includes("Outside a table: [[places/oakhollow|Oakhollow]]."), page);
});
