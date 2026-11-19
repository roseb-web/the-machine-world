// "Edit event" and "New event" for Calendarium events, opened from the timeline.
//
// Calendarium doesn't let other plugins open its own editor, so this is our own form.
// It saves the same way Calendarium's editor does: it changes the calendar Calendarium
// holds in memory, tells Calendarium's event store, then asks Calendarium to save.
// Because the change goes through Calendarium, Obsidian can stay open.
//
// If Calendarium has changed and those pieces aren't there, the form says so and changes nothing.

import { AbstractInputSuggest, App, Modal, Notice, Setting, TFile } from "obsidian";
import { composeDescription, dmText, isMarked, playerInfo, playerName } from "../../shared/events";

interface Day {
  year: number;
  month: number;
  day: number;
}

export interface CalEvent {
  id: string;
  name: string;
  description?: string | null;
  date: { year: number | null | (number | null)[]; month: number; day: number };
  end?: Day | null;
  note?: string | null;
  category?: string | null;
  sort?: { timestamp: number; order: string };
  type?: string;
  [key: string]: unknown;
}

interface LiveCalendar {
  id: string;
  name: string;
  events: CalEvent[];
  categories?: { id: string; name: string }[];
  static: { months: { name: string; length: number }[] };
  current: Day;
}

interface CalendariumPlugin {
  calendars: LiveCalendar[];
  data?: { defaultCalendar?: string };
  getStoreByCalendar: (c: LiveCalendar) => { eventStore: { insertEvents: (...e: CalEvent[]) => void; removeEvents: (...e: CalEvent[]) => void } };
  settings$: { save: (o?: { calendar?: boolean }) => Promise<void> };
}

// Calendarium, if it's loaded and works the way this form expects
export function calendarium(app: App): { plugin: CalendariumPlugin; calendar: LiveCalendar } | null {
  const plugin = (app as unknown as { plugins: { plugins: Record<string, unknown> } }).plugins.plugins["calendarium"] as CalendariumPlugin | undefined;
  try {
    if (!plugin || !Array.isArray(plugin.calendars) || typeof plugin.getStoreByCalendar !== "function" || typeof plugin.settings$?.save !== "function")
      return null;
    const calendar = plugin.calendars.find((c) => c.id === plugin.data?.defaultCalendar) ?? plugin.calendars[0];
    if (!calendar || !Array.isArray(calendar.events)) return null;
    const store = plugin.getStoreByCalendar(calendar);
    if (typeof store?.eventStore?.insertEvents !== "function" || typeof store.eventStore.removeEvents !== "function") return null;
    return { plugin, calendar };
  } catch {
    return null;
  }
}

const CANT = "Couldn't reach Calendarium, so nothing was changed. Edit this event in Calendarium instead.";

class NoteSuggest extends AbstractInputSuggest<TFile> {
  constructor(app: App, private input: HTMLInputElement, private onPick: (f: TFile) => void) {
    super(app, input);
  }
  getSuggestions(q: string): TFile[] {
    const query = q.toLowerCase();
    return this.app.vault
      .getMarkdownFiles()
      .filter((f) => f.path.toLowerCase().includes(query))
      .slice(0, 30);
  }
  renderSuggestion(f: TFile, el: HTMLElement) {
    el.createDiv({ text: f.basename });
    el.createDiv({ text: f.parent?.path ?? "", cls: "mw-ev-suggest-path" });
  }
  selectSuggestion(f: TFile) {
    this.input.value = f.basename;
    this.onPick(f);
    this.close();
  }
}

export class EventModal extends Modal {
  private saved = false;

  constructor(
    app: App,
    private existing: CalEvent | null, // null: a new event
    private publicCategories: string[],
    private onDone: () => void,
  ) {
    super(app);
  }

  onOpen() {
    const cal = calendarium(this.app);
    const { contentEl } = this;
    contentEl.empty();
    this.modalEl.addClass("mw-ev-modal");
    this.titleEl.setText(this.existing ? "Edit event" : "New event");
    if (!cal) {
      contentEl.createEl("p", { text: CANT });
      return;
    }
    const { calendar } = cal;
    const months = calendar.static.months;
    const ev = this.existing;
    const desc = ev?.description ?? "";

    // The form's values
    const today = calendar.current;
    const startY = ev && typeof ev.date.year === "number" ? ev.date.year : today.year;
    const v = {
      name: ev?.name ?? "",
      category: ev?.category ?? "",
      note: ev?.note ?? "",
      start: { day: ev?.date.day ?? today.day, month: ev?.date.month ?? today.month, year: startY },
      end: ev?.end ? { ...ev.end } : (null as Day | null),
      show: ev ? isMarked(ev) : false,
      partyName: playerName(desc) ?? "",
      partyInfo: playerInfo(desc) ?? "",
      dm: dmText(desc),
    };

    // ---- The event ----
    contentEl.createDiv({ cls: "mw-ev-section", text: "The event" });
    new Setting(contentEl).setName("Name").setDesc("Your name for it. The party never sees this unless you leave their name empty.").addText((t) => {
      t.setValue(v.name).onChange((x) => (v.name = x));
      t.inputEl.addClass("mw-ev-wide");
      window.setTimeout(() => t.inputEl.focus(), 0);
    });
    new Setting(contentEl).setName("Category").addDropdown((d) => {
      d.addOption("", "None");
      for (const c of calendar.categories ?? []) d.addOption(c.id, c.name);
      d.setValue(v.category).onChange((x) => {
        v.category = x;
        drawShow();
      });
    });
    new Setting(contentEl).setName("Linked note").setDesc("Optional. Its page gets a date card, and the pop-up links to it.").addText((t) => {
      const file = v.note ? this.app.vault.getAbstractFileByPath(v.note) : null;
      t.setValue(file instanceof TFile ? file.basename : v.note).setPlaceholder("Start typing a note name");
      new NoteSuggest(this.app, t.inputEl, (f) => (v.note = f.path));
      t.onChange((x) => {
        if (!x.trim()) v.note = "";
      });
    });

    const dateRow = (label: string, desc: string, get: () => Day | null, set: (d: Day | null) => void, optional: boolean) => {
      const s = new Setting(contentEl).setName(label).setDesc(desc);
      s.controlEl.addClass("mw-ev-date");
      const d0 = get();
      const dayIn = s.controlEl.createEl("input", { type: "number", cls: "mw-ev-day" });
      dayIn.min = "1";
      dayIn.placeholder = "Day";
      const monthIn = s.controlEl.createEl("select", { cls: "dropdown" });
      if (optional) monthIn.createEl("option", { text: "Month", value: "" });
      months.forEach((m, i) => monthIn.createEl("option", { text: m.name, value: String(i) }));
      const yearIn = s.controlEl.createEl("input", { type: "number", cls: "mw-ev-year" });
      yearIn.min = "0";
      yearIn.placeholder = "Year";
      const eraIn = s.controlEl.createEl("select", { cls: "dropdown" });
      eraIn.createEl("option", { text: "YC", value: "YC" });
      eraIn.createEl("option", { text: "BL", value: "BL" });
      if (d0) {
        dayIn.value = String(d0.day);
        monthIn.value = String(d0.month);
        yearIn.value = String(Math.abs(d0.year));
        eraIn.value = d0.year >= 1 ? "YC" : "BL";
      }
      const read = () => {
        if (optional && !dayIn.value && !monthIn.value && !yearIn.value) return set(null);
        const y = Number(yearIn.value || 0);
        set({ day: Number(dayIn.value || 1), month: Number(monthIn.value || 0), year: eraIn.value === "BL" ? -y : y });
      };
      for (const el of [dayIn, monthIn, yearIn, eraIn]) el.addEventListener("change", read);
    };
    dateRow("Starts", "", () => v.start, (d) => d && (v.start = d), false);
    dateRow("Ends", "Optional. Fill in for an era or anything that lasts.", () => v.end, (d) => (v.end = d), true);

    // ---- What the party sees ----
    contentEl.createDiv({ cls: "mw-ev-section", text: "What the party sees" });
    const showSetting = new Setting(contentEl).setName("Show on the wiki");
    let showToggle: { setValue: (b: boolean) => unknown; setDisabled: (b: boolean) => unknown } | null = null;
    showSetting.addToggle((t) => {
      showToggle = t;
      t.setValue(v.show).onChange((x) => (v.show = x));
    });
    const drawShow = () => {
      const always = this.publicCategories.includes(v.category);
      showSetting.setDesc(
        always
          ? "Always shown: everything in this category is public. The party sees the name below if you give one."
          : "Only the name and line below are published. Your notes never are.",
      );
      showToggle?.setDisabled(always);
      if (always) showToggle?.setValue(true);
    };
    drawShow();
    new Setting(contentEl).setName("Name the party sees").setDesc("Leave empty to use your name for it.").addText((t) => {
      t.setValue(v.partyName).onChange((x) => (v.partyName = x));
      t.inputEl.addClass("mw-ev-wide");
    });
    new Setting(contentEl).setName("One line they know").setDesc("Optional. Shown in the timeline's pop-up.").addText((t) => {
      t.setValue(v.partyInfo).onChange((x) => (v.partyInfo = x));
      t.inputEl.addClass("mw-ev-wide");
    });

    // ---- DM notes ----
    contentEl.createDiv({ cls: "mw-ev-section", text: "🔒 DM notes, never published" });
    const notes = contentEl.createEl("textarea", { cls: "mw-ev-notes" });
    notes.value = v.dm;
    notes.rows = 4;
    notes.addEventListener("input", () => (v.dm = notes.value));

    // ---- Buttons ----
    const err = contentEl.createDiv({ cls: "mw-ev-error" });
    const buttons = contentEl.createDiv({ cls: "mw-ev-buttons" });
    if (ev) {
      const del = buttons.createEl("button", { text: "Delete", cls: "mod-warning" });
      del.addEventListener("click", async () => {
        if (!del.hasClass("mw-confirm")) {
          del.addClass("mw-confirm");
          del.setText("Click again to delete");
          return;
        }
        if (await this.remove(ev)) {
          this.saved = true;
          this.close();
        }
      });
    }
    buttons.createDiv({ cls: "mw-ev-spacer" });
    buttons.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.close());
    const save = buttons.createEl("button", { text: "Save", cls: "mod-cta" });
    save.addEventListener("click", async () => {
      err.setText("");
      if (!v.name.trim()) return err.setText("Give the event a name.");
      if (v.end && v.end.year * 1000 + v.end.month * 50 + v.end.day < v.start.year * 1000 + v.start.month * 50 + v.start.day)
        return err.setText("The end is before the start.");
      const always = this.publicCategories.includes(v.category);
      const next: CalEvent = {
        ...(ev ?? {}),
        id: ev?.id ?? `ID_${Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, "0")).join("")}`,
        name: v.name.trim(),
        description: composeDescription(v.dm, v.show && !always, v.partyName, v.partyInfo) || null,
        date: { ...v.start },
        end: v.end ? { ...v.end } : undefined,
        note: v.note || null,
        category: v.category || null,
        sort: ev?.sort ?? { timestamp: Number.MIN_VALUE, order: "" },
        type: ev?.type === "Recurring" ? "Recurring" : v.end ? "Range" : "Date",
      };
      if (!v.end) delete next.end;
      if (await this.store(next)) {
        this.saved = true;
        this.close();
      }
    });
  }

  // Save through Calendarium, the way its own editor does
  private async store(e: CalEvent): Promise<boolean> {
    const cal = calendarium(this.app);
    if (!cal) {
      new Notice(CANT);
      return false;
    }
    try {
      const { plugin, calendar } = cal;
      const i = calendar.events.findIndex((x) => x.id === e.id);
      if (i >= 0) calendar.events.splice(i, 1, e);
      else calendar.events.push(e);
      plugin.getStoreByCalendar(calendar).eventStore.insertEvents(e);
      await plugin.settings$.save({ calendar: true });
      new Notice(`Saved “${e.name}”`);
      return true;
    } catch (x) {
      console.error("Machine World Wiki: saving the event failed", x);
      new Notice("Saving didn't work. Check the event in Calendarium.");
      return false;
    }
  }

  private async remove(e: CalEvent): Promise<boolean> {
    const cal = calendarium(this.app);
    if (!cal) {
      new Notice(CANT);
      return false;
    }
    try {
      const { plugin, calendar } = cal;
      const live = calendar.events.find((x) => x.id === e.id);
      if (live) plugin.getStoreByCalendar(calendar).eventStore.removeEvents(live);
      calendar.events = calendar.events.filter((x) => x.id !== e.id);
      await plugin.settings$.save({ calendar: true });
      new Notice(`Deleted “${e.name}”`);
      return true;
    } catch (x) {
      console.error("Machine World Wiki: deleting the event failed", x);
      new Notice("Deleting didn't work. Check the event in Calendarium.");
      return false;
    }
  }

  onClose() {
    this.contentEl.empty();
    if (this.saved) this.onDone();
  }
}
