// Builds a clean starter copy of this wiki for another DM: the same code, none of the content.
//
//   node starter/make-starter.mjs ../wiki-starter
//
// What it does:
// - Copies every file git knows about, except the published wiki (content/), the change log,
//   the tests and this starter folder.
// - Swaps in the plain versions in starter/files/: the plugin's starting settings, its name,
//   the theme, and a placeholder home page.
// - Gives the site a plain name, colours and fonts in quartz.config.yaml.
// - Builds the Obsidian plugin with the plain settings into obsidian-plugin/, ready to install.
// - Copies the guides in starter/docs/ into docs/.
// - Stops if anything that looks like this campaign is left in the copy.

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { parseDocument } from "yaml";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] ?? join(repo, "..", "wiki-starter"));
if (out === repo || out.startsWith(repo + "/")) throw new Error("Pick a folder outside this repo");

// The starting menu. "section" is a wiki section from the plugin's "Menu sections" setting;
// "page" is a single page. A section only shows once it has published pages.
const MENU = [
  { label: "Explore", items: [
    { title: "Home", page: "index" }, { title: "Maps", page: "maps" }, { title: "Calendar", page: "calendar" },
    { title: "Timeline", page: "timeline" }, { title: "Quest log", section: "quests" },
  ] },
  { label: "The world", items: [
    { title: "Places", section: "places" }, { title: "People", section: "people" }, { title: "People web", page: "people-web" },
    { title: "Factions", section: "factions" }, { title: "Lore", section: "lore" }, { title: "Gods", section: "gods" }, { title: "Items", section: "items" },
  ] },
  { label: "The party", items: [
    { title: "The party", section: "party" }, { title: "Handouts", page: "handouts" }, { title: "Gallery", page: "gallery" },
    { title: "Session recaps", section: "sessions" },
  ] },
];

const SKIP = [/^content\//, /^wiki-changes\.json$/, /^tests\//, /^starter\//, /^plugin\/package-lock\.json$/];
// Words that would give away this campaign. The copy must not contain any of them.
const GIVEAWAYS = /Vaharan|Machine World|roseb-web|the-machine-world/i;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// 1. Copy the code
const files = execFileSync("git", ["ls-files"], { cwd: repo, encoding: "utf8" }).split("\n").filter(Boolean);
let copied = 0;
for (const f of files) {
  if (SKIP.some((r) => r.test(f))) continue;
  mkdirSync(dirname(join(out, f)), { recursive: true });
  cpSync(join(repo, f), join(out, f));
  copied++;
}

// 2. The plain versions
const plain = join(repo, "starter", "files");
cpSync(plain, out, { recursive: true });

// 3. Names in descriptions and comments: "The Machine World" becomes a plain description
const TEXT = /\.(md|json|ts|tsx|mjs|css|scss|yaml|yml)$/;
const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (n === "node_modules" || n === ".git") return [];
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
for (const p of walk(out)) {
  if (!TEXT.test(p) || p.includes("/dist/")) continue;
  const s = readFileSync(p, "utf8");
  const t = s
    .replace(/Machine World Wiki/g, "Campaign Wiki")
    .replace(/The Machine World's/g, "the campaign's")
    .replace(/The Machine World/g, "the campaign")
    .replace(/Machine World components/g, "Campaign wiki components");
  if (t !== s) writeFileSync(p, t);
}

// 4. A plain site: name, address, fonts and colours
const cfgPath = join(out, "quartz.config.yaml");
const cfg = parseDocument(readFileSync(cfgPath, "utf8"));
cfg.setIn(["configuration", "pageTitle"], "My Campaign");
cfg.setIn(["configuration", "baseUrl"], "YOUR-GITHUB-NAME.github.io/YOUR-REPO-NAME");
cfg.setIn(["configuration", "theme", "typography"], cfg.createNode({
  header: { name: "Schibsted Grotesk", weights: [400, 700], includeItalic: false },
  body: "Source Sans Pro",
  code: "IBM Plex Mono",
}));
cfg.setIn(["configuration", "theme", "colors"], cfg.createNode({
  lightMode: { light: "#faf8f8", lightgray: "#e5e5e5", gray: "#b8b8b8", darkgray: "#4e4e4e", dark: "#2b2b2b", secondary: "#284b63", tertiary: "#84a59d", highlight: "rgba(143, 159, 169, 0.15)", textHighlight: "#fff23688" },
  darkMode: { light: "#161618", lightgray: "#393639", gray: "#646464", darkgray: "#d4d4d4", dark: "#ebebec", secondary: "#7b97aa", tertiary: "#84a59d", highlight: "rgba(143, 159, 169, 0.15)", textHighlight: "#b3aa0288" },
}));
const plugins = cfg.get("plugins");
for (const item of plugins.items) {
  if (item.get("source") === "@quartz-community/quartz-fonts") {
    item.set("options", cfg.createNode({ useThemeFonts: true, fontOrigin: "googleFonts" }));
  }
  // The menu, written out so it can be changed here rather than in the code
  if (item.get("source") === "./site-plugins/machine-world-components") {
    item.set("options", cfg.createNode({ groups: MENU }));
  }
}
writeFileSync(cfgPath, String(cfg));

// 5. The Obsidian plugin, built with the plain starting settings
const pluginOut = join(out, "obsidian-plugin");
mkdirSync(pluginOut, { recursive: true });
// Built from the copy (with its plain settings and names), using this repo's installed packages
await build({
  entryPoints: [join(out, "plugin", "src", "main.ts")],
  nodePaths: [join(repo, "node_modules"), join(repo, "plugin", "node_modules")],
  bundle: true,
  format: "cjs",
  target: "es2020",
  minify: true,
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*"],
  outfile: join(pluginOut, "main.js"),
  logLevel: "warning",
});
cpSync(join(out, "plugin", "styles.css"), join(pluginOut, "styles.css"));
cpSync(join(plain, "plugin", "manifest.json"), join(pluginOut, "manifest.json"));

// 6. The guides
const docs = join(repo, "starter", "docs");
if (existsSync(docs)) cpSync(docs, join(out, "docs"), { recursive: true });

// 7. Nothing of this campaign may be left (the built plugin included)
const left = walk(out).filter((p) => /\.(md|json|ts|tsx|mjs|js|css|scss|yaml|yml)$/.test(p) && GIVEAWAYS.test(readFileSync(p, "utf8")));
if (left.length) {
  console.error("Still mentions this campaign:\n" + left.map((p) => "  " + p.slice(out.length + 1)).join("\n"));
  process.exit(1);
}
console.log(`Starter made in ${out} (${copied} files copied).`);
