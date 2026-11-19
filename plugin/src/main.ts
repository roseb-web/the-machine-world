// The Machine World Wiki plugin.
// Adds a "Publish wiki" button. It exports only player content, shows you the list of pages,
// and pushes to GitHub only after you confirm.

import { App, Modal, Notice, parseYaml, Plugin, PluginSettingTab, requestUrl, Setting, stringifyYaml, TFile } from "obsidian";
import { boardKey, fetchMoodboards, MoodPin, PinterestAuthError } from "../../shared/pinterest";
import { exportWiki, ExportOptions, ExportResult, SectionRule } from "../../shared/export";
import { pushWiki } from "./github";
import { TIMELINE_VIEW, TimelineView } from "./timeline-view";
import { gameDateFrom } from "../../shared/calendar";

interface WikiSettings {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  contentPath: string;
  playerPagesFolder: string;
  defaultSection: string;
  sections: SectionRule[];
  sectionTitles: Record<string, string>;
  publicCategories: string[]; // Calendarium category names whose events are always public
  publishTimeline: boolean;
  pinterestToken: string; // read-only token from the Pinterest developer portal
  moodboardCache: Record<string, MoodPin[]>; // last good pins, used if Pinterest can't be reached
}

const DEFAULT_SETTINGS: WikiSettings = {
  token: "",
  owner: "roseb-web",
  repo: "the-machine-world",
  branch: "main",
  contentPath: "content",
  playerPagesFolder: "5. Wiki/Player Pages",
  defaultSection: "misc",
  sections: [
    { folder: "4. People/NPCs", section: "people" },
    { folder: "4. People/PCs", section: "party" },
    { folder: "4. People/Factions", section: "factions" },
    { folder: "2. World & Lore/Gods", section: "gods" },
    { folder: "2. World & Lore", section: "lore" },
    { folder: "3. Vaharan", section: "places" },
    { folder: "1. Campaign/Session Notes", section: "sessions" },
    { folder: "1. Campaign", section: "quests" },
    { folder: "Items", section: "items" },
  ],
  sectionTitles: {
    people: "People",
    party: "The party",
    factions: "Factions",
    gods: "Gods",
    lore: "Lore",
    places: "Places",
    sessions: "Session recaps",
    quests: "Quest log",
    items: "Items",
  },
  publicCategories: ["Festivals", "Star signs", "The party"],
  publishTimeline: false,
  pinterestToken: "",
  moodboardCache: {},
};

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
  }

  async openTimeline() {
    const existing = this.app.workspace.getLeavesOfType(TIMELINE_VIEW)[0];
    const leaf = existing ?? this.app.workspace.getLeaf("tab");
    if (!existing) await leaf.setViewState({ type: TIMELINE_VIEW, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  // Calendarium's settings file, or null if it isn't there
  async readCalendarium(): Promise<unknown | null> {
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
        gameDate = gameDateFrom(data);
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
      calendar,
      moodboards,
      sections: this.settings.sections,
      defaultSection: this.settings.defaultSection,
      playerPagesFolder: this.settings.playerPagesFolder,
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
        const pushed = await pushWiki(this.settings, out, message);
        notice.hide();
        new Notice(pushed.changed ? "Wiki published. The site updates in a minute or two." : "Nothing has changed since the last publish.");
      } catch (e) {
        notice.hide();
        new Notice(`Publish failed: ${(e as Error).message}`, 10000);
        console.error(e);
      }
    }).open();
  }
}

// Shows every page that will go public, before anything is sent.
class ConfirmModal extends Modal {
  constructor(app: App, private result: ExportResult, private onConfirm: () => void) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Publish wiki" });
    const images = this.result.files.filter((f) => f.copyFrom).length;
    contentEl.createEl("p", {
      text: `${this.result.published.length} pages and ${images} images will be public.`,
    });
    const list = contentEl.createEl("ul");
    for (const p of [...this.result.published].sort((a, b) => a.to.localeCompare(b.to))) {
      list.createEl("li", { text: `${p.title}  (${p.to})` });
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
    new Setting(containerEl)
      .setName("Player Pages folder")
      .setDesc("Notes in here are published whole. Never put secrets in it.")
      .addText((t) => t.setValue(s.playerPagesFolder).onChange((v) => { s.playerPagesFolder = v.trim(); save(); }));
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
      .setDesc("Calendarium categories whose events always show, one per line. Other events only show if their description has #player in it. Descriptions never show.")
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
