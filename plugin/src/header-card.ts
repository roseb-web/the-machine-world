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

export function renderHeaderCard(parent: HTMLElement, app: App, sourcePath: string, props: Record<string, unknown>, title: string) {
  const v = (k: string) => {
    const x = props[k];
    return typeof x === "string" && x.trim() ? x.trim() : undefined;
  };
  const card = parent.createDiv({ cls: "mw-nf-card" });
  const banner = resolveImage(app, v("banner"), sourcePath);
  if (banner) {
    const b = card.createDiv({ cls: "mw-nf-banner" });
    b.style.backgroundImage = `url("${app.vault.getResourcePath(banner)}")`;
    b.style.backgroundPosition = `center ${v("banner_focus") ?? "center"}`;
  }
  const body = card.createDiv({ cls: "mw-nf-card-body" });
  const photo = resolveImage(app, v("photo"), sourcePath);
  const sigil = photo ? null : resolveImage(app, v("player_sigil"), sourcePath);
  if (photo) body.createEl("img", { cls: "mw-nf-portrait", attr: { src: app.vault.getResourcePath(photo) } });
  else if (sigil) body.createEl("img", { cls: "mw-nf-sigil", attr: { src: app.vault.getResourcePath(sigil) } });
  const t = body.createDiv({ cls: "mw-nf-card-text" });
  t.createDiv({ cls: "mw-nf-card-title", text: title });
  if (v("player_say")) t.createDiv({ cls: "mw-nf-card-say", text: `Say it: ${v("player_say")}` });
  if (v("player_title")) t.createDiv({ cls: "mw-nf-card-sub", text: unlink(v("player_title")) });
  const chips = t.createDiv({ cls: "mw-nf-chips" });
  const chip = (text: string, tone?: string) => chips.createSpan({ cls: `mw-nf-chip ${tone ? `mw-tone-${tone}` : ""}`, text });
  if (v("player_faction")) chip(unlink(v("player_faction")));
  for (const k of ["player_type", "player_species", "player_status"]) if (v(k)) chip(unlink(v(k)));
  for (const [k, label] of [["player_favour", "Favour"], ["player_standing", "Standing"]]) if (v(k)) chip(`${label}: ${v(k)!.toLowerCase()}`, TONE[v(k)!.toLowerCase()] ?? "mid");
  if (v("player_seen")) t.createDiv({ cls: "mw-nf-card-seen", text: `Last seen: ${unlink(v("player_seen"))}` });
  if (photo && v("player_artist")) t.createDiv({ cls: "mw-nf-card-sub", text: `Art: ${v("player_artist")!.replace(/^\[([^\]]+)\]\(.*\)$/, "$1")}` });
  return card;
}
