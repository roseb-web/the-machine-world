// Pinterest: board and section links, paging, and moodboards in the export. Made-up data.
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parse, stringify } from "yaml";
import { boardKey, fetchMoodboards, parseBoardUrl, PinterestAuthError } from "../shared/pinterest";
import { exportWiki } from "../shared/export";

const pin = (id: string) => ({ id, alt_text: `Pin ${id}`, media: { images: { "600x": { url: `https://i.example/600/${id}.jpg`, width: 600, height: 800 }, "1200x": { url: `https://i.example/1200/${id}.jpg`, width: 1200, height: 1600 } } } });
const api: Record<string, unknown> = {
  "/boards?page_size=100": { items: [{ id: "B1", name: "Grey Harbour", owner: { username: "someone" } }], bookmark: null },
  "/boards/B1/sections?page_size=100": { items: [{ id: "S1", name: "The Old Mill" }], bookmark: null },
  "/boards/B1/sections/S1/pins?page_size=100": { items: [pin("1"), pin("2")], bookmark: "next" },
  "/boards/B1/sections/S1/pins?page_size=100&bookmark=next": { items: [pin("3")], bookmark: null },
  "/boards/B1/pins?page_size=100": { items: [pin("9")], bookmark: null },
};
const get = async (url: string) => {
  const path = url.replace("https://api.pinterest.com/v5", "");
  return path in api ? { status: 200, json: api[path] } : { status: 404, json: {} };
};

test("board links are understood, with or without a section", () => {
  assert.deepEqual(parseBoardUrl("https://uk.pinterest.com/someone/grey-harbour/the-old-mill/"), { user: "someone", board: "grey-harbour", section: "the-old-mill" });
  assert.deepEqual(parseBoardUrl("https://www.pinterest.com/someone/grey-harbour"), { user: "someone", board: "grey-harbour" });
  assert.equal(parseBoardUrl("https://www.pinterest.com/pin/12345/"), null);
});

test("pins come from the section, across pages", async () => {
  const url = "https://www.pinterest.com/someone/grey-harbour/the-old-mill/";
  const r = await fetchMoodboards(get, [url, "https://www.pinterest.com/someone/grey-harbour/"]);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.boards[boardKey(url)].map((p) => p.pin), ["https://www.pinterest.com/pin/1/", "https://www.pinterest.com/pin/2/", "https://www.pinterest.com/pin/3/"]);
  assert.equal(r.boards[boardKey("https://www.pinterest.com/someone/grey-harbour/")].length, 1);
});

test("a missing section is reported, not fatal", async () => {
  const r = await fetchMoodboards(get, ["https://www.pinterest.com/someone/grey-harbour/nowhere/"]);
  assert.equal(r.errors.length, 1);
});

test("an expired token stops the fetch with a clear message", async () => {
  await assert.rejects(() => fetchMoodboards(async () => ({ status: 401, json: {} }), ["https://www.pinterest.com/a/b/"]), PinterestAuthError);
});

test("the export adds the moodboard to pages with a pinterest link", () => {
  const url = "https://www.pinterest.com/someone/grey-harbour/the-old-mill/";
  const r = exportWiki(
    [{ path: "Places/Mill.md", text: `---\npinterest: ${url}\n---\n# Mill\n\n> [!player] Overview\n> Hello.\n` }],
    {
      sections: [{ folder: "Places", section: "places" }],
      defaultSection: "misc",
      playerPagesFolder: "Player Pages",
      resolveLink: () => null,
      yaml: { parse, stringify },
      moodboards: { [boardKey(url)]: [{ img: "a", big: "b", w: 1, h: 2, pin: "p" }] },
    },
  );
  const fm = parse(r.files.find((f) => f.path === "places/mill.md")!.text!.match(/^---\n([\s\S]*?)\n---/)![1]);
  assert.equal(fm.pinterest, url);
  assert.deepEqual(fm.mw_moodboard, [{ img: "a", big: "b", w: 1, h: 2, pin: "p" }]);
});
