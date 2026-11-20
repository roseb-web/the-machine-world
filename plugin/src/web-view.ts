// The people web in Obsidian. Replaces the Person Network plugin.
//
// Everyone with a `groups` or `relations` property is in it.
// "Show the party" switches to what the wiki would show: only published people, using
// player_groups and player_relations instead of groups and relations.

import { debounce, ItemView, TFile, WorkspaceLeaf } from "obsidian";
import { renderWeb } from "../../shared/web-render";
import { cleanTies, dropLoners, GROUP_TYPES, groupId, groupName, parseRelation, WebData, WebGroup, WebPerson, WebTie } from "../../shared/web";
import type MachineWorldWiki from "./main";
import { WebEditModal } from "./web-edit-modal";

export const WEB_VIEW = "machine-world-people-web";

type FM = Record<string, unknown>;
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined || v === null || v === "" ? [] : [v]);
const tagsOf = (fm: FM) =>
  list(fm.tags)
    .flatMap((t) => String(t).split(/[\s,]+/))
    .map((t) => t.replace(/^#/, "").toLowerCase())
    .filter(Boolean);

export class PeopleWebView extends ItemView {
  private playerView = false;
  private redraw = debounce(() => this.draw(), 1500, true);

  constructor(leaf: WorkspaceLeaf, private plugin: MachineWorldWiki) {
    super(leaf);
  }
  getViewType() {
    return WEB_VIEW;
  }
  getDisplayText() {
    return "People web";
  }
  getIcon() {
    return "waypoints";
  }

  async onOpen() {
    this.contentEl.addClass("mw-web-view");
    await this.draw();
    // Notes changed (a new tie, a new group): draw again, keeping where people are
    this.registerEvent(this.app.metadataCache.on("changed", (file) => {
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (file.path === this.plugin.settings.groupTypesNote) return this.redraw();
      if (fm && (fm.groups || fm.relations || fm.player_groups || fm.player_relations)) this.redraw();
    }));
  }

  async draw() {
    const data = await this.build();
    const root = this.contentEl;
    root.empty();
    // The same switch as the timeline's
    const bar = root.createDiv({ cls: "mw-tl-bar mw-web-obar" });
    const toggle = bar.createEl("label", { cls: "mw-tl-toggle" });
    const box = toggle.createEl("input", { type: "checkbox" });
    box.checked = this.playerView;
    toggle.appendText(" Player view: only what the wiki would show");
    box.addEventListener("change", () => {
      this.playerView = box.checked;
      this.draw();
    });
    const holder = root.createDiv({ cls: `mw-web-holder${this.playerView ? " mw-web-playerview" : ""}` });
    const store = (k: string) => `mw-web:${this.playerView ? "party" : "dm"}:${k}`;
    renderWeb(holder, data, {
      wheelZoom: "plain",
      storage: {
        get: (k) => (this.app as unknown as { loadLocalStorage: (k: string) => unknown }).loadLocalStorage(store(k)),
        set: (k, v) => (this.app as unknown as { saveLocalStorage: (k: string, v: unknown) => void }).saveLocalStorage(store(k), v),
      },
      onEdit: (p) => {
        const file = p.open ? this.app.vault.getAbstractFileByPath(p.open) : null;
        if (file instanceof TFile) this.edit(file);
      },
      onOpen: (t) => {
        const path = t.kind === "person" ? t.person.open : t.group.open;
        const file = path ? this.app.vault.getAbstractFileByPath(path) : null;
        if (file instanceof TFile) this.app.workspace.getLeaf("tab").openFile(file);
      },
    });
  }

  // The edit form for one person
  async edit(file: TFile) {
    const people = this.app.vault.getMarkdownFiles().filter((f) => {
      const fm = (this.app.metadataCache.getFileCache(f)?.frontmatter ?? {}) as FM;
      const tags = tagsOf(fm);
      return (tags.includes("character") || fm.groups || fm.relations) && !tags.includes("faction");
    });
    const groupNames = new Set<string>();
    for (const f of people) {
      const fm = (this.app.metadataCache.getFileCache(f)?.frontmatter ?? {}) as FM;
      for (const g of [...list(fm.groups), ...list(fm.player_groups)]) {
        const n = groupName(g);
        if (n) groupNames.add(n);
      }
    }
    const fm = (this.app.metadataCache.getFileCache(file)?.frontmatter ?? {}) as FM;
    new WebEditModal({
      app: this.app,
      file,
      name: typeof fm.player_name === "string" && fm.player_name.trim() ? `${file.basename} (${fm.player_name.trim()} to the party)` : file.basename,
      published: await this.isPublished(file),
      groupTypesNote: this.plugin.settings.groupTypesNote,
      people: people.sort((a, b) => a.basename.localeCompare(b.basename)),
      groupNames: [...groupNames].sort((a, b) => a.localeCompare(b)),
      onSaved: () => window.setTimeout(() => this.draw(), 400),
      openOther: (f) => this.edit(f),
    }).open();
  }

  // On the wiki: a player section, or a Player Page
  private async isPublished(f: TFile) {
    if (f.path.startsWith(this.plugin.settings.playerPagesFolder + "/")) return true;
    return /\[!player\]/i.test(await this.app.vault.cachedRead(f));
  }

  // Reads the people from the vault
  private async build(): Promise<WebData> {
    const { vault, metadataCache } = this.app;
    const player = this.playerView;
    const fmOf = (f: TFile) => (metadataCache.getFileCache(f)?.frontmatter ?? {}) as FM;
    const resolve = (link: string, from: string) => metadataCache.getFirstLinkpathDest(link, from);

    // Group types: one list per type in the groups note
    const types = new Map<string, string>();
    const typesFile = vault.getAbstractFileByPath(this.plugin.settings.groupTypesNote);
    if (typesFile instanceof TFile) {
      const fm = fmOf(typesFile);
      for (const type of Object.keys(GROUP_TYPES))
        for (const raw of list(fm[type])) {
          const name = groupName(raw);
          if (name) types.set(groupId(name), type);
        }
    }

    const people: WebPerson[] = [];
    const rawTies: { from: TFile; rel: ReturnType<typeof parseRelation> }[] = [];
    const groups = new Map<string, WebGroup>();
    for (const f of vault.getMarkdownFiles()) {
      const fm = fmOf(f);
      const tags = tagsOf(fm);
      // Only people who've been given groups or ties: anyone else isn't in the web yet
      const isPerson = (fm.groups || fm.relations || fm.player_groups || fm.player_relations) && !tags.includes("faction") && !tags.includes("party");
      if (!isPerson) continue;
      const gKey = player ? "player_groups" : "groups";
      const rKey = player ? "player_relations" : "relations";
      if (player) {
        // Only people the wiki shows: a player callout, or a Player Page
        if (!(await this.isPublished(f))) continue;
      }
      const pc = tags.includes("pc");
      const name = typeof fm.player_name === "string" && fm.player_name.trim() ? fm.player_name.trim() : f.basename;
      const photoLink = typeof fm.photo === "string" ? fm.photo.replace(/^!?\[\[|\]\]$/g, "").split("|")[0] : "";
      const photoFile = photoLink ? (vault.getAbstractFileByPath(photoLink) ?? resolve(photoLink, f.path)) : null;
      const gs: string[] = [];
      for (const raw of list(fm[gKey])) {
        const gname = groupName(raw);
        if (!gname) continue;
        const id = groupId(gname);
        if (!groups.has(id)) {
          const link = String(raw).match(/^\[\[([^\]|#]+)/)?.[1];
          const note = link ? resolve(link, f.path) : null;
          groups.set(id, { id, name: gname, ...(id === "the party" ? { party: true } : {}), ...(note ? { open: note.path } : {}), ...(types.has(id) ? { type: types.get(id) } : {}) });
        }
        if (!gs.includes(id)) gs.push(id);
      }
      people.push({
        id: f.path,
        name,
        ...(typeof fm.player_title === "string" ? { title: fm.player_title } : {}),
        ...(photoFile instanceof TFile ? { photo: vault.getResourcePath(photoFile) } : {}),
        ...(pc ? { pc: true } : {}),
        groups: gs,
        open: f.path,
      });
      for (const r of list(fm[rKey])) rawTies.push({ from: f, rel: parseRelation(r) });
    }
    const ties: WebTie[] = [];
    for (const { from, rel } of rawTies) {
      if (!rel) continue;
      const to = resolve(rel.target, from.path);
      if (to) ties.push({ a: from.path, b: to.path, type: rel.type, ...(rel.strength ? { strength: rel.strength } : {}) });
    }
    const data = { people, groups: [...groups.values()], ties: cleanTies(ties, people) };
    // The party's view matches the wiki: anyone with nothing shown is left out
    return player ? dropLoners(data) : data;
  }
}
