// The top of the wiki page, shown at the top of notes in Obsidian: banner, portrait, the name the
// party knows, subtitle and chips. Locked details have a lock and who they're for. Editing and reading
// view both get it. Only notes with a banner or wiki details: anything else looks the same as before.

import { App, MarkdownView, TFile } from "obsidian";
import { renderHeaderCard } from "./header-card";
import { readVisibility } from "../../shared/visibility";

// The details the card shows: a note with any of these gets one
const HEADER_KEYS = ["banner", "photo", "player_sigil", "player_name", "player_title", "player_say", "player_type", "player_species", "player_status", "player_faction", "player_seen", "player_favour", "player_standing"];

const has = (fm: Record<string, unknown>, k: string) => {
  const v = fm[k];
  return typeof v === "string" ? v.trim() !== "" : v !== undefined && v !== null;
};

export class NoteHeaders {
  private watchers = new Map<HTMLElement, MutationObserver>();

  constructor(
    private app: App,
    private enabled: () => boolean,
    private onEdit: (file: TFile) => void,
  ) {}

  // Every open note: add, update or take away its header
  refreshAll() {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      if (leaf.view instanceof MarkdownView) this.apply(leaf.view);
    }
  }

  // Just the notes showing this file (after its properties change)
  refreshFile(file: TFile) {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      if (leaf.view instanceof MarkdownView && leaf.view.file?.path === file.path) this.apply(leaf.view);
    }
  }

  remove() {
    for (const w of this.watchers.values()) w.disconnect();
    this.watchers.clear();
    document.querySelectorAll(".mw-note-header").forEach((el) => el.remove());
  }

  private apply(view: MarkdownView) {
    try {
      if (!view.containerEl) return; // a tab that hasn't loaded yet
      const file = view.file;
      const fm = (file && this.app.metadataCache.getFileCache(file)?.frontmatter) as Record<string, unknown> | undefined;
      const show = !!file && !!fm && this.enabled() && HEADER_KEYS.some((k) => has(fm, k));
      // Editing view and reading view each have their own place for it
      const places = [
        view.containerEl.querySelector<HTMLElement>(".markdown-source-view .cm-sizer"),
        view.containerEl.querySelector<HTMLElement>(".markdown-reading-view .markdown-preview-sizer"),
      ];
      for (const place of places) {
        if (!place) continue;
        if (!show) {
          this.unwatch(place);
          place.querySelector(":scope > .mw-note-header")?.remove();
          continue;
        }
        // The same file and the same details: nothing to redraw
        const sig = `${file!.path}\n${JSON.stringify(HEADER_KEYS.map((k) => fm![k]))}\n${JSON.stringify(fm!.wiki_visibility ?? null)}\n${JSON.stringify(fm!.banner_focus ?? null)}`;
        const old = place.querySelector<HTMLElement>(":scope > .mw-note-header");
        if (old?.dataset.sig === sig) continue;
        old?.remove();
        const header = createDiv({ cls: "mw-note-header" });
        header.dataset.sig = sig;
        const title = typeof fm!.player_name === "string" && fm!.player_name.trim() ? fm!.player_name.trim() : file!.basename;
        const card = renderHeaderCard(header, this.app, file!.path, fm!, title, readVisibility(fm));
        // The party knows it by its own name: Obsidian's title already says it
        if (title === file!.basename) card.querySelector(".mw-nf-card-title")?.remove();
        const edit = card.querySelector(".mw-nf-card-body")!.createEl("button", { cls: "mw-note-header-edit", text: "Edit details" });
        edit.addEventListener("click", () => this.onEdit(file!));
        // At the very top, before Obsidian's own title
        const before = place.querySelector(":scope > .inline-title, :scope > .mod-header, :scope > .metadata-container, :scope > .cm-contentContainer");
        place.insertBefore(header, before ?? place.firstChild);
        this.watch(place, view);
      }
    } catch (e) {
      console.error("Machine World Wiki: note header", e);
    }
  }

  // Obsidian redraws parts of a note now and then, and can drop the header: put it back
  private watch(place: HTMLElement, view: MarkdownView) {
    if (this.watchers.has(place)) return;
    let pending = false;
    const w = new MutationObserver(() => {
      if (pending || place.querySelector(":scope > .mw-note-header")) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        if (place.isConnected) this.apply(view);
        else this.unwatch(place);
      });
    });
    w.observe(place, { childList: true });
    this.watchers.set(place, w);
  }

  private unwatch(place: HTMLElement) {
    this.watchers.get(place)?.disconnect();
    this.watchers.delete(place);
  }
}
