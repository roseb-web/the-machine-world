// The Machine World Wiki plugin.
// Adds a "Publish wiki" button. It exports only player content, shows you the list of pages,
// and pushes to GitHub only after you confirm.

import { App, MarkdownView, Modal, Notice, parseYaml, Plugin, PluginSettingTab, requestUrl, Setting, stringifyYaml, TFile } from "obsidian";
import { boardKey, fetchMoodboards, MoodPin, PinterestAuthError } from "../../shared/pinterest";
import { exportWiki, ExportOptions, ExportResult, SectionRule } from "../../shared/export";
import { pushWiki } from "./github";
import { setProps, trackChanges } from "../../shared/home";

const YAML = { parse: parseYaml, stringify: stringifyYaml };
import { WikiSettings } from "./settings";
import { DEFAULT_SETTINGS } from "./defaults";
import type { Eras, SecondCalendar } from "../../shared/eras";
import { TIMELINE_VIEW, TimelineView } from "./timeline-view";
import { PeopleWebView, WEB_VIEW } from "./web-view";
import { NoteForm } from "./note-form";
import { calendarium } from "./event-modal";
import { gameDateFrom } from "../../shared/calendar";

export default class MachineWorldWiki extends Plugin {
  settings: WikiSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();
    this.addRibbonIcon("book-up", "Publish wiki", () => this.publish());
    this.addCommand({ id: "publish-wiki", name: "Publish wiki", callback: () => this.publish() });
    this.addSettingTab(new WikiSettingTab(this.app, this));

    // The timeline view: every dated event, with a switch for what the wiki would show
    this.registerView(TIMELINE_VIEW, (leaf) => new TimelineView(leaf, this));
    this.addRibbonIcon("calendar-range", "Open timeline", () => this.openTimeline());
    this.addCommand({ id: "open-timeline", name: "Open timeline", callback: () => this.openTimeline() });
    this.registerView(WEB_VIEW, (leaf) => new PeopleWebView(leaf, this));
    this.addRibbonIcon("waypoints", "Open people web", () => this.openView(WEB_VIEW));
    this.addCommand({ id: "open-people-web", name: "Open people web", callback: () => this.openView(WEB_VIEW) });

    // "Edit wiki details": a ✎ button at the top of every note, and a command
    this.addCommand({
      id: "edit-wiki-details",
      name: "Edit wiki details",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") return false;
        if (!checking) this.editDetails(file);
        return true;
      },
    });
    // Tabs that haven't been looked at yet aren't loaded (no buttons to add to): they get
    // theirs when they open, through "layout-change". A problem here never stops the plugin.
    const addButtons = () => {
      for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
        try {
          if (!(leaf.view instanceof MarkdownView)) continue;
          const view = leaf.view as MarkdownView & { _mwEdit?: HTMLElement };
          if (view._mwEdit) continue;
          view._mwEdit = view.addAction("scroll-text", "Edit wiki details", () => view.file && this.editDetails(view.file));
          this.register(() => {
            view._mwEdit?.remove();
            delete view._mwEdit;
          });
        } catch (e) {
          console.warn("Machine World Wiki: couldn't add the edit button", e);
        }
      }
    };
    this.app.workspace.onLayoutReady(addButtons);
    this.registerEvent(this.app.workspace.on("layout-change", addButtons));
    this.registerEvent(this.app.workspace.on("active-leaf-change", addButtons));
  }

  editDetails(file: TFile) {
    new NoteForm({
      app: this.app,
      file,
      sections: this.settings.sections,
      sectionTitles: { ...DEFAULT_SETTINGS.sectionTitles, ...this.settings.sectionTitles },
      playerPagesFolder: this.settings.playerPagesFolder,
      months: calendarium(this.app)?.calendar.static.months.map((m) => m.name) ?? [],
    }).open();
  }

  async openView(type: string) {
    const existing = this.app.workspace.getLeavesOfType(type)[0];
    const leaf = existing ?? this.app.workspace.getLeaf("tab");
    if (!existing) await leaf.setViewState({ type, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  async openTimeline() {
    const existing = this.app.workspace.getLeavesOfType(TIMELINE_VIEW)[0];
    const leaf = existing ?? this.app.workspace.getLeaf("tab");
    if (!existing) await leaf.setViewState({ type: TIMELINE_VIEW, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  // Calendarium's settings file, or null if it isn't there
  async readCalendarium(): Promise<unknown | null> {
    // Calendarium's own copy in memory is the most up to date; the file is a fallback
    try {
      const live = (this.app as unknown as { plugins: { plugins: Record<string, { data?: unknown }> } }).plugins.plugins["calendarium"]?.data;
      if (live && typeof live === "object" && Array.isArray((live as { calendars?: unknown }).calendars)) return JSON.parse(JSON.stringify(live));
    } catch {
      // fall back to the file
    }
    try {
      const calPath = `${this.app.vault.configDir}/plugins/calendarium/data.json`;
      if (!(await this.app.vault.adapter.exists(calPath))) return null;
      return JSON.parse(await this.app.vault.adapter.read(calPath));
    } catch (e) {
      console.warn("Couldn't read Calendarium's settings", e);
      return null;
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // Fetches pins for every `pinterest` link in the vault (only when publishing).
  // If Pinterest can't be reached, the last good pins are used, so moodboards never vanish.
  async moodboards(fetchNew: boolean): Promise<Record<string, MoodPin[]>> {
    const urls = this.app.vault
      .getMarkdownFiles()
      .map((f) => this.app.metadataCache.getFileCache(f)?.frontmatter?.pinterest)
      .filter((u): u is string => typeof u === "string" && u.trim().length > 0);
    if (fetchNew && urls.length && this.settings.pinterestToken) {
      const token = this.settings.pinterestToken;
      try {
        const { boards, errors } = await fetchMoodboards(async (url) => {
          const res = await requestUrl({ url, headers: { Authorization: `Bearer ${token}` }, throw: false });
          return { status: res.status, json: res.status < 400 ? res.json : null };
        }, urls);
        this.settings.moodboardCache = { ...this.settings.moodboardCache, ...boards };
        await this.saveSettings();
        if (errors.length) new Notice(`Moodboards: ${errors.join(" ")}`, 15000);
      } catch (e) {
        const msg = e instanceof PinterestAuthError ? e.message : `Couldn't reach Pinterest (${(e as Error).message}).`;
        new Notice(`Moodboards: ${msg} The last saved moodboards will be used.`, 15000);
      }
    } else if (fetchNew && urls.length && !this.settings.pinterestToken) {
      new Notice("Moodboards: add a Pinterest token in the plugin settings to update them.", 8000);
    }
    const wanted = new Set(urls.map(boardKey));
    return Object.fromEntries(Object.entries(this.settings.moodboardCache).filter(([k]) => wanted.has(k)));
  }

  eras(): Eras {
    return { after: this.settings.yearAfter.trim(), before: this.settings.yearBefore.trim() };
  }
  secondCalendar(): SecondCalendar | undefined {
    const months = this.settings.secondCalendarMonths.map((m) => m.trim()).filter(Boolean);
    return this.settings.secondCalendarLabel.trim() && months.length ? { label: this.settings.secondCalendarLabel.trim(), months } : undefined;
  }

  async buildExport(fetchPinterest = false): Promise<ExportResult> {
    const files = this.app.vault.getMarkdownFiles();
    const notes = await Promise.all(
      files.map(async (f) => ({ path: f.path, text: await this.app.vault.cachedRead(f) })),
    );
    // Today's in-game date and the events, from Calendarium's settings file (if it's there).
    let gameDate = null;
    let calendar: ExportOptions["calendar"] = undefined;
    try {
      const calPath = `${this.app.vault.configDir}/plugins/calendarium/data.json`;
      if (await this.app.vault.adapter.exists(calPath)) {
        const data = JSON.parse(await this.app.vault.adapter.read(calPath));
        gameDate = gameDateFrom(data, this.eras(), this.secondCalendar());
        // Public categories are set by name in the settings; Calendarium stores ids.
        const wanted = new Set(this.settings.publicCategories.map((n) => n.trim().toLowerCase()));
        const cats: { id: string; name: string }[] = data?.calendars?.[0]?.categories ?? [];
        calendar = {
          data,
          publicCategories: cats.filter((c) => wanted.has(c.name.toLowerCase()) || wanted.has(c.id.toLowerCase())).map((c) => c.id),
          publishTimeline: this.settings.publishTimeline,
        };
      }
    } catch (e) {
      console.warn("Couldn't read Calendarium's settings", e);
    }
    const moodboards = await this.moodboards(fetchPinterest);
    return exportWiki(notes, {
      gameDate,
      worldName: this.settings.worldName.trim() || undefined,
      eras: this.eras(),
      secondCalendar: this.secondCalendar(),
      calendar,
      moodboards,
      sections: this.settings.sections,
      defaultSection: this.settings.defaultSection,
      playerPagesFolder: this.settings.playerPagesFolder,
      galleryFolder: this.settings.galleryFolder || undefined,
      groupTypesNote: this.settings.groupTypesNote || undefined,
      sectionTitles: { ...DEFAULT_SETTINGS.sectionTitles, ...this.settings.sectionTitles },
      resolveLink: (link, from) => this.app.metadataCache.getFirstLinkpathDest(link, from)?.path ?? null,
      yaml: { parse: parseYaml, stringify: stringifyYaml },
    });
  }

  async publish() {
    if (!this.settings.token) {
      new Notice("Add your GitHub token in the plugin settings first.");
      return;
    }
    const result = await this.buildExport(true);
    new ConfirmModal(this.app, result, async () => {
      const notice = new Notice("Publishing wiki...", 0);
      try {
        const out = await Promise.all(
          result.files.map(async (f) => {
            if (f.text !== undefined) return { path: f.path, data: f.text };
            const file = this.app.vault.getAbstractFileByPath(f.copyFrom!);
            if (!(file instanceof TFile)) throw new Error(`Image not found: ${f.copyFrom}`);
            return { path: f.path, data: await this.app.vault.readBinary(file) };
          }),
        );
        const message = `Publish wiki: ${result.published.length} pages`;
        // "New since Session N" on the home page: compare with the last Publish
        const today = new Date().toISOString().slice(0, 10);
        const pushed = await pushWiki(this.settings, out, message, {
          path: "wiki-changes.json",
          update: (previous, files) => {
            const text = files.filter((f): f is { path: string; data: string } => typeof f.data === "string");
            const r = trackChanges(text.map((f) => ({ path: f.path, text: f.data })), previous, today, YAML);
            const home = text.find((f) => f.path === "index.md");
            if (home) {
              const h = { path: home.path, text: home.data };
              setProps(h, { mw_changes: { since: r.since, items: r.items } }, YAML);
              home.data = h.text!;
            }
            return { files, state: r.state };
          },
        });
        notice.hide();
        new Notice(pushed.changed ? "Wiki published. The site updates in a minute or two." : "Nothing has changed since the last publish.");
      } catch (e) {
        notice.hide();
        new Notice(`Publish failed: ${(e as Error).message}`, 10000);
        console.error(e);
      }
    }, { ...DEFAULT_SETTINGS.sectionTitles, ...this.settings.sectionTitles }).open();
  }
}

// Shows every page that will go public, before anything is sent.
class ConfirmModal extends Modal {
  constructor(app: App, private result: ExportResult, private onConfirm: () => void, private sectionTitles: Record<string, string> = {}) {
    super(app);
  }

  onOpen() {
    const { contentEl, modalEl } = this;
    modalEl.addClass("mw-pub-modal");
    contentEl.createEl("h2", { text: "Publish wiki" });
    const images = this.result.files.filter((f) => f.copyFrom).length;
    contentEl.createEl("p", { text: `${this.result.published.length} pages and ${images} images will be public.` });

    // Counts by wiki section: "People 24", "Places 10"...
    const groups = new Map<string, { title: string; to: string }[]>();
    for (const p of this.result.published) {
      const section = p.to.includes("/") ? p.to.split("/")[0] : "";
      if (!groups.has(section)) groups.set(section, []);
      groups.get(section)!.push(p);
    }
    const nameOf = (section: string) => (section ? (this.sectionTitles[section] ?? section.replace(/-/g, " ")) : "Other pages");
    const order = [...groups.keys()].sort((a, b) => (a === "" ? 1 : b === "" ? -1 : nameOf(a).localeCompare(nameOf(b))));
    const counts = contentEl.createDiv({ cls: "mw-pub-counts" });
    for (const section of order) {
      const row = counts.createDiv({ cls: "mw-pub-count" });
      row.createSpan({ text: nameOf(section) });
      row.createSpan({ cls: "mw-pub-n", text: String(groups.get(section)!.length) });
    }

    // The full list, folded away
    const details = contentEl.createEl("details", { cls: "mw-pub-files" });
    details.createEl("summary", { text: "See files" });
    for (const section of order) {
      details.createEl("h4", { text: nameOf(section) });
      const list = details.createEl("ul");
      for (const p of groups.get(section)!.sort((a, b) => a.title.localeCompare(b.title))) {
        const li = list.createEl("li", { text: p.title });
        li.createSpan({ cls: "mw-pub-path", text: `  ${p.to}` });
      }
    }

    new Setting(contentEl)
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()))
      .addButton((b) =>
        b.setButtonText("Publish").setCta().onClick(() => {
          this.close();
          this.onConfirm();
        }),
      );
  }

  onClose() {
    this.contentEl.empty();
  }
}

class WikiSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: MachineWorldWiki) {
    super(app, plugin);
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;
    const save = () => this.plugin.saveSettings();

    new Setting(containerEl)
      .setName("GitHub token")
      .setDesc("A fine-grained token with access to the wiki repo only (Contents: read and write).")
      .addText((t) => {
        t.inputEl.type = "password";
        t.setValue(s.token).onChange((v) => { s.token = v.trim(); save(); });
      });
    new Setting(containerEl).setName("GitHub user").addText((t) => t.setValue(s.owner).onChange((v) => { s.owner = v.trim(); save(); }));
    new Setting(containerEl).setName("Repo").addText((t) => t.setValue(s.repo).onChange((v) => { s.repo = v.trim(); save(); }));
    new Setting(containerEl).setName("Branch").addText((t) => t.setValue(s.branch).onChange((v) => { s.branch = v.trim(); save(); }));
    new Setting(containerEl).setName("Your campaign").setHeading();
    new Setting(containerEl)
      .setName("World name")
      .setDesc('The home page says "Welcome to …". Leave empty for just "Welcome".')
      .addText((t) => t.setValue(s.worldName).onChange((v) => { s.worldName = v; save(); }));
    new Setting(containerEl)
      .setName("Year names")
      .setDesc('How years are written: year 1 onwards (e.g. "YC" for "100 YC"), and years before 1 (e.g. "BL"). Either can be empty.')
      .addText((t) => t.setPlaceholder("After, e.g. YC").setValue(s.yearAfter).onChange((v) => { s.yearAfter = v; save(); }))
      .addText((t) => t.setPlaceholder("Before, e.g. BL").setValue(s.yearBefore).onChange((v) => { s.yearBefore = v; save(); }));
    new Setting(containerEl)
      .setName("Second calendar (optional)")
      .setDesc("If another country names the months differently. Its name, then its month names, one per line, in the same order as Calendarium's.")
      .addText((t) => t.setPlaceholder("e.g. the old calendar").setValue(s.secondCalendarLabel).onChange((v) => { s.secondCalendarLabel = v; save(); }))
      .addTextArea((t) => t.setValue(s.secondCalendarMonths.join("\n")).onChange((v) => { s.secondCalendarMonths = v.split("\n").map((x) => x.trim()).filter(Boolean); save(); }));
    new Setting(containerEl).setName("Folders").setHeading();
    new Setting(containerEl)
      .setName("Player Pages folder")
      .setDesc("Notes in here are published whole. Never put secrets in it.")
      .addText((t) => t.setValue(s.playerPagesFolder).onChange((v) => { s.playerPagesFolder = v.trim(); save(); }));
    new Setting(containerEl)
      .setName("Player art folder")
      .setDesc("One note per picture, for the Gallery page. Everything in these notes is published.")
      .addText((t) => t.setValue(s.galleryFolder).onChange((v) => { s.galleryFolder = v.trim(); save(); }));
    new Setting(containerEl)
      .setName("People web groups note")
      .setDesc("Lists each group under its type (location, collective, religion, government), for the people web's colours.")
      .addText((t) => t.setValue(s.groupTypesNote).onChange((v) => { s.groupTypesNote = v.trim(); save(); }));
    new Setting(containerEl)
      .setName("Menu sections")
      .setDesc("One per line: vault folder = wiki section. The longest matching folder wins.")
      .addTextArea((t) => {
        t.inputEl.rows = 10;
        t.inputEl.style.width = "100%";
        t.setValue(s.sections.map((r) => `${r.folder} = ${r.section}`).join("\n")).onChange((v) => {
          s.sections = v
            .split("\n")
            .map((line) => line.split("="))
            .filter((parts) => parts.length === 2 && parts[0].trim())
            .map(([folder, section]) => ({ folder: folder.trim(), section: section.trim() }));
          save();
        });
      });

    containerEl.createEl("h3", { text: "Calendar and timeline" });
    new Setting(containerEl)
      .setName("Public event categories")
      .setDesc("Calendarium categories whose events always show, one per line. Other events only show if their description has #player in it. Descriptions never show, apart from the lines you write for the party: \"#player: Name\" and \"#player-info: One line\".")
      .addTextArea((t) => {
        t.inputEl.rows = 4;
        t.setValue(s.publicCategories.join("\n")).onChange((v) => {
          s.publicCategories = v.split("\n").map((x) => x.trim()).filter(Boolean);
          save();
        });
      });
    new Setting(containerEl)
      .setName("Publish the timeline")
      .setDesc("Off until the party knows enough history. The calendar is always published.")
      .addToggle((t) => t.setValue(s.publishTimeline).onChange((v) => { s.publishTimeline = v; save(); }));

    containerEl.createEl("h3", { text: "Moodboards" });
    new Setting(containerEl)
      .setName("Pinterest token")
      .setDesc("The read-only token from the Pinterest developer portal (pins:read, boards:read). It lasts 30 days. Moodboards update each time you publish.")
      .addText((t) => {
        t.inputEl.type = "password";
        t.setValue(s.pinterestToken).onChange((v) => { s.pinterestToken = v.trim(); save(); });
      });
  }
}
