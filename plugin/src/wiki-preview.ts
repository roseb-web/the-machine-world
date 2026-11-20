// "Wiki preview": a third way to look at a note, next to editing and reading.
// The 🌐 button at the top of a note switches the same tab to this view, and "Back to the note"
// switches back. It shows the page the way the wiki will, using the same rules as publishing.
// "Show hidden" adds everything that stays private, in red boxes, with the reason.
// Warnings: links that turn into plain text, and names the party doesn't know.

import { Component, ItemView, MarkdownRenderer, parseYaml, stringifyYaml, TFile, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { extractPlayerNote, isAllowedProperty } from "../../shared/extract";
import { noteParts, secretNames } from "../../shared/preview";
import { renderHeaderCard } from "./header-card";
import type MachineWorldWiki from "./main";

export const PREVIEW_VIEW = "machine-world-wiki-preview";
const YAML = { parse: parseYaml, stringify: stringifyYaml };
const CALLOUT_NAMES: Record<string, string> = { danger: "DM callout", note: "Note callout", info: "Info callout", tip: "Tip callout", quote: "Quote" };

export class WikiPreviewView extends ItemView {
  file: TFile | null = null;
  private showHidden = false;
  private mode = "source"; // the note's own mode, to go back to
  private timer = 0;
  private renderers: Component | null = null;

  constructor(leaf: WorkspaceLeaf, private plugin: MachineWorldWiki) {
    super(leaf);
  }
  getViewType() {
    return PREVIEW_VIEW;
  }
  getDisplayText() {
    return this.file ? `${this.file.basename} · wiki` : "Wiki preview";
  }
  getIcon() {
    return "globe";
  }

  async setState(state: { file?: string; hidden?: boolean; mode?: string }, result: ViewStateResult) {
    const f = state.file ? this.app.vault.getAbstractFileByPath(state.file) : null;
    this.file = f instanceof TFile ? f : null;
    if (typeof state.hidden === "boolean") this.showHidden = state.hidden;
    if (state.mode) this.mode = state.mode;
    await this.render();
    return super.setState(state, result);
  }
  getState() {
    return { file: this.file?.path, hidden: this.showHidden, mode: this.mode };
  }

  async onOpen() {
    this.addAction("file-text", "Back to the note", () => this.back());
    this.addAction("scroll-text", "Edit wiki details", () => this.file && this.plugin.editDetails(this.file));
    // Changes to this note (or its properties) redraw the preview
    const later = () => {
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => this.render(), 300);
    };
    this.registerEvent(this.app.vault.on("modify", (f) => f === this.file && later()));
    this.registerEvent(this.app.metadataCache.on("changed", (f) => f === this.file && later()));
    this.registerEvent(this.app.vault.on("rename", (f) => f === this.file && later()));
  }
  async onClose() {
    this.renderers?.unload();
  }

  back() {
    if (this.file) this.leaf.setViewState({ type: "markdown", state: { file: this.file.path, mode: this.mode } });
  }

  private async render() {
    const root = this.contentEl;
    root.empty();
    root.addClass("mw-wp");
    this.renderers?.unload();
    this.renderers = new Component();
    this.renderers.load();
    const file = this.file;
    if (!file) {
      root.createDiv({ cls: "mw-wp-empty", text: "No note to preview." });
      return;
    }
    const text = await this.app.vault.cachedRead(file);
    const fm = (this.app.metadataCache.getFileCache(file)?.frontmatter ?? {}) as Record<string, unknown>;
    const s = this.plugin.settings;
    const wholePage = file.path.startsWith(s.playerPagesFolder + "/");
    const player = wholePage ? null : extractPlayerNote(file.path, text, YAML);
    const onWiki = wholePage || !!player;

    // ---- The bar: player view / show hidden ----
    const bar = root.createDiv({ cls: "mw-wp-bar" });
    const seg = bar.createDiv({ cls: "mw-wp-seg" });
    for (const [label, hidden] of [["Player view", false], ["Show hidden", true]] as const) {
      const b = seg.createEl("button", { text: label, cls: this.showHidden === hidden ? "mw-on" : "" });
      b.addEventListener("click", () => {
        this.showHidden = hidden;
        this.app.workspace.requestSaveLayout();
        this.render();
      });
    }
    bar.createSpan({
      cls: `mw-wp-status ${onWiki ? "mw-yes" : "mw-no"}`,
      text: onWiki ? (wholePage ? "✓ On the wiki (a Player Page: published whole)" : "✓ On the wiki") : "Not on the wiki: it has no player callout",
    });

    const page = root.createDiv({ cls: "mw-wp-page" });
    // Links in the preview open their note, like in reading view
    page.addEventListener("click", (ev) => {
      const a = (ev.target as HTMLElement).closest("a.internal-link") as HTMLAnchorElement | null;
      if (!a) return;
      ev.preventDefault();
      this.app.workspace.openLinkText(a.getAttribute("data-href") ?? a.getAttribute("href") ?? "", file.path, ev.ctrlKey || ev.metaKey);
    });
    const warnings: string[] = [];
    const published = await this.plugin.publishedNotes();
    const secrets = this.plugin.secretNames();

    // Player text: links to unpublished notes become plain text, just like publishing
    const playerText = async (md: string, el: HTMLElement) => {
      for (const n of secretNames(md, secrets)) warnings.push(`Mentions "${n.name}": the party knows them as "${n.known}".`);
      const fixed = md.replace(/(!?)\[\[([^\]|#]*)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g, (all, bang: string, target: string, _h, alias?: string) => {
        const dest = target ? this.app.metadataCache.getFirstLinkpathDest(target, file.path) : null;
        if (bang) {
          if (dest && /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(dest.path)) return all;
          warnings.push(`The embed "${target}" isn't shown on the wiki.`);
          return "";
        }
        if (dest && published.has(dest.path)) return all;
        warnings.push(`"${alias ?? target}" links to ${dest ? "a note that isn't on the wiki" : "a note that doesn't exist"}, so it shows as plain text.`);
        return alias ?? target;
      });
      await MarkdownRenderer.render(this.app, fixed, el, file.path, this.renderers!);
    };
    const hidden = async (label: string, md: string, why: string) => {
      const box = page.createDiv({ cls: "mw-wp-hidden" });
      const head = box.createDiv({ cls: "mw-wp-hidden-label", text: `🔒 ${label}` });
      head.createSpan({ cls: "mw-wp-hidden-why", text: ` · ${why}` });
      if (md) await MarkdownRenderer.render(this.app, md, box.createDiv(), file.path, this.renderers!);
    };

    if (this.showHidden) {
      const secretProps = Object.keys(fm).filter((k) => !isAllowedProperty(k) && k !== "position");
      if (secretProps.length) {
        const box = page.createDiv({ cls: "mw-wp-hidden" });
        box.createDiv({ cls: "mw-wp-hidden-label", text: "🔒 Properties, never published" });
        box.createDiv({ text: secretProps.join(" · ") });
      }
    }

    // ---- The header ----
    const props = wholePage ? fm : (player?.properties ?? {});
    const title = wholePage ? (typeof fm.title === "string" ? fm.title : file.basename) : (player?.title ?? file.basename);
    if (onWiki || this.showHidden) renderHeaderCard(page, this.app, file.path, props, title);
    if (typeof props.spotify === "string" && props.spotify) page.createDiv({ cls: "mw-nf-song", text: "▶  Theme song: Spotify's player, under the header" });

    // ---- The page ----
    if (wholePage) {
      await playerText(text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, ""), page.createDiv({ cls: "mw-wp-md" }));
    } else if (!this.showHidden) {
      if (!player) {
        page.createDiv({ cls: "mw-wp-empty", text: "This note isn't on the wiki. Write an Overview with the scroll button (or add a > [!player] callout) to put it there." });
      } else {
        if (player.overview) {
          page.createEl("h2", { text: "Overview" });
          await playerText(player.overview, page.createDiv({ cls: "mw-wp-md" }));
        }
        if (player.entries.length) {
          page.createEl("h2", { text: "What we know" });
          for (const e of player.entries) {
            if (e.label) page.createEl("h3", { text: e.label });
            await playerText(e.body, page.createDiv({ cls: "mw-wp-md" }));
          }
        }
      }
    } else {
      // In the note's own order, with the private parts shown
      for (const part of noteParts(text)) {
        if (part.kind === "player") {
          const lbl = page.createDiv({ cls: "mw-wp-pub-label", text: `✓ Published${part.title ? ` · ${part.title.toLowerCase() === "overview" ? "Overview" : `under "What we know" as "${part.title}"`}` : ""}` });
          if (part.hasHidden) lbl.createSpan({ cls: "mw-wp-hidden-why", text: " · a callout inside it is left out" });
          await playerText(withoutNested(part.text), page.createDiv({ cls: "mw-wp-md" }));
        } else if (part.kind === "callout") {
          await hidden(`${CALLOUT_NAMES[part.type] ?? `"${part.type}" callout`}${part.title ? `: ${part.title}` : ""}`, part.text, "only [!player] callouts are published");
        } else if (part.kind === "comment") {
          await hidden("Comment", part.text, "%% comments %% are never published");
        } else {
          await hidden("Normal text", part.text, "text outside player callouts is never published");
        }
      }
    }

    if (warnings.length) {
      const w = root.createDiv({ cls: "mw-wp-warnings" });
      for (const msg of [...new Set(warnings)]) w.createDiv({ cls: "mw-wp-warning", text: `⚠ ${msg}` });
    }
  }
}

// A player callout's text without any other callout inside it (publishing leaves those out)
function withoutNested(text: string): string {
  const out: string[] = [];
  let skipping = false;
  for (const line of text.split("\n")) {
    const nested = line.match(/^>\s*\[!(\w[\w-]*)\]/i);
    if (nested) {
      skipping = nested[1].toLowerCase() !== "player";
      continue;
    }
    if (skipping && line.startsWith(">")) continue;
    skipping = false;
    out.push(line);
  }
  return out.join("\n");
}
