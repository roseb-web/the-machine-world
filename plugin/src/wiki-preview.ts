// "Wiki preview": a third way to look at a note, next to editing and reading.
// The globe button at the top of a note switches the same tab here; "Back to the note" switches back.
//
// - Player view: the page the way the wiki shows it, using the same rules as publishing.
// - View as: Everyone (what's on the wiki), one player, or the DM. Only the note's wiki sections
//   are ever shown: the rest of the note (your own notes and callouts) never goes on the wiki.
// - Edit: the note's wiki sections as cards (Overview, Content, What we know), each with who can
//   see it (everyone, one player, or the DM). Saves as you type, as folded callouts at the bottom
//   of the note. Your own callouts (like [!danger] DM only) are never touched.
// Warnings: links that turn into plain text, and names the party doesn't know.

import { App, Component, ItemView, MarkdownRenderer, parseYaml, stringifyYaml, TFile, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { extractPlayerNote } from "../../shared/extract";
import { secretNames } from "../../shared/preview";
import { Kind, readSections, WikiSection, writeSections } from "../../shared/sections";
import { renderHeaderCard } from "./header-card";
import type MachineWorldWiki from "./main";

export const PREVIEW_VIEW = "machine-world-wiki-preview";
const YAML = { parse: parseYaml, stringify: stringifyYaml };
type Mode = string; // "everyone", a player's name ("tam"), "dm", or "edit"
const KINDS: [Kind, string][] = [["overview", "Overview"], ["content", "Content"], ["known", "What we know"]];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export class WikiPreviewView extends ItemView {
  file: TFile | null = null;
  private view: Mode = "everyone";
  private mode = "source"; // the note's own mode, to go back to
  private timer = 0;
  private saveTimer = 0;
  private renderers: Component | null = null;
  private sections: WikiSection[] = []; // Edit: the editable sections, in order
  private savedEl: HTMLElement | null = null;

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

  async setState(state: { file?: string; view?: Mode; hidden?: boolean; mode?: string }, result: ViewStateResult) {
    const f = state.file ? this.app.vault.getAbstractFileByPath(state.file) : null;
    this.file = f instanceof TFile ? f : null;
    if (state.view) this.view = state.view === "player" || state.view === "hidden" ? "everyone" : state.view;
    if (state.mode) this.mode = state.mode;
    await this.render();
    return super.setState(state, result);
  }
  getState() {
    return { file: this.file?.path, view: this.view, mode: this.mode };
  }

  async onOpen() {
    this.addAction("file-text", "Back to the note", () => this.back());
    this.addAction("scroll-text", "Edit wiki details", () => this.file && this.plugin.editDetails(this.file));
    // Changes to this note redraw the preview (not while editing here: that's our own saving)
    const later = () => {
      if (this.view === "edit") return;
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => this.render(), 300);
    };
    this.registerEvent(this.app.vault.on("modify", (f) => f === this.file && later()));
    this.registerEvent(this.app.metadataCache.on("changed", (f) => f === this.file && later()));
    this.registerEvent(this.app.vault.on("rename", (f) => f === this.file && later()));
  }
  async onClose() {
    await this.flush();
    this.renderers?.unload();
  }

  async back() {
    await this.flush();
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

    // ---- The bar ----
    const bar = root.createDiv({ cls: "mw-wp-bar" });
    // View as: everyone, each player, or the DM. Then Edit.
    const pcs = this.plugin.partyNames();
    if (this.view !== "edit" && this.view !== "everyone" && this.view !== "dm" && !pcs.includes(this.view)) this.view = "everyone";
    bar.createSpan({ cls: "mw-wp-label", text: "View as" });
    const seg = bar.createDiv({ cls: "mw-wp-seg" });
    const modes: [string, string][] = [["Everyone", "everyone"], ...pcs.map((p): [string, string] => [cap(p), p]), ["DM", "dm"]];
    const editSeg = bar.createDiv({ cls: "mw-wp-seg" });
    for (const [label, v] of [...modes, ["Edit", "edit"] as [string, string]]) {
      const b = (v === "edit" ? editSeg : seg).createEl("button", { text: label, cls: this.view === v ? "mw-on" : "" });
      b.addEventListener("click", async () => {
        await this.flush();
        this.view = v;
        this.app.workspace.requestSaveLayout();
        this.render();
      });
    }
    bar.createSpan({
      cls: `mw-wp-status ${onWiki ? "mw-yes" : "mw-no"}`,
      text: onWiki ? (wholePage ? "✓ On the wiki (a Player Page: published whole)" : "✓ On the wiki") : "Not on the wiki: nothing for everyone yet",
    });
    this.savedEl = this.view === "edit" ? bar.createSpan({ cls: "mw-wp-saved" }) : null;

    const page = root.createDiv({ cls: "mw-wp-page" });
    // Links in the preview open their note, like in reading view
    page.addEventListener("click", (ev) => {
      const a = (ev.target as HTMLElement).closest("a.internal-link") as HTMLAnchorElement | null;
      if (!a) return;
      ev.preventDefault();
      this.app.workspace.openLinkText(a.getAttribute("data-href") ?? a.getAttribute("href") ?? "", file.path, ev.ctrlKey || ev.metaKey);
    });

    if (this.view === "edit") {
      this.drawEditor(page, text, fm, wholePage);
      return;
    }

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
    // ---- The header (the same for everyone) ----
    const props = wholePage ? fm : (player?.properties ?? {});
    const title = wholePage ? (typeof fm.title === "string" ? fm.title : file.basename) : (player?.title ?? file.basename);
    renderHeaderCard(page, this.app, file.path, props, title);
    if (typeof props.spotify === "string" && props.spotify) page.createDiv({ cls: "mw-nf-song", text: "▶  Theme song: Spotify's player, under the header" });

    // ---- The page: only the wiki sections this person can see ----
    if (wholePage) {
      await playerText(text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, ""), page.createDiv({ cls: "mw-wp-md" }));
    } else {
      const viewer = this.view;
      const sees = (vis: string) => vis === "everyone" || viewer === "dm" || vis === viewer;
      const shown = readSections(text).filter((x) => sees(x.vis));
      if (!shown.length) {
        page.createDiv({
          cls: "mw-wp-empty",
          text: viewer === "everyone" ? "This note isn't on the wiki. Click Edit and add an Overview for Everyone to put it there." : "Nothing on the wiki for them in this note.",
        });
      }
      // Like the wiki: the Overview, then Content, then "What we know". Sections not for everyone get a tag.
      const tag = (el: HTMLElement, vis: string) => {
        if (vis === "everyone") return;
        el.createSpan({ cls: `mw-wp-tag ${vis === "dm" ? "mw-dm" : "mw-one"}`, text: vis === "dm" ? "DM" : `${cap(vis)} only` });
      };
      const block = async (sec: WikiSection, heading: string, level: "h2" | "h3") => {
        const wrap = page.createDiv({ cls: `mw-wp-sec ${sec.vis === "everyone" ? "" : sec.vis === "dm" ? "mw-dm" : "mw-one"}` });
        if (heading || sec.vis !== "everyone") {
          const h = wrap.createEl(level, { text: heading });
          tag(h, sec.vis);
        }
        await playerText(withoutNested(sec.text), wrap.createDiv({ cls: "mw-wp-md" }));
      };
      for (const sec of shown.filter((x) => x.kind === "overview")) await block(sec, "Overview", "h2");
      for (const sec of shown.filter((x) => x.kind === "content")) await block(sec, sec.title, "h2");
      const known = shown.filter((x) => x.kind === "known");
      if (known.length) {
        page.createEl("h2", { text: "What we know" });
        for (const sec of known) await block(sec, sec.title, "h3");
      }
      if (viewer !== "everyone")
        page.createDiv({ cls: "mw-wp-hint", text: "One-player and DM sections show here now, and on the wiki once the online DM view is built." });
    }

    if (warnings.length) {
      const w = root.createDiv({ cls: "mw-wp-warnings" });
      for (const msg of [...new Set(warnings)]) w.createDiv({ cls: "mw-wp-warning", text: `⚠ ${msg}` });
    }
  }

  // ---- Edit ----
  private drawEditor(page: HTMLElement, text: string, fm: Record<string, unknown>, wholePage: boolean) {
    const file = this.file!;
    if (wholePage) {
      page.createDiv({ cls: "mw-wp-empty", text: "Player Pages are published whole, so edit this one as a normal note." });
      return;
    }
    const all = readSections(text);
    this.sections = all.filter((s) => s.simple);
    const locked = all.filter((s) => !s.simple);

    const head = renderHeaderCard(page, this.app, file.path, fm, typeof fm.player_name === "string" && fm.player_name ? fm.player_name : file.basename);
    const details = (head.querySelector(".mw-nf-card-text") as HTMLElement).createEl("button", { cls: "mw-wp-details", text: "Edit details (portrait, tags…)" });
    details.addEventListener("click", () => this.plugin.editDetails(file));

    const list = page.createDiv({ cls: "mw-wp-cards" });
    const lockedEl = page.createDiv();
    const footer = page.createDiv();
    const pcs = this.plugin.partyNames();

    // Moving or deleting rebuilds the cards. The page keeps its height and scroll position until
    // everything (including the formatted side, which draws a moment later) is back.
    const rebuild = () => {
      const scroller = this.contentEl;
      const top = scroller.scrollTop;
      list.style.minHeight = `${list.offsetHeight}px`;
      list.empty();
      for (const sec of this.sections) this.card(list, sec, pcs, rebuild);
      scroller.scrollTop = top;
      window.setTimeout(() => {
        list.style.minHeight = "";
        scroller.scrollTop = top;
      }, 400);
    };
    for (const sec of this.sections) this.card(list, sec, pcs, rebuild);

    for (const sec of locked) {
      const c = lockedEl.createDiv({ cls: "mw-wp-card mw-locked" });
      c.createDiv({ cls: "mw-wp-hidden-label", text: `🔒 ${sec.kind === "overview" ? "Overview" : sec.title || "Section"} · has another callout inside it, so edit it in the note itself` });
      MarkdownRenderer.render(this.app, sec.text, c.createDiv({ cls: "mw-wp-md" }), file.path, this.renderers!);
    }
    const add = footer.createEl("button", { cls: "mw-wp-add", text: "+ Add section" });
    add.addEventListener("click", () => {
      const sec: WikiSection = { kind: this.sections.some((x) => x.kind === "overview") ? "known" : "overview", title: "", text: "", vis: "everyone", simple: true };
      this.sections.push(sec);
      const c = this.card(list, sec, pcs, rebuild);
      c.querySelector("textarea")?.focus({ preventScroll: true });
      c.scrollIntoView({ block: "nearest" });
    });
    footer.createDiv({
      cls: "mw-wp-hint",
      text: "Saved as you type, as folded callouts at the bottom of the note. Your other callouts (like DM only) aren't touched. Only \"Everyone\" sections go on the wiki for now.",
    });
  }

  // One section's card. Changes to it update the card itself; only moving and deleting rebuild.
  private card(list: HTMLElement, s: WikiSection, pcs: string[], rebuild: () => void): HTMLElement {
    const c = list.createDiv({ cls: "mw-wp-card" });
    const style = () => {
      c.toggleClass("mw-one", s.vis !== "everyone" && s.vis !== "dm");
      c.toggleClass("mw-dm", s.vis === "dm");
    };
    style();
    const head = c.createDiv({ cls: "mw-wp-card-head" });

    const kind = head.createEl("select", { cls: "dropdown mw-wp-kind" });
    for (const [k, label] of KINDS) kind.createEl("option", { text: label, value: k });
    kind.value = s.kind;
    const title = head.createEl("input", { type: "text", cls: "mw-wp-title" });
    const titleState = () => {
      title.placeholder = s.kind === "overview" ? "(the Overview has no heading)" : s.kind === "content" ? "Heading (optional)" : "Heading, e.g. Session 4";
      title.disabled = s.kind === "overview";
      title.value = s.kind === "overview" ? "" : s.title;
    };
    titleState();
    kind.addEventListener("change", () => {
      s.kind = kind.value as Kind;
      titleState();
      this.save();
    });
    title.addEventListener("input", () => {
      s.title = title.value;
      this.save();
    });

    const seg = head.createDiv({ cls: "mw-wp-vis" });
    const choices = ["everyone", ...pcs, "dm"];
    if (!choices.includes(s.vis)) choices.splice(choices.length - 1, 0, s.vis); // a name no longer in the party isn't lost
    const buttons: [string, HTMLButtonElement][] = [];
    const visState = () => {
      for (const [v, b] of buttons) {
        b.toggleClass("mw-on", s.vis === v);
        b.toggleClass("mw-one", v !== "everyone" && v !== "dm");
        b.toggleClass("mw-dm", v === "dm");
      }
      style();
    };
    for (const v of choices) {
      const b = seg.createEl("button", { text: v === "everyone" ? "Everyone" : v === "dm" ? "DM" : cap(v) });
      b.title = v === "everyone" ? "On the wiki for everyone" : v === "dm" ? "Only in the DM view" : `Only ${cap(v)} (and the DM)`;
      b.addEventListener("click", () => {
        s.vis = v;
        visState();
        this.save();
      });
      buttons.push([v, b]);
    }
    visState();

    const tools = head.createDiv({ cls: "mw-wp-tools" });
    const tool = (icon: string, label: string, go: (i: number) => boolean) => {
      const b = tools.createEl("button", { text: icon });
      b.title = label;
      b.addEventListener("click", () => {
        if (!go(this.sections.indexOf(s))) return;
        this.save();
        rebuild();
      });
    };
    const move = (i: number, to: number) => {
      if (to < 0 || to >= this.sections.length) return false;
      this.sections.splice(to, 0, this.sections.splice(i, 1)[0]);
      return true;
    };
    tool("↑", "Move up", (i) => move(i, i - 1));
    tool("↓", "Move down", (i) => move(i, i + 1));
    tool("✕", "Delete this section", (i) => (this.sections.splice(i, 1), true));

    const split = c.createDiv({ cls: "mw-wp-split" });
    const box = split.createDiv({ cls: "mw-wp-write" });
    const ta = box.createEl("textarea", { cls: "mw-wp-text" });
    ta.value = s.text;
    ta.placeholder = s.kind === "overview" ? "What the party knows, in a sentence or two" : "Write in Markdown. Type [[ to link a note.";
    const shown = split.createDiv({ cls: "mw-wp-md mw-wp-shown" });
    const fit = () => {
      ta.style.height = "auto";
      ta.style.height = `${Math.max(70, ta.scrollHeight + 2)}px`;
    };
    let t = 0;
    const show = (now = false) => {
      window.clearTimeout(t);
      const draw = () => {
        // Draw the new version off to the side, then swap, so the card doesn't shrink in between
        const next = createDiv();
        MarkdownRenderer.render(this.app, s.text || "*Nothing yet*", next, this.file!.path, this.renderers!).then(() => {
          shown.replaceChildren(...Array.from(next.childNodes));
        });
      };
      if (now) draw();
      else t = window.setTimeout(draw, 150);
    };
    ta.addEventListener("input", () => {
      s.text = ta.value;
      fit();
      show();
      this.save();
    });
    new LinkSuggest(this.app, ta, box);
    fit();
    show(true);
    return c;
  }

  // Saves a moment after typing stops
  private save() {
    this.savedEl?.setText("Saving…");
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => this.flush(), 700);
  }
  private async flush() {
    if (!this.saveTimer || !this.file) return;
    window.clearTimeout(this.saveTimer);
    this.saveTimer = 0;
    const sections = this.sections.map((s) => ({ ...s }));
    try {
      await this.app.vault.process(this.file, (text) => writeSections(text, sections));
      this.plugin.published = null; // what's published may have changed
      this.savedEl?.setText("✓ Saved");
    } catch (e) {
      this.savedEl?.setText(`Couldn't save: ${(e as Error).message}`);
    }
  }
}

// Suggests notes after "[[", like Obsidian's editor. Arrow keys, then Enter or Tab to pick; Esc to close.
class LinkSuggest {
  private menu: HTMLElement;
  private items: TFile[] = [];
  private at = 0;
  constructor(private app: App, private ta: HTMLTextAreaElement, holder: HTMLElement) {
    this.menu = holder.createDiv({ cls: "mw-wp-suggest" });
    this.menu.hide();
    ta.addEventListener("input", () => this.update());
    ta.addEventListener("keydown", (ev) => this.key(ev));
    ta.addEventListener("blur", () => window.setTimeout(() => this.menu.hide(), 150));
  }
  private update() {
    const m = this.ta.value.slice(0, this.ta.selectionStart).match(/\[\[([^\]\n|#]*)$/);
    if (!m) return this.menu.hide();
    const lq = m[1].toLowerCase();
    this.items = this.app.vault
      .getMarkdownFiles()
      .filter((f) => f.basename.toLowerCase().includes(lq))
      .sort((a, b) => Number(!a.basename.toLowerCase().startsWith(lq)) - Number(!b.basename.toLowerCase().startsWith(lq)) || a.basename.localeCompare(b.basename))
      .slice(0, 8);
    this.at = 0;
    this.draw();
  }
  private draw() {
    this.menu.empty();
    if (!this.items.length) return this.menu.hide();
    this.items.forEach((f, i) => {
      const row = this.menu.createDiv({ cls: `mw-wp-suggest-item ${i === this.at ? "mw-on" : ""}` });
      row.createDiv({ text: f.basename });
      row.createDiv({ cls: "mw-ev-suggest-path", text: f.parent?.path ?? "" });
      row.addEventListener("mousedown", (ev) => {
        ev.preventDefault();
        this.pick(f);
      });
    });
    this.menu.show();
  }
  private key(ev: KeyboardEvent) {
    if (this.menu.style.display === "none" || !this.items.length) return;
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      this.at = (this.at + (ev.key === "ArrowDown" ? 1 : -1) + this.items.length) % this.items.length;
      this.draw();
    } else if (ev.key === "Enter" || ev.key === "Tab") {
      ev.preventDefault();
      this.pick(this.items[this.at]);
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      this.menu.hide();
    }
  }
  private pick(f: TFile) {
    const pos = this.ta.selectionStart;
    const before = this.ta.value.slice(0, pos).replace(/\[\[([^\]\n|#]*)$/, `[[${f.basename}]]`);
    const after = this.ta.value.slice(pos).replace(/^[^\]\n]*\]\]/, ""); // already closed: don't double up
    this.ta.value = before + after;
    this.ta.selectionStart = this.ta.selectionEnd = before.length;
    this.menu.hide();
    this.ta.dispatchEvent(new Event("input"));
  }
}

// A player callout's text without any other callout inside it (publishing leaves those out)
function withoutNested(text: string): string {
  const out: string[] = [];
  let skipping = false;
  for (const line of text.split("\n")) {
    const nested = line.match(/^>\s*\[!(\w[\w-]*)/i);
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
