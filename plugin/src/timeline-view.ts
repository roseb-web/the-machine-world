// The timeline view in Obsidian: every dated event, including private ones.
// "Player view" shows only what the wiki would publish. Click an event to open its note.

import { ItemView, parseYaml, TFile, WorkspaceLeaf } from "obsidian";
import { renderTimeline, TimelineEvent } from "../../shared/timeline-render";
import { calendarExport, CalendarExport, dmText, parseFcDate, playerInfo, playerName } from "../../shared/events";
import type MachineWorldWiki from "./main";
import { CalEvent, calendarium, EventModal } from "./event-modal";

export const TIMELINE_VIEW = "machine-world-timeline";

interface RawEvent {
  id?: string;
  name?: string;
  description?: string | null;
  category?: string | null;
  note?: string | null;
  type?: string;
  date?: { year: number | null | (number | null)[]; month: number; day: number };
  end?: { year: number; month: number; day: number };
}

export class TimelineView extends ItemView {
  private playerView = false;

  constructor(leaf: WorkspaceLeaf, private plugin: MachineWorldWiki) {
    super(leaf);
  }

  getViewType() {
    return TIMELINE_VIEW;
  }
  getDisplayText() {
    return "Timeline";
  }
  getIcon() {
    return "calendar-range";
  }

  async onOpen() {
    await this.draw();
  }

  async draw() {
    const root = this.contentEl;
    root.empty();
    root.addClass("mw-tl-view");

    const bar = root.createDiv({ cls: "mw-tl-bar" });
    const toggle = bar.createEl("label", { cls: "mw-tl-toggle" });
    const box = toggle.createEl("input", { type: "checkbox" });
    box.checked = this.playerView;
    toggle.appendText(" Player view: only what the wiki would show");
    box.addEventListener("change", () => {
      this.playerView = box.checked;
      this.draw();
    });
    const refresh = bar.createEl("button", { text: "Refresh" });
    refresh.addEventListener("click", () => this.draw());

    const body = root.createDiv();
    const data = await this.plugin.readCalendarium();
    if (!data) {
      body.createEl("p", { text: "Calendarium's settings couldn't be read." });
      return;
    }

    // What the wiki would publish: the same rules as Publish wiki
    const result = await this.plugin.buildExport();
    const calFile = result.files.find((f) => f.path === "calendar.md")?.text ?? "";
    const m = calFile.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const published: CalendarExport | null = m ? (parseYaml(m[1]) as { mw_calendar: CalendarExport }).mw_calendar : null;
    const keyOf = (name: string, d: { year: number | null; month: number; day: number }) => `${name}|${d.year}|${d.month}|${d.day}`;
    const pubKeys = new Set((published?.events ?? []).map((e) => keyOf(e.name, e.date)));

    // Everything, DM side: Calendarium's events, plus notes with fc-date
    const cal = (data as { calendars: { categories?: { id: string; name: string }[]; events?: RawEvent[] }[] }).calendars[0];
    const all: (TimelineEvent & { notePath?: string })[] = [];
    for (const ev of cal.events ?? []) {
      if (!ev.name || !ev.date) continue;
      const y = Array.isArray(ev.date.year) ? null : ev.date.year;
      if (y === null || ev.type === "Recurring") continue; // the timeline is years only
      const date = { year: y, month: ev.date.month, day: ev.date.day };
      all.push({
        name: ev.name,
        category: ev.category ?? "",
        date,
        ...(ev.end ? { end: ev.end } : {}),
        private: !pubKeys.has(keyOf(playerName(ev.description) ?? ev.name, date)),
        ...(playerName(ev.description) ? { publicName: playerName(ev.description) } : {}),
        ...(playerInfo(ev.description) ? { info: playerInfo(ev.description) } : {}),
        ...(ev.note ? { notePath: ev.note, openable: true } : {}),
        ...(ev.id ? { editId: ev.id } : {}),
        ...(dmText(ev.description) ? { detail: dmText(ev.description) } : {}),
      });
    }
    for (const file of this.app.vault.getMarkdownFiles()) {
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
      const date = fm?.["fc-date"] ? parseFcDate(String(fm["fc-date"])) : null;
      if (!date) continue;
      const pub = result.published.find((p) => p.from === file.path);
      const name = pub?.title ?? file.basename;
      all.push({ name, category: String(fm?.["fc-category"] ?? ""), date, private: !pubKeys.has(keyOf(name, date)), notePath: file.path, openable: true });
    }

    const shown = this.playerView ? all.filter((e) => !e.private) : all;
    const base = calendarExport(data, { publicCategories: [], published: () => undefined, noteEvents: [], eras: this.plugin.eras() });
    if (!base) return;
    const used = new Set(shown.map((e) => e.category));
    renderTimeline(
      body,
      { ...base, categories: (cal.categories ?? []).filter((c) => used.has(c.id)), events: shown },
      {
        startHidden: ["the party"],
        remember: "obsidian-timeline",
        onEdit: (e) => this.edit(e.editId),
        onNew: () => this.edit(null),
        onOpen: (e) => {
          const path = (e as { notePath?: string }).notePath;
          const file = path ? this.app.vault.getAbstractFileByPath(path) : null;
          if (file instanceof TFile) this.app.workspace.getLeaf(false).openFile(file);
        },
      },
    );
    if (!this.playerView) {
      body.createEl("p", {
        cls: "mw-tl-note",
        text: "Italic events stay off the wiki. Click an event, then Edit, to change it or to switch on “Show on the wiki”.",
      });
    }
  }

  // Open the edit form for a Calendarium event (or a new one), then redraw
  private edit(id: string | null | undefined) {
    const cal = calendarium(this.app);
    const ev: CalEvent | null = id && cal ? (cal.calendar.events.find((e) => e.id === id) ?? null) : null;
    if (id && cal && !ev) return; // gone since the timeline was drawn
    const wanted = new Set(this.plugin.settings.publicCategories.map((n) => n.trim().toLowerCase()));
    const pub = (cal?.calendar.categories ?? []).filter((c) => wanted.has(c.name.toLowerCase()) || wanted.has(c.id.toLowerCase())).map((c) => c.id);
    new EventModal(this.app, ev ? (JSON.parse(JSON.stringify(ev)) as CalEvent) : null, pub, () => this.draw(), this.plugin.eras()).open();
  }
}
