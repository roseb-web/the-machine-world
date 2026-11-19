// The timeline view in Obsidian: every dated event, including private ones.
// "Player view" shows only what the wiki would publish. Click an event to open its note.

import { ItemView, parseYaml, TFile, WorkspaceLeaf } from "obsidian";
import { renderTimeline, TimelineEvent } from "../../shared/timeline-render";
import { calendarExport, CalendarExport, parseFcDate } from "../../shared/events";
import type MachineWorldWiki from "./main";

export const TIMELINE_VIEW = "machine-world-timeline";

interface RawEvent {
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
        private: !pubKeys.has(keyOf(ev.name, date)),
        ...(ev.note ? { notePath: ev.note } : {}),
      });
    }
    for (const file of this.app.vault.getMarkdownFiles()) {
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
      const date = fm?.["fc-date"] ? parseFcDate(String(fm["fc-date"])) : null;
      if (!date) continue;
      const pub = result.published.find((p) => p.from === file.path);
      const name = pub?.title ?? file.basename;
      all.push({ name, category: String(fm?.["fc-category"] ?? ""), date, private: !pubKeys.has(keyOf(name, date)), notePath: file.path });
    }

    const shown = this.playerView ? all.filter((e) => !e.private) : all;
    const base = calendarExport(data, { publicCategories: [], published: () => undefined, noteEvents: [] });
    if (!base) return;
    const used = new Set(shown.map((e) => e.category));
    renderTimeline(
      body,
      { ...base, categories: (cal.categories ?? []).filter((c) => used.has(c.id)), events: shown },
      {
        startHidden: ["the party"],
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
        text: "Italic events with a “not published” tag stay off the wiki. To publish one, put #player in its description in Calendarium (festivals, star signs and sessions publish on their own).",
      });
    }
  }
}

