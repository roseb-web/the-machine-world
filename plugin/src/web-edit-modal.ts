// "Edit" for someone in the people web: their groups and ties, each with a "Show on wiki" switch.
//
// The switches keep player_groups and player_relations in step with groups and relations,
// so nothing is typed twice. They stay separate properties on purpose: the wiki export throws
// away anything that isn't a player_ property, so a hidden group can never reach the site.
//
// Saves through Obsidian's own processFrontMatter, so Obsidian can stay open.

import { App, DropdownComponent, Modal, Notice, TFile, ToggleComponent } from "obsidian";
import { formatRelation, GROUP_TYPES, groupId, groupName, parseRelation, TIE_STYLES } from "../../shared/web";

const list = (v: unknown): string[] =>
  (Array.isArray(v) ? v : v === undefined || v === null || v === "" ? [] : [v]).map((x) => String(x).trim()).filter(Boolean);

interface GroupRow {
  raw: string; // as written in the note, e.g. "[[Meridian Concord]]" or "Thornwick residents"
  name: string;
  shown: boolean;
  isNew?: boolean;
  type?: string; // for a new group the groups note doesn't list yet
}
interface TieRow {
  target: string; // the other person's note name
  type: string;
  strength?: "close" | "loose";
  shown: boolean;
}

export interface WebEditContext {
  app: App;
  file: TFile;
  name: string; // the name shown (player_name if set)
  published: boolean;
  groupTypesNote: string;
  people: TFile[]; // everyone who can be tied to
  groupNames: string[]; // every group already in use
  onSaved: () => void;
  openOther: (file: TFile) => void;
}

export class WebEditModal extends Modal {
  private groups: GroupRow[] = [];
  private ties: TieRow[] = [];
  private others: { file: TFile; type: string }[] = []; // ties written on other people's notes
  private types = new Map<string, string>();

  constructor(private ctx: WebEditContext) {
    super(ctx.app);
  }

  onOpen() {
    const { app, file } = this.ctx;
    const fm = (app.metadataCache.getFileCache(file)?.frontmatter ?? {}) as Record<string, unknown>;

    // Group types, so new groups can be given one
    const typesFile = app.vault.getAbstractFileByPath(this.ctx.groupTypesNote);
    const tfm = typesFile instanceof TFile ? ((app.metadataCache.getFileCache(typesFile)?.frontmatter ?? {}) as Record<string, unknown>) : {};
    for (const t of Object.keys(GROUP_TYPES)) for (const raw of list(tfm[t])) this.types.set(groupId(groupName(raw) ?? raw), t);

    // Groups: everything in `groups`, switched on if it's also in `player_groups`
    const shownGroups = new Set(list(fm.player_groups).map((g) => groupId(groupName(g) ?? g)));
    for (const raw of list(fm.groups)) {
      const name = groupName(raw);
      if (name && !this.groups.some((g) => groupId(g.name) === groupId(name))) this.groups.push({ raw, name, shown: shownGroups.has(groupId(name)) });
    }
    for (const raw of list(fm.player_groups)) {
      const name = groupName(raw);
      if (name && !this.groups.some((g) => groupId(g.name) === groupId(name))) this.groups.push({ raw, name, shown: true });
    }

    // Ties written on this note
    const keyOf = (target: string) => app.metadataCache.getFirstLinkpathDest(target, file.path)?.path ?? target.toLowerCase();
    const shownTies = new Set(list(fm.player_relations).map((r) => parseRelation(r)).filter((r) => r).map((r) => keyOf(r!.target)));
    for (const raw of list(fm.relations)) {
      const r = parseRelation(raw);
      if (r && !this.ties.some((t) => keyOf(t.target) === keyOf(r.target)))
        this.ties.push({ target: r.target, type: r.type, strength: r.strength, shown: shownTies.has(keyOf(r.target)) });
    }
    for (const raw of list(fm.player_relations)) {
      const r = parseRelation(raw);
      if (r && !this.ties.some((t) => keyOf(t.target) === keyOf(r.target))) this.ties.push({ target: r.target, type: r.type, strength: r.strength, shown: true });
    }

    // Ties to them written on someone else's note
    for (const other of this.ctx.people) {
      if (other.path === file.path) continue;
      const ofm = (app.metadataCache.getFileCache(other)?.frontmatter ?? {}) as Record<string, unknown>;
      for (const raw of list(ofm.relations)) {
        const r = parseRelation(raw);
        if (r && app.metadataCache.getFirstLinkpathDest(r.target, other.path)?.path === file.path) {
          if (!this.ties.some((t) => keyOf(t.target) === other.path)) this.others.push({ file: other, type: r.type });
          break;
        }
      }
    }
    this.draw();
  }

  private draw() {
    const { contentEl, modalEl } = this;
    modalEl.addClass("mw-we-modal");
    contentEl.empty();
    contentEl.createEl("h2", { text: this.ctx.name, cls: "mw-we-title" });
    contentEl.createDiv({
      cls: `mw-we-pub ${this.ctx.published ? "mw-yes" : "mw-no"}`,
      text: this.ctx.published ? "✓ On the wiki (has a player section)" : "Not on the wiki yet: add a player section to their note first",
    });

    // ---- Groups ----
    const gHead = contentEl.createDiv({ cls: "mw-we-head" });
    gHead.createSpan({ text: "Groups" });
    gHead.createSpan({ text: "Show on wiki", cls: "mw-we-head-r" });
    const datalistId = "mw-we-groups";
    const dl = contentEl.createEl("datalist");
    dl.id = datalistId;
    for (const g of this.ctx.groupNames) dl.createEl("option", { value: g });
    for (const row of this.groups) {
      const el = contentEl.createDiv({ cls: `mw-we-row${row.shown ? "" : " mw-off"}` });
      const type = this.types.get(groupId(row.name)) ?? (row.name.toLowerCase() === "the party" ? "party" : row.type);
      el.createSpan({ cls: "mw-we-dot" }).style.background = type === "party" ? "#b8860b" : GROUP_TYPES[type ?? ""] ?? "#8b7d70";
      if (row.isNew) {
        const input = el.createEl("input", { type: "text", cls: "mw-we-input", placeholder: "Group name" });
        input.setAttribute("list", datalistId);
        input.value = row.name;
        input.addEventListener("input", () => {
          row.name = input.value;
          row.raw = input.value;
        });
        input.addEventListener("change", () => this.draw());
        if (!this.types.has(groupId(row.name)) && row.name.toLowerCase() !== "the party")
          new DropdownComponent(el)
            .addOptions({ "": "Type…", ...Object.fromEntries(Object.keys(GROUP_TYPES).map((t) => [t, t])) })
            .setValue(row.type ?? "")
            .onChange((v) => {
              row.type = v || undefined;
              this.draw();
            });
      } else el.createSpan({ cls: "mw-we-name", text: row.name });
      this.switch(el, row);
      this.remove(el, () => this.groups.splice(this.groups.indexOf(row), 1));
    }
    this.addLink("+ Add a group", () => this.groups.push({ raw: "", name: "", shown: false, isNew: true }));

    // ---- Ties ----
    const tHead = contentEl.createDiv({ cls: "mw-we-head" });
    tHead.createSpan({ text: "Ties" });
    tHead.createSpan({ text: "Show on wiki", cls: "mw-we-head-r" });
    const peopleId = "mw-we-people";
    const pl = contentEl.createEl("datalist");
    pl.id = peopleId;
    for (const f of this.ctx.people) if (f.path !== this.ctx.file.path) pl.createEl("option", { value: f.basename });
    for (const row of this.ties) {
      const el = contentEl.createDiv({ cls: `mw-we-row${row.shown ? "" : " mw-off"}` });
      const input = el.createEl("input", { type: "text", cls: "mw-we-input", placeholder: "Who?" });
      input.setAttribute("list", peopleId);
      input.value = row.target;
      input.addEventListener("input", () => (row.target = input.value.trim()));
      new DropdownComponent(el)
        .addOptions(Object.fromEntries([...Object.keys(TIE_STYLES), ...(TIE_STYLES[row.type] ? [] : [row.type])].map((t) => [t, t])))
        .setValue(row.type)
        .onChange((v) => (row.type = v));
      new DropdownComponent(el)
        .addOptions({ "": "—", close: "close", loose: "loose" })
        .setValue(row.strength ?? "")
        .onChange((v) => (row.strength = (v || undefined) as TieRow["strength"]));
      this.switch(el, row);
      this.remove(el, () => this.ties.splice(this.ties.indexOf(row), 1));
    }
    this.addLink("+ Add a tie", () => this.ties.push({ target: "", type: "knows", shown: false }));
    contentEl.createDiv({ cls: "mw-we-hint", text: "A tie only shows on the wiki if both people are on the wiki too." });

    if (this.others.length) {
      const oHead = contentEl.createDiv({ cls: "mw-we-head" });
      oHead.createSpan({ text: "Also tied to them, from other notes" });
      const wrap = contentEl.createDiv({ cls: "mw-we-others" });
      for (const o of this.others) {
        const b = wrap.createEl("button", { cls: "mw-we-other", text: `${o.file.basename} (${o.type})` });
        b.title = `Edit on ${o.file.basename}'s note`;
        b.addEventListener("click", () => {
          this.close();
          this.ctx.openOther(o.file);
        });
      }
    }

    const err = contentEl.createDiv({ cls: "mw-we-error" });
    const buttons = contentEl.createDiv({ cls: "mw-we-buttons" });
    buttons.createDiv({ cls: "mw-we-spacer" });
    buttons.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.close());
    const save = buttons.createEl("button", { text: "Save", cls: "mod-cta" });
    save.addEventListener("click", async () => {
      err.setText("");
      try {
        await this.save();
        new Notice("People web: saved");
        this.close();
        this.ctx.onSaved();
      } catch (e) {
        err.setText(`Couldn't save: ${(e as Error).message}`);
      }
    });
  }

  private switch(el: HTMLElement, row: { shown: boolean }) {
    el.createSpan({ cls: "mw-we-lbl", text: row.shown ? "Shown" : "Hidden" });
    new ToggleComponent(el).setValue(row.shown).onChange((v) => {
      row.shown = v;
      this.draw();
    });
  }
  private remove(el: HTMLElement, go: () => void) {
    const x = el.createEl("button", { cls: "mw-we-x", text: "✕" });
    x.setAttribute("aria-label", "Remove");
    x.addEventListener("click", () => {
      go();
      this.draw();
    });
  }
  private addLink(text: string, go: () => void) {
    const b = this.contentEl.createEl("button", { cls: "mw-we-add", text });
    b.addEventListener("click", () => {
      go();
      this.draw();
    });
  }

  private async save() {
    const { app, file } = this.ctx;
    // New groups: written as a link if a note of that name exists, otherwise as plain text
    const groups = this.groups
      .filter((g) => g.name.trim())
      .map((g) => {
        if (!g.isNew) return g;
        const name = g.name.trim();
        const note = app.metadataCache.getFirstLinkpathDest(name, file.path);
        return { ...g, name, raw: note ? `[[${name}]]` : name };
      });
    const ties = this.ties.filter((t) => t.target.trim());
    for (const t of ties)
      if (!app.metadataCache.getFirstLinkpathDest(t.target, file.path)) throw new Error(`there's no note called "${t.target}"`);

    await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
      const set = (key: string, values: string[]) => {
        if (values.length) fm[key] = values;
        else delete fm[key];
      };
      set("groups", groups.map((g) => g.raw));
      set("player_groups", groups.filter((g) => g.shown).map((g) => g.raw));
      set("relations", ties.map((t) => formatRelation(t.target, t.type, t.strength)));
      set("player_relations", ties.filter((t) => t.shown).map((t) => formatRelation(t.target, t.type, t.strength)));
    });

    // New groups given a type go in the groups note
    const typed = groups.filter((g) => g.isNew && g.type && !this.types.has(groupId(g.name)));
    const typesFile = app.vault.getAbstractFileByPath(this.ctx.groupTypesNote);
    if (typed.length && typesFile instanceof TFile)
      await app.fileManager.processFrontMatter(typesFile, (fm: Record<string, unknown>) => {
        for (const g of typed) fm[g.type!] = [...list(fm[g.type!]), g.raw];
      });
  }

  onClose() {
    this.contentEl.empty();
  }
}
