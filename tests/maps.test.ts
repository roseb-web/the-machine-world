// Map pins: only published, never secret, no DM descriptions. Made-up names only.
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parse, stringify } from "yaml";
import { exportWiki } from "../shared/export";

const card = (props: string) => `---\n${props}\n---\n# X\n\n> [!player] Overview\n> Hello.\n`;
const notes = [
  { path: "Places/Millbrook.md", text: card("player_type: Village") },
  { path: "Places/Hidden Lab.md", text: "# Hidden Lab\nDM only." },
  { path: "Places/Old Keep.md", text: card("player_type: Ruin") },
  {
    path: "Maps/World - Places.md",
    text: "# World\n```leaflet\nid: world\nimage: [[World.jpg]]\nminZoom: -2\nmaxZoom: 1\ndefaultZoom: -1\nmarker: town, -100, 200, [[Millbrook]], SECRET-DESC\nmarker: ruin, -50, 60, [[Hidden Lab]]\nmarker: secret, -10, 20, [[Old Keep]]\n```\n",
  },
  {
    path: "Maps/Millbrook - Party Map.md",
    text: "---\nparty_map: true\n---\n```leaflet\nimage: [[Millbrook Map.png]]\nmarker: inn, -10, 10, [[Millbrook]], The village itself\nmarker: shop, -20, 30, [[Hidden Lab]], The bakery\nmarker: well, -5, 5, , The old well\n```\n",
  },
  { path: "Player Pages/Maps.md", text: "# Maps\n\n![[World - Places|World]]\n![[Millbrook - Party Map|Millbrook]]\n" },
];
const all = [...notes.map((n) => n.path), "Maps/World.jpg", "Maps/Millbrook Map.png"];
const resolveLink = (l: string) => all.find((p) => p.split("/").pop()!.replace(/\.md$/, "") === l || p.split("/").pop() === l) ?? null;
const r = exportWiki(notes, {
  sections: [{ folder: "Places", section: "places" }],
  defaultSection: "misc",
  playerPagesFolder: "Player Pages",
  resolveLink,
  yaml: { parse, stringify },
});
const page = r.files.find((f) => f.path === "maps.md")!.text!;
const maps = parse(page.match(/^---\n([\s\S]*?)\n---/)![1]).mw_maps;
const everything = r.files.map((f) => f.path + (f.text ?? "")).join("\n");

test("DM map keeps only published, non-secret pins, without descriptions", () => {
  assert.equal(maps[0].title, "World");
  assert.equal(maps[0].image, "assets/world.jpg");
  assert.deepEqual(maps[0].pins, [{ type: "town", lat: -100, lng: 200, title: "Millbrook", page: "places/millbrook" }]);
  assert.equal(maps[0].minZoom, -2);
});

test("party map keeps every pin and its description, unpublished links as plain text", () => {
  const pins = maps[1].pins;
  assert.equal(pins.length, 3);
  assert.deepEqual(pins[0], { type: "inn", lat: -10, lng: 10, title: "Millbrook", page: "places/millbrook", text: "The village itself" });
  assert.deepEqual(pins[1], { type: "shop", lat: -20, lng: 30, title: "Hidden Lab", text: "The bakery" });
  assert.equal(pins[2].title, "The old well");
});

test("nothing from the DM map leaks", () => {
  assert.ok(!everything.includes("SECRET-DESC"));
  assert.ok(!everything.includes("World - Places"));
  assert.ok(!page.includes("![["));
});

test("a party map isn't published as a page of its own", () => {
  assert.ok(!r.files.some((f) => /millbrook-party-map/.test(f.path)));
});

test("map images are copied", () => {
  assert.ok(r.files.some((f) => f.path === "assets/world.jpg" && f.copyFrom === "Maps/World.jpg"));
});
