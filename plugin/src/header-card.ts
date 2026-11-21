// The top of a wiki page, drawn in Obsidian: banner, portrait or symbol, name, subtitle, tags,
// "Last seen" and theme song. Used by the edit form's preview and by the Wiki preview.

import { App, TFile } from "obsidian";

const IMAGE = /\.(png|jpe?g|gif|webp|svg|avif)$/i;
const TONE: Record<string, string> = { grudge: "bad", hostile: "bad", enemy: "bad", cold: "low", wary: "low", shunned: "low", warm: "good", friendly: "good", noticed: "good", favoured: "best", allied: "best", chosen: "best" };
export const unlink = (v: unknown) => String(v ?? "").replace(/^!?\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]$/, "$1").trim();

export function resolveImage(app: App, value: unknown, sourcePath: string): TFile | null {
  const n = unlink(value);
  if (!n) return null;
  const direct = app.vault.getAbstractFileByPath(n);
  if (direct instanceof TFile) return IMAGE.test(direct.path) ? direct : null;
  const f = app.metadataCache.getFirstLinkpathDest(n, sourcePath);
  return f && IMAGE.test(f.path) ? f : null;
}

// vis: who can see each detail (wiki_visibility), to mark locked ones with a lock and who they're for
export function renderHeaderCard(parent: HTMLElement, app: App, sourcePath: string, props: Record<string, unknown>, title: string, vis: Record<string, string> = {}) {
  const v = (k: string) => {
    const x = props[k];
    return typeof x === "string" && x.trim() ? x.trim() : undefined;
  };
  const who = (k: string) => (vis[k] ? (vis[k] === "dm" ? "DM" : vis[k].charAt(0).toUpperCase() + vis[k].slice(1)) : "");
  // A locked detail's line gets a small "🔒 Name" after it
  const lock = (el: HTMLElement, k: string) => {
    if (vis[k]) el.createSpan({ cls: `mw-nf-lock ${vis[k] === "dm" ? "mw-dm" : ""}`, text: ` 🔒 ${who(k)}` });
    return el;
  };
  const card = parent.createDiv({ cls: "mw-nf-card" });
  const banner = resolveImage(app, v("banner"), sourcePath);
  if (banner) {
    const b = card.createDiv({ cls: "mw-nf-banner" });
    b.style.backgroundImage = `url("${app.vault.getResourcePath(banner)}")`;
    b.style.backgroundPosition = `center ${v("banner_focus") ?? "center"}`;
    if (vis.banner) b.createSpan({ cls: `mw-nf-lock-badge ${vis.banner === "dm" ? "mw-dm" : ""}`, text: `🔒 ${who("banner")}` });
  }
  const body = card.createDiv({ cls: "mw-nf-card-body" });
  const photo = resolveImage(app, v("photo"), sourcePath);
  const sigil = photo ? null : resolveImage(app, v("player_sigil"), sourcePath);
  const picture = (cls: string, f: TFile, k: string) => {
    const wrap = body.createDiv({ cls: "mw-nf-picture" });
    wrap.createEl("img", { cls, attr: { src: app.vault.getResourcePath(f) } });
    if (vis[k]) wrap.createSpan({ cls: `mw-nf-lock-badge ${vis[k] === "dm" ? "mw-dm" : ""}`, text: `🔒 ${who(k)}` });
  };
  if (photo) picture("mw-nf-portrait", photo, "photo");
  else if (sigil) picture("mw-nf-sigil", sigil, "player_sigil");
  const t = body.createDiv({ cls: "mw-nf-card-text" });
  t.createDiv({ cls: "mw-nf-card-title", text: title });
  if (v("player_say")) lock(t.createDiv({ cls: "mw-nf-card-say", text: `Say it: ${v("player_say")}` }), "player_say");
  if (v("player_title")) lock(t.createDiv({ cls: "mw-nf-card-sub", text: unlink(v("player_title")) }), "player_title");
  const chips = t.createDiv({ cls: "mw-nf-chips" });
  const chip = (k: string, text: string, tone?: string) =>
    chips.createSpan({ cls: `mw-nf-chip ${tone ? `mw-tone-${tone}` : ""} ${vis[k] ? (vis[k] === "dm" ? "mw-locked mw-dm" : "mw-locked") : ""}`, text: vis[k] ? `🔒 ${text} · ${who(k)}` : text });
  if (v("player_faction")) chip("player_faction", unlink(v("player_faction")));
  for (const k of ["player_type", "player_species", "player_status"]) if (v(k)) chip(k, unlink(v(k)));
  for (const [k, label] of [["player_favour", "Favour"], ["player_standing", "Standing"]]) if (v(k)) chip(k, `${label}: ${v(k)!.toLowerCase()}`, TONE[v(k)!.toLowerCase()] ?? "mid");
  if (v("player_seen")) lock(t.createDiv({ cls: "mw-nf-card-seen", text: `Last seen: ${unlink(v("player_seen"))}` }), "player_seen");
  if (photo && v("player_artist")) lock(t.createDiv({ cls: "mw-nf-card-sub", text: `Art: ${v("player_artist")!.replace(/^\[([^\]]+)\]\(.*\)$/, "$1")}` }), "player_artist");
  return card;
}
