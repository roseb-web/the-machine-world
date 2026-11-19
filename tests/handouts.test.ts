// Related handouts keep their real names for captions. Made-up names only.
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parse, stringify } from "yaml";
import { exportWiki } from "../shared/export";

test("handout captions keep the image's own name, and skip links that don't resolve", () => {
  const notes = [
    {
      path: "Places/Mill.md",
      text: `---\nplayer_handouts:\n  - "[[Old Tom's map.png]]"\n  - "[[Missing.png]]"\n  - "[[Note.png|A torn note]]"\n---\n# Mill\n\n> [!player] Overview\n> Hello.\n`,
    },
  ];
  const files = ["Places/Mill.md", "Handouts/Old Tom's map.png", "Handouts/Note.png"];
  const r = exportWiki(notes, {
    sections: [{ folder: "Places", section: "places" }],
    defaultSection: "misc",
    playerPagesFolder: "Player Pages",
    resolveLink: (l) => files.find((f) => f.endsWith("/" + l)) ?? null,
    yaml: { parse, stringify },
  });
  const fm = parse(r.files.find((f) => f.path === "places/mill.md")!.text!.match(/^---\n([\s\S]*?)\n---/)![1]);
  assert.deepEqual(fm.player_handouts, ["assets/old-toms-map.png", "assets/note.png"]);
  assert.deepEqual(fm.mw_handout_names, ["Old Tom's map", "A torn note"]);
});
