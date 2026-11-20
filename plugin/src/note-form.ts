// "Edit wiki details": a form for a note's wiki properties and its Overview, with a preview of
// how the top of its page will look on the wiki. Opened from the ✎ button on every note.
//
// It only changes the wiki's own properties (player_..., photo, banner, quest...) and the
// note's "> [!player] Overview" callout. Your own properties and the rest of the note stay as they are.
// Saves through Obsidian (processFrontMatter and vault.process), so Obsidian can stay open.

import { AbstractInputSuggest, App, Modal, Notice, TFile, ToggleComponent } from "obsidian";
import { findOverview, playerCallouts, setOverview } from "../../shared/overview";
import type { SectionRule } from "../../shared/export";
import { renderHeaderCard } from "./header-card";

type Kind = "person" | "place" | "faction" | "god" | "quest" | "session" | "page" | "other";
type FieldType = "text" | "link" | "image" | "images" | "list" | "choice" | "toggle" | "url" | "section" | "date";

interface Field {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
  placeholder?: string;
  choices?: string[]; // for "choice": the values, in order
}

const IMAGE = /\.(png|jpe?g|gif|webp|svg|avif)$/i;
const FAVOUR = ["Grudge", "Cold", "Neutral", "Warm", "Favoured"];
const STANDING = ["Hostile", "Wary", "Neutral", "Friendly", "Allied"];
const AFFINITY = ["Enemy", "Shunned", "Noticed", "Chosen"];
const TONE: Record<string, string> = { grudge: "bad", hostile: "bad", enemy: "bad", cold: "low", wary: "low", shunned: "low", warm: "good", friendly: "good", noticed: "good", favoured: "best", allied: "best", chosen: "best" };

const F = {
  name: { key: "player_name", label: "Name they know", type: "text", hint: "Only if the party knows it by another name" },
  title: { key: "player_title", label: "Subtitle", type: "text", placeholder: "e.g. The miller" },
  say: { key: "player_say", label: "Say it", type: "text", placeholder: "How to say the name" },
  photo: { key: "photo", label: "Portrait", type: "image" },
  artist: { key: "player_artist", label: "Artist", type: "text", placeholder: "Name, or [Name](link)" },
  sigil: { key: "player_sigil", label: "Symbol", type: "image", hint: "Shown instead of a portrait" },
  type: { key: "player_type", label: "Type tag", type: "text", placeholder: "e.g. Village, Guild, Festival" },
  banner: { key: "banner", label: "Banner", type: "image" },
  focus: { key: "banner_focus", label: "Banner shows", type: "choice", choices: ["top", "center", "bottom"] },
  themes: { key: "player_themes", label: "Themes", type: "list", placeholder: "Short words, with commas", hint: "Shown on the page's card in its section" },
  handouts: { key: "player_handouts", label: "Handouts", type: "images", hint: "One image name per line" },
  song: { key: "spotify", label: "Theme song", type: "url", placeholder: "Spotify: Share → Copy song link" },
  mood: { key: "pinterest", label: "Moodboard", type: "url", placeholder: "Pinterest board link" },
  section: { key: "wiki_section", label: "Wiki section", type: "section" },
} satisfies Record<string, Field>;

const KIND_FIELDS: Record<Kind, { title: string; main: Field[] }> = {
  person: {
    title: "Person",
    main: [
      { key: "player_species", label: "Species", type: "text" },
      { key: "player_status", label: "Status", type: "text", placeholder: "e.g. Missing" },
      { key: "player_faction", label: "Faction", type: "link", hint: "Also lists them under that faction's Key NPCs" },
      { key: "player_seen", label: "Last seen", type: "link", hint: "Also lists them under that place's Key NPCs" },
      { key: "player_favour", label: "Favour", type: "choice", choices: FAVOUR, hint: "How they feel about the party" },
    ],
  },
  place: {
    title: "Place",
    main: [
      F.type,
      { key: "player_in", label: "Inside", type: "link", hint: "A place, or plain text for a region with no note. Empty for a top-level place." },
    ],
  },
  faction: { title: "Faction", main: [F.type, { key: "player_standing", label: "Standing", type: "choice", choices: STANDING, hint: "The party's standing with them" }] },
  god: { title: "God", main: [F.type] },
  quest: {
    title: "Quest",
    main: [
      { key: "quest", label: "Quest type", type: "choice", choices: ["main", "personal", "faction", "side"] },
      { key: "quest_status", label: "Status", type: "choice", choices: ["active", "completed", "failed"] },
      { key: "pinned", label: "On the home page", type: "toggle", hint: "Shown while it's active" },
    ],
  },
  session: { title: "Session recap", main: [{ key: "fc-date", label: "In-world date", type: "date", hint: "Puts it on the calendar. The newest becomes \"Previously on…\" on the home page." }] },
  page: { title: "Player page", main: [] },
  other: { title: "Page", main: [F.type] },
};

export interface NoteFormContext {
  app: App;
  file: TFile;
  sections: SectionRule[];
  sectionTitles: Record<string, string>;
  playerPagesFolder: string;
  months: string[]; // Calendarium's month names, if it's there
  onSaved?: () => void;
}

const SECTION_KIND: Record<string, Kind> = { people: "person", party: "person", places: "place", factions: "faction", gods: "god", quests: "quest", sessions: "session" };

export function kindOf(path: string, sections: SectionRule[], playerPagesFolder: string, override?: string): Kind {
  if (path.startsWith(playerPagesFolder + "/")) return "page";
  let best: SectionRule | null = null;
  for (const r of sections) if (path.startsWith(r.folder + "/") && (!best || r.folder.length > best.folder.length)) best = r;
  return SECTION_KIND[override ?? best?.section ?? ""] ?? "other";
}

// "[[Pell]]" -> "Pell"; "[[Art/x.png|cap]]" -> "Art/x.png"; plain text stays
const unlink = (v: unknown) => String(v ?? "").replace(/^!?\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]$/, "$1").trim();
const isEmpty = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);

class FileSuggest extends AbstractInputSuggest<TFile> {
  constructor(app: App, private input: HTMLInputElement, private images: boolean, private onPick: () => void) {
    super(app, input);
  }
  getSuggestions(q: string): TFile[] {
    const query = q.toLowerCase();
    const files = this.images ? this.app.vault.getFiles().filter((f) => IMAGE.test(f.path)) : this.app.vault.getMarkdownFiles();
    return files.filter((f) => f.path.toLowerCase().includes(query)).slice(0, 30);
  }
  renderSuggestion(f: TFile, el: HTMLElement) {
    el.createDiv({ text: this.images ? f.name : f.basename });
    el.createDiv({ text: f.parent?.path ?? "", cls: "mw-ev-suggest-path" });
  }
  selectSuggestion(f: TFile) {
    this.input.value = this.images ? f.name : f.basename;
    this.input.dispatchEvent(new Event("input"));
    this.onPick();
    this.close();
  }
}

export class NoteForm extends Modal {
  private values: Record<string, unknown> = {}; // what the form shows, by property
  private original: Record<string, unknown> = {};
  private overview = "";
  private overviewOriginal = "";
  private overviewSimple = true;
  private callouts = 0;
  private kind: Kind = "other";
  private pcs: string[] = []; // affinity names, for gods
  private showMore = false;
  private preview!: HTMLElement;
  private status!: HTMLElement;

  constructor(private ctx: NoteFormContext) {
    super(ctx.app);
  }

  async onOpen() {
    const { app, file } = this.ctx;
    const fm = (app.metadataCache.getFileCache(file)?.frontmatter ?? {}) as Record<string, unknown>;
    const text = await app.vault.read(file);
    const ov = findOverview(text);
    this.overview = this.overviewOriginal = ov?.text ?? "";
    this.overviewSimple = ov?.simple ?? true;
    this.callouts = playerCallouts(text);
    this.kind = kindOf(file.path, this.ctx.sections, this.ctx.playerPagesFolder, typeof fm.wiki_section === "string" ? fm.wiki_section : undefined);

    for (const f of this.allFields()) this.original[f.key] = fm[f.key];
    // Gods: one affinity per party member, plus any already set
    if (this.kind === "god") {
      const party = this.ctx.sections.filter((r) => r.section === "party").map((r) => r.folder + "/");
      const names = app.vault
        .getMarkdownFiles()
        .filter((f) => party.some((p) => f.path.startsWith(p)))
        .map((f) => {
          const n = app.metadataCache.getFileCache(f)?.frontmatter?.player_name;
          return String(typeof n === "string" && n.trim() ? n : f.basename).split(/\s+/)[0].toLowerCase();
        });
      const set = Object.keys(fm).filter((k) => k.startsWith("affinity_")).map((k) => k.slice(9));
      this.pcs = [...new Set([...names, ...set])].filter(Boolean).sort();
      for (const pc of this.pcs) this.original[`affinity_${pc}`] = fm[`affinity_${pc}`];
    }
    this.values = { ...this.original };
    // Something filled in under More: start with it open
    this.showMore = this.moreFields().some((f) => !isEmpty(this.original[f.key]));
    this.draw();
  }

  private mainFields(): Field[] {
    const k = this.kind;
    const pictures = k === "faction" || k === "god" ? [F.sigil] : [F.photo, F.artist];
    return [F.name, F.title, F.say, ...pictures, ...KIND_FIELDS[k].main];
  }
  private moreFields(): Field[] {
    const main = new Set(this.mainFields().map((f) => f.key));
    const extra = this.kind === "faction" || this.kind === "god" ? [F.photo, F.artist] : [F.sigil];
    return [F.type, F.banner, F.focus, ...extra, F.themes, F.handouts, F.song, F.mood, F.section].filter((f) => !main.has(f.key));
  }
  private allFields(): Field[] {
    return [...this.mainFields(), ...this.moreFields()];
  }

  // ---- Drawing the form ----
  private draw() {
    const { contentEl, modalEl } = this;
    modalEl.addClass("mw-nf-modal");
    contentEl.empty();
    const wrap = contentEl.createDiv({ cls: "mw-nf" });
    const form = wrap.createDiv({ cls: "mw-nf-form" });
    const side = wrap.createDiv({ cls: "mw-nf-side" });

    const head = form.createDiv({ cls: "mw-nf-head" });
    head.createEl("h2", { text: this.ctx.file.basename });
    head.createSpan({ cls: "mw-nf-kind", text: `· ${KIND_FIELDS[this.kind].title.toLowerCase()}` });
    this.status = form.createDiv({ cls: "mw-nf-status" });

    if (this.kind !== "page") {
      const h = form.createDiv({ cls: "mw-nf-section" });
      h.setText("Overview");
      h.createSpan({ cls: "mw-nf-section-hint", text: " what the party knows, at the top of the page" });
      const ta = form.createEl("textarea", { cls: "mw-nf-overview" });
      ta.value = this.overview;
      ta.rows = 3;
      if (!this.overviewSimple) {
        ta.disabled = true;
        form.createDiv({ cls: "mw-nf-hint", text: "This Overview has another callout inside it, so change it in the note itself." });
      }
      ta.addEventListener("input", () => {
        this.overview = ta.value;
        this.refresh();
      });
    }

    this.group(form, "How the party knows it", [F.name, F.title, F.say]);
    this.group(form, "Pictures", this.mainFields().filter((f) => [F.photo.key, F.artist.key, F.sigil.key].includes(f.key)));
    const kindMain = KIND_FIELDS[this.kind].main;
    if (kindMain.length) this.group(form, KIND_FIELDS[this.kind].title, kindMain);
    if (this.kind === "god" && this.pcs.length) this.affinity(form);

    const more = form.createEl("button", { cls: "mw-nf-more", text: `${this.showMore ? "▾" : "▸"} More` });
    more.addEventListener("click", () => {
      this.showMore = !this.showMore;
      this.draw();
    });
    if (this.showMore) this.group(form, "", this.moreFields());

    const err = form.createDiv({ cls: "mw-nf-error" });
    const buttons = form.createDiv({ cls: "mw-nf-buttons" });
    buttons.createDiv({ cls: "mw-nf-spacer" });
    buttons.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.close());
    const save = buttons.createEl("button", { text: "Save", cls: "mod-cta" });
    save.addEventListener("click", async () => {
      err.setText("");
      try {
        await this.save();
        new Notice("Wiki details saved");
        this.close();
        this.ctx.onSaved?.();
      } catch (e) {
        err.setText(`Couldn't save: ${(e as Error).message}`);
      }
    });

    side.createDiv({ cls: "mw-nf-side-title", text: "How it will look on the wiki" });
    this.preview = side.createDiv();
    this.refresh();
  }

  private group(parent: HTMLElement, title: string, fields: Field[]) {
    if (!fields.length) return;
    if (title) parent.createDiv({ cls: "mw-nf-section", text: title });
    for (const f of fields) this.field(parent, f);
  }

  private field(parent: HTMLElement, f: Field) {
    const row = parent.createDiv({ cls: "mw-nf-row" });
    const label = row.createDiv({ cls: "mw-nf-label", text: f.label });
    if (f.hint) label.createDiv({ cls: "mw-nf-hint", text: f.hint });
    const control = row.createDiv({ cls: "mw-nf-control" });
    const v = this.values[f.key];
    const set = (value: unknown) => {
      this.values[f.key] = value;
      this.refresh();
    };

    if (f.type === "choice") {
      const seg = control.createDiv({ cls: "mw-nf-seg" });
      const current = String(v ?? "").toLowerCase();
      for (const c of [...f.choices!, ""]) {
        const b = seg.createEl("button", { text: c || "—", cls: current === c.toLowerCase() ? "mw-on" : "" });
        b.title = c ? c : "Not set";
        b.addEventListener("click", () => {
          set(c || undefined);
          this.draw();
        });
      }
      return;
    }
    if (f.type === "toggle") {
      new ToggleComponent(control).setValue(v === true).onChange((on) => set(on ? true : undefined));
      return;
    }
    if (f.type === "section") {
      const sel = control.createEl("select", { cls: "dropdown" });
      sel.createEl("option", { text: "Automatic (from its folder)", value: "" });
      for (const sec of [...new Set(this.ctx.sections.map((r) => r.section))]) sel.createEl("option", { text: this.ctx.sectionTitles[sec] ?? sec, value: sec });
      sel.value = typeof v === "string" ? v : "";
      sel.addEventListener("change", () => set(sel.value || undefined));
      return;
    }
    if (f.type === "date") {
      this.dateField(control, v, set);
      return;
    }
    if (f.type === "images") {
      const ta = control.createEl("textarea", { cls: "mw-nf-input" });
      ta.rows = 2;
      ta.value = (Array.isArray(v) ? v : isEmpty(v) ? [] : [v]).map(unlink).join("\n");
      ta.addEventListener("input", () => set(ta.value.split("\n").map((x) => x.trim()).filter(Boolean)));
      return;
    }
    const input = control.createEl("input", { type: "text", cls: "mw-nf-input" });
    if (f.placeholder) input.placeholder = f.placeholder;
    if (f.key === "player_name") input.placeholder = this.ctx.file.basename;
    if (f.type === "list") input.value = (Array.isArray(v) ? v : isEmpty(v) ? [] : [v]).join(", ");
    else input.value = f.type === "link" || f.type === "image" ? unlink(v) : String(v ?? "");
    if (f.type === "image") {
      const thumb = control.createEl("img", { cls: "mw-nf-thumb" });
      const show = () => {
        const file = this.resolve(input.value, true);
        thumb.toggleClass("mw-hidden", !file);
        if (file) thumb.src = this.app.vault.getResourcePath(file);
      };
      control.prepend(thumb);
      show();
      new FileSuggest(this.app, input, true, show);
      input.addEventListener("input", show);
    }
    if (f.type === "link") new FileSuggest(this.app, input, false, () => undefined);
    input.addEventListener("input", () => {
      const t = input.value.trim();
      if (f.type === "list") set(t ? t.split(",").map((x) => x.trim()).filter(Boolean) : undefined);
      else set(t || undefined);
    });
  }

  private affinity(parent: HTMLElement) {
    parent.createDiv({ cls: "mw-nf-section", text: "Affinity (only when the whole party knows)" });
    for (const pc of this.pcs)
      this.field(parent, { key: `affinity_${pc}`, label: pc.charAt(0).toUpperCase() + pc.slice(1), type: "choice", choices: AFFINITY });
  }

  // fc-date: "412-06-08" (year-month-day). Months from Calendarium if it's there.
  private dateField(control: HTMLElement, v: unknown, set: (v: unknown) => void) {
    const m = String(v ?? "").match(/^(-?\d+)-(\d{1,2})-(\d{1,2})$/);
    const day = control.createEl("input", { type: "number", cls: "mw-nf-day", placeholder: "Day" });
    const month = control.createEl("select", { cls: "dropdown" });
    month.createEl("option", { text: "Month", value: "" });
    const names = this.ctx.months.length ? this.ctx.months : Array.from({ length: 12 }, (_, i) => `Month ${i + 1}`);
    names.forEach((n, i) => month.createEl("option", { text: n, value: String(i + 1) }));
    const year = control.createEl("input", { type: "number", cls: "mw-nf-year", placeholder: "Year" });
    if (m) {
      year.value = m[1];
      month.value = String(Number(m[2]));
      day.value = String(Number(m[3]));
    }
    const read = () => {
      if (!day.value && !month.value && !year.value) return set(undefined);
      const pad = (n: string) => String(Number(n || 1)).padStart(2, "0");
      set(`${Number(year.value || 0)}-${pad(month.value)}-${pad(day.value)}`);
    };
    for (const el of [day, month, year]) el.addEventListener("change", read);
  }

  private resolve(name: string, image: boolean): TFile | null {
    const n = unlink(name);
    if (!n) return null;
    const direct = this.app.vault.getAbstractFileByPath(n);
    if (direct instanceof TFile) return direct;
    const f = this.app.metadataCache.getFirstLinkpathDest(n, this.ctx.file.path);
    return f && (!image || IMAGE.test(f.path)) ? f : null;
  }

  // ---- The preview, and whether it'll be on the wiki ----
  private refresh() {
    const willPublish = this.kind === "page" || this.callouts > (this.overviewOriginal ? 1 : 0) || !!this.overview.trim();
    const wasPublished = this.kind === "page" || this.callouts > 0;
    this.status.empty();
    this.status.className = `mw-nf-status ${willPublish ? "mw-yes" : "mw-no"}`;
    this.status.setText(
      willPublish && !wasPublished
        ? "✓ Will be on the wiki after saving (it gets an Overview)"
        : willPublish
          ? this.kind === "page"
            ? "✓ On the wiki (a Player Page: published whole)"
            : `✓ On the wiki (${this.callouts} player callout${this.callouts === 1 ? "" : "s"})`
          : wasPublished
            ? "Will leave the wiki after saving (no player callouts left)"
            : "Not on the wiki yet: write an Overview to add it",
    );

    const p = this.preview;
    p.empty();
    const v = (k: string) => {
      const x = this.values[k];
      return typeof x === "string" && x.trim() ? x.trim() : undefined;
    };
    renderHeaderCard(p, this.app, this.ctx.file.path, this.values, v("player_name") ?? this.ctx.file.basename);
    if (this.overview.trim()) p.createDiv({ cls: "mw-nf-card-overview", text: this.overview.trim() });
    if (v("spotify")) {
      const ok = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode)\//.test(v("spotify")!);
      p.createDiv({ cls: `mw-nf-song ${ok ? "" : "mw-bad"}`, text: ok ? "▶  Theme song: Spotify's player, under the header" : "That isn't a Spotify song link" });
    }

    // What else changes on the wiki
    const notes: string[] = [];
    if (v("player_faction")) notes.push(`Listed under ${unlink(v("player_faction"))}'s Key NPCs.`);
    if (v("player_seen")) notes.push(`Listed under ${unlink(v("player_seen"))}'s Key NPCs.`);
    if (this.values.pinned === true && this.values.quest_status === "active") notes.push("Shown in the quest log on the home page.");
    if (this.kind === "session" && v("fc-date")) notes.push("On the calendar. If it's the newest, it's \"Previously on…\" on the home page.");
    if (Array.isArray(this.values.player_handouts) && this.values.player_handouts.length) notes.push(`${this.values.player_handouts.length} handout(s) under Related handouts.`);
    if (v("pinterest")) notes.push("A moodboard, fetched when you publish.");
    notes.push("Only the wiki's own properties and the Overview are saved here. Your other properties and notes aren't touched.");
    const ul = p.createEl("ul", { cls: "mw-nf-notes" });
    for (const n of notes) ul.createEl("li", { text: n });
  }

  // ---- Saving ----
  private async save() {
    const { app, file } = this.ctx;
    const link = (name: string, image: boolean) => {
      const f = this.resolve(name, image);
      if (!f) return null;
      // A short link if the name is unique, otherwise the full path
      const short = image ? f.name : f.basename;
      return app.metadataCache.getFirstLinkpathDest(short, file.path)?.path === f.path ? `[[${short}]]` : `[[${f.path}]]`;
    };
    const out: Record<string, unknown> = {};
    for (const f of [...this.allFields(), ...this.pcs.map((pc) => ({ key: `affinity_${pc}`, type: "choice" as FieldType, label: pc }))]) {
      const now = this.values[f.key];
      const was = this.original[f.key];
      if (JSON.stringify(now) === JSON.stringify(was)) continue; // untouched: leave exactly as it was
      if (isEmpty(now)) {
        out[f.key] = undefined;
        continue;
      }
      if (f.type === "image") {
        const l = link(String(now), true);
        if (!l) throw new Error(`there's no image called "${now}"`);
        out[f.key] = l;
      } else if (f.type === "images") {
        out[f.key] = (now as string[]).map((n) => {
          const l = link(n, true);
          if (!l) throw new Error(`there's no image called "${n}"`);
          return l;
        });
      } else if (f.type === "link") out[f.key] = link(String(now), false) ?? String(now); // plain text if there's no such note
      else if (f.type === "url" && f.key === "spotify" && !/^https:\/\/open\.spotify\.com\//.test(String(now))) throw new Error("the theme song must be a Spotify link");
      else out[f.key] = now;
    }
    if (this.kind === "session" && "fc-date" in out && out["fc-date"]) out["fc-category"] = "party";

    if (Object.keys(out).length)
      await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
        for (const [k, val] of Object.entries(out)) {
          if (val === undefined) delete fm[k];
          else fm[k] = val;
        }
      });
    if (this.kind !== "page" && this.overview.trim() !== this.overviewOriginal.trim())
      await app.vault.process(file, (text) => setOverview(text, this.overview));
  }

  onClose() {
    this.contentEl.empty();
  }
}
