// The home page boxes: "Previously on…", "New since Session N", "Coming up",
// then the quest log (pinned, active quests, main quests first).
// Also the quest log page: the folder page of a folder of quests (Active, Not started, Finished).
// The data comes from Publish: mw_last_session, mw_changes and mw_coming_up on the home page.

import type { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "@quartz-community/types"
import { pathToRoot, resolveRelative } from "@quartz-community/utils"
import style from "./QuestLog.css"
import { Connected, ConnectedChips, connectedOf } from "../../../page-header/src/components/header"

const ORDER = ["main", "personal", "faction", "side"]
const LABELS: Record<string, string> = { main: "Main", personal: "Personal", faction: "Faction", side: "Side" }

interface LastSession {
  to: string
  session: string
  title?: string
  date?: string
  lead?: string
  points?: string[]
}
interface Change {
  to: string
  title: string
  kind: "new" | "updated"
  section: string
}
interface Upcoming {
  name: string
  kind: string
  date: string
  days: number
}

const SHOWN = 5

function HomeBoxes({ fm, go }: { fm: Record<string, unknown>; go: (to: string) => string }) {
  const last = fm.mw_last_session as LastSession | undefined
  const changes = fm.mw_changes as { since: string | null; items: Change[] } | undefined
  const upcoming = (fm.mw_coming_up as Upcoming[] | undefined) ?? []
  const items = changes?.items ?? []
  const row = (c: Change) => (
    <li class="mw-home-change">
      <span class={`mw-home-tag mw-home-${c.kind}`}>{c.kind === "new" ? "New" : "Updated"}</span>
      <a href={go(c.to)} class="internal">
        {c.title}
      </a>
      <small>{c.section}</small>
    </li>
  )
  if (!last && !items.length && !upcoming.length) return null
  return (
    <div class="mw-home">
      {last && (
        <a href={go(last.to)} class="internal mw-home-prev">
          <span class="mw-home-prev-inner">
            <span class="mw-home-kicker">
              Previously on… · {last.session}
              {last.date && <span class="mw-home-prev-date">{last.date}</span>}
            </span>
            <span class="mw-home-prev-title">{last.title ?? last.session}</span>
            {last.lead && <span class="mw-home-prev-lead">{last.lead}</span>}
            {last.points && last.points.length > 0 && (
              <ul>
                {last.points.map((p) => (
                  <li>{p}</li>
                ))}
              </ul>
            )}
            <span class="mw-home-more">Read the whole recap →</span>
          </span>
        </a>
      )}
      {(items.length > 0 || upcoming.length > 0) && (
        <div class="mw-home-boxes">
          {items.length > 0 && (
            <section class="mw-home-box">
              <h3>{changes?.since ? `New since ${changes.since}` : "Recently updated"}</h3>
              <ul class="mw-home-list">{items.slice(0, SHOWN).map(row)}</ul>
              {items.length > SHOWN && (
                <details class="mw-home-all">
                  <summary>Show all ({items.length})</summary>
                  <ul class="mw-home-list">{items.slice(SHOWN).map(row)}</ul>
                </details>
              )}
            </section>
          )}
          {upcoming.length > 0 && (
            <section class="mw-home-box">
              <h3>Coming up</h3>
              <ul class="mw-home-list">
                {upcoming.map((u) => (
                  <li class="mw-home-soon">
                    <span class="mw-home-days">
                      {u.days === 0 ? (
                        <b>Today</b>
                      ) : (
                        <>
                          <b>{u.days}</b>
                          {u.days === 1 ? "day" : "days"}
                        </>
                      )}
                    </span>
                    <span>
                      {u.name}
                      <small>
                        {u.kind} · {u.date}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
              <a href={go("calendar")} class="internal mw-home-link">
                Full calendar →
              </a>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

// ---- The quest log page: the folder page of a folder of quests ----

type File = QuartzComponentProps["allFiles"][number]
const STATUS_LABELS: Record<string, string> = { "not started": "Not started", active: "Active", completed: "Completed", failed: "Failed", missed: "Missed" }
// "Not Started", "not_started", "not-started" all mean the same. No status: active.
const statusOf = (fm: Record<string, unknown>) => {
  const s = typeof fm.quest_status === "string" ? fm.quest_status.trim().toLowerCase().replace(/[-_]+/g, " ") : ""
  return s || "active"
}
const sessionNum = (v: unknown) => Number(String(v ?? "").match(/\d+/)?.[0] ?? 0)

function QuestLanding({ slug, allFiles }: { slug: string; allFiles: File[] }) {
  const inside = slug.slice(0, -"index".length)
  const quests = allFiles
    .filter((f) => {
      const s = String(f.slug ?? "")
      return s.startsWith(inside) && s !== slug && typeof (f.frontmatter as Record<string, unknown> | undefined)?.quest === "string"
    })
    .map((f) => ({ f, fm: (f.frontmatter ?? {}) as Record<string, unknown> }))
  if (!quests.length) return null
  const go = (f: File) => resolveRelative(slug as never, String(f.slug) as never)
  const title = (q: (typeof quests)[number]) => String(q.fm.title ?? q.f.slug)
  const type = (q: (typeof quests)[number]) => String(q.fm.quest).toLowerCase()
  // Main quests first, then by type, then by name
  const byType = (a: (typeof quests)[number], b: (typeof quests)[number]) =>
    (ORDER.indexOf(type(a)) + 99) % 99 - (ORDER.indexOf(type(b)) + 99) % 99 || title(a).localeCompare(title(b))
  const active = quests.filter((q) => statusOf(q.fm) === "active").sort(byType)
  const notStarted = quests.filter((q) => statusOf(q.fm) === "not started").sort(byType)
  // Finished: newest first (by their latest session)
  const finished = quests
    .filter((q) => !["active", "not started"].includes(statusOf(q.fm)))
    .sort((a, b) => sessionNum(b.fm.mw_quest_last) - sessionNum(a.fm.mw_quest_last) || title(a).localeCompare(title(b)))
  const types = ORDER.filter((t) => quests.some((q) => type(q) === t))

  // ---- Connected to: what the filter can pick, and which quests each one matches ----
  // Everything tagged on a quest, plus the homes of tagged people (so their place can be picked).
  // A place matches quests tagged with it, with places inside it, or with people who live there.
  const picks = new Map<string, Connected & { n: number }>()
  for (const q of quests)
    for (const c of connectedOf(q.fm)) {
      if (!picks.has(c.to)) picks.set(c.to, { ...c, n: 0 })
      if (c.home && c.group && !picks.has(c.home)) picks.set(c.home, { to: c.home, title: c.group, kind: "place", n: 0 })
    }
  const folderOf = (to: string) => to.replace(/\/index$/, "")
  const within = (to: string | undefined, place: string) => !!to && (to === place || folderOf(to).startsWith(folderOf(place) + "/"))
  const matchesOf = (q: (typeof quests)[number]) => {
    const conn = connectedOf(q.fm)
    const keys = new Set(conn.map((c) => c.to))
    for (const p of picks.values())
      if (p.kind === "place" && conn.some((c) => (c.kind === "place" && within(c.to, p.to)) || within(c.home, p.to))) keys.add(p.to)
    return [...keys]
  }
  const matches = new Map(quests.map((q) => [q, matchesOf(q)]))
  for (const keys of matches.values()) for (const k of keys) if (picks.has(k)) picks.get(k)!.n++
  // In the list: the party, people by where they live, factions, places, anything else
  const groupOf = (p: Connected) =>
    p.kind === "party" ? "Party" : p.kind === "person" ? (p.group ? `People · ${p.group}` : "People") : p.kind === "faction" ? "Factions" : p.kind === "place" ? "Places" : "Other"
  const rank = (g: string) => (g === "Party" ? 0 : g.startsWith("People") ? 1 : g === "Factions" ? 2 : g === "Places" ? 3 : 4)
  const pickList = [...picks.values()]
    .map((p) => ({ to: p.to, title: p.title, kind: p.kind, img: p.img, n: p.n, group: groupOf(p) }))
    .sort((a, b) => rank(a.group) - rank(b.group) || a.group.localeCompare(b.group) || a.title.localeCompare(b.title))

  const card = (q: (typeof quests)[number], when: string | undefined) => {
    const t = type(q)
    const main = t === "main" && statusOf(q.fm) === "active"
    // The start of the Overview (Quartz's description runs on into the rest of the page)
    const summary = typeof q.f.description === "string" ? q.f.description.replace(/^Overview\s+/, "").split(/\s+What we know\b/)[0] : ""
    const handouts = Array.isArray(q.fm.player_handouts) ? q.fm.player_handouts.length : 0
    const meta = [when, handouts ? `${handouts} handout${handouts === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ")
    return (
      <a href={go(q.f)} class={`internal mw-ql-card ${main ? "mw-ql-main" : ""}`} data-type={t} data-match={matches.get(q)!.join("|")}>
        <span class={`mw-quest-type mw-quest-${t}`}>{main ? "Main quest" : (LABELS[t] ?? t)}</span>
        <span class="mw-ql-title">{title(q)}</span>
        {summary && <span class="mw-ql-summary">{summary}</span>}
        {connectedOf(q.fm).length > 0 && <ConnectedChips items={connectedOf(q.fm)} slug={slug} links={false} />}
        {meta && <span class="mw-ql-meta">{meta}</span>}
      </a>
    )
  }
  const section = (name: string, cls: string, items: typeof quests, body: any) =>
    items.length > 0 && (
      <section class={`mw-ql-section ${cls}`}>
        <h2>
          {name} <span class="mw-ql-count">{items.length}</span>
        </h2>
        {body}
      </section>
    )

  return (
    <div class="mw-ql">
      <p class="mw-ql-lead">What the party has taken on, heard about, and left behind.</p>
      {(types.length > 1 || pickList.length > 0) && (
        <div class="mw-ql-filters">
          {types.length > 1 && (
            <div class="mw-ql-types" role="group" aria-label="Show quests of type">
              <button class="mw-ql-filter mw-on" data-type="">
                All
              </button>
              {types.map((t) => (
                <button class="mw-ql-filter" data-type={t}>
                  {LABELS[t]}
                </button>
              ))}
            </div>
          )}
          {pickList.length > 0 && (
            <div class="mw-ql-pick" data-picks={JSON.stringify(pickList)} data-root={pathToRoot(slug as never)}>
              <input type="search" class="mw-ql-search" placeholder="Connected to…" aria-label="Show quests connected to a person, place or faction" autocomplete="off" />
              <div class="mw-ql-menu" role="listbox" hidden />
              <button class="mw-ql-chip" hidden />
            </div>
          )}
        </div>
      )}
      {section("Active", "mw-ql-active", active, <div class="mw-ql-grid">{active.map((q) => card(q, q.fm.mw_quest_last ? `Updated ${q.fm.mw_quest_last}` : undefined))}</div>)}
      {section("Not started", "mw-ql-not-started", notStarted, <div class="mw-ql-grid">{notStarted.map((q) => card(q, q.fm.mw_quest_first ? `Heard about in ${q.fm.mw_quest_first}` : undefined))}</div>)}
      {section(
        "Finished",
        "mw-ql-finished",
        finished,
        <ul class="mw-ql-list">
          {finished.map((q) => {
            const s = statusOf(q.fm)
            return (
              <li data-type={type(q)} data-match={matches.get(q)!.join("|")}>
                <span class={`mw-ql-status mw-ql-${s.replace(/\s+/g, "-")}`}>{STATUS_LABELS[s] ?? s}</span>
                <a href={go(q.f)} class="internal">
                  {title(q)}
                </a>
                <span class="mw-ql-when">{String(q.fm.mw_quest_last ?? "")}</span>
              </li>
            )
          })}
        </ul>,
      )}
      <p class="mw-ql-none" hidden>
        No quests of this type yet.
      </p>
    </div>
  )
}

// Filters: one type of quest, and/or what it's connected to. Sections with nothing left are hidden.
const FILTER_SCRIPT = `
document.addEventListener("nav", () => {
  const log = document.querySelector(".mw-ql");
  if (!log) return;
  let type = "", pick = "";
  const apply = () => {
    log.querySelectorAll(".mw-ql-filter").forEach((b) => b.classList.toggle("mw-on", b.dataset.type === type));
    let any = false;
    log.querySelectorAll(".mw-ql-section").forEach((sec) => {
      let n = 0;
      sec.querySelectorAll("[data-match]").forEach((item) => {
        const on = (!type || item.dataset.type === type) && (!pick || item.dataset.match.split("|").includes(pick));
        item.hidden = !on;
        if (on) n++;
      });
      sec.hidden = n === 0;
      const count = sec.querySelector(".mw-ql-count");
      if (count) count.textContent = String(n);
      if (n) any = true;
    });
    log.querySelector(".mw-ql-none").hidden = any;
  };
  log.querySelectorAll(".mw-ql-filter").forEach((b) => b.addEventListener("click", () => { type = b.dataset.type; apply(); }));

  // Connected to: type to search, pick from the list (grouped), clear with the chip
  const box = log.querySelector(".mw-ql-pick");
  if (box) {
    const picks = JSON.parse(box.dataset.picks || "[]");
    const root = box.dataset.root || ".";
    const input = box.querySelector(".mw-ql-search");
    const menu = box.querySelector(".mw-ql-menu");
    const chip = box.querySelector(".mw-ql-chip");
    let active = 0, shown = [];
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const icon = (p) => p.img ? '<img src="' + esc(root + "/" + p.img) + '" alt="">' : '<span class="mw-conn-icon">' + ({ faction: "⚑", place: "⌖" }[p.kind] || esc(p.title.charAt(0))) + "</span>";
    const draw = () => {
      const q = input.value.trim().toLowerCase();
      shown = picks.filter((p) => !q || p.title.toLowerCase().includes(q) || p.group.toLowerCase().includes(q));
      active = Math.min(active, Math.max(shown.length - 1, 0));
      let html = "", last = "";
      shown.forEach((p, i) => {
        if (p.group !== last) { html += '<div class="mw-ql-group">' + esc(p.group) + "</div>"; last = p.group; }
        html += '<div class="mw-ql-opt mw-conn-' + p.kind + (i === active ? " mw-on" : "") + '" role="option" data-i="' + i + '">' + icon(p) + "<span>" + esc(p.title) + '</span><small>' + p.n + (p.n === 1 ? " quest" : " quests") + "</small></div>";
      });
      menu.innerHTML = html || '<div class="mw-ql-group">Nothing matches</div>';
      menu.hidden = false;
    };
    const choose = (p) => {
      pick = p.to;
      chip.innerHTML = icon(p) + "<span>" + esc(p.title) + "</span> ✕";
      chip.setAttribute("aria-label", "Stop showing only quests connected to " + p.title);
      chip.hidden = false;
      input.hidden = true;
      menu.hidden = true;
      input.value = "";
      apply();
    };
    input.addEventListener("focus", draw);
    input.addEventListener("input", () => { active = 0; draw(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { active = Math.min(active + 1, shown.length - 1); draw(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { active = Math.max(active - 1, 0); draw(); e.preventDefault(); }
      else if (e.key === "Enter" && shown[active]) { choose(shown[active]); e.preventDefault(); }
      else if (e.key === "Escape") { menu.hidden = true; input.blur(); }
    });
    menu.addEventListener("mousedown", (e) => {
      const opt = e.target.closest(".mw-ql-opt");
      if (opt) { e.preventDefault(); choose(shown[Number(opt.dataset.i)]); }
    });
    input.addEventListener("blur", () => setTimeout(() => (menu.hidden = true), 100));
    chip.addEventListener("click", () => {
      pick = "";
      chip.hidden = true;
      input.hidden = false;
      input.focus();
      apply();
    });
  }
});
`

export default (() => {
  const QuestLog: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
    const slug = String(fileData.slug ?? "")
    const fm = (fileData.frontmatter ?? {}) as Record<string, unknown>
    if (fm.mw_folder === true && slug.endsWith("index")) return <QuestLanding slug={slug} allFiles={allFiles} />
    if (slug !== "index") return null

    const fm0 = (fileData.frontmatter ?? {}) as Record<string, unknown>
    const go = (to: string) => resolveRelative(slug as never, to as never)
    const home = <HomeBoxes fm={fm0} go={go} />

    const quests = allFiles
      .map((f) => ({ f, fm: (f.frontmatter ?? {}) as Record<string, unknown> }))
      .filter(({ fm }) => fm.pinned === true && statusOf(fm) === "active" && typeof fm.quest === "string")
      .sort((a, b) => ORDER.indexOf(String(a.fm.quest)) - ORDER.indexOf(String(b.fm.quest)))
    if (quests.length === 0) return home

    const link = (f: (typeof allFiles)[number]) => resolveRelative(slug as never, String(f.slug) as never)
    const titleOf = (f: (typeof allFiles)[number], fm: Record<string, unknown>) => String(fm.title ?? f.slug)
    const main = quests.filter(({ fm }) => fm.quest === "main")
    const others = quests.filter(({ fm }) => fm.quest !== "main")

    return (
      <>
      {home}
      <section class="mw-quest-log">
        <h2>Active quests</h2>
        {/* Main quests: featured, with the start of their Overview */}
        {main.map(({ f, fm }) => {
          const summary = typeof f.description === "string" ? f.description.replace(/^Overview\s+/, "") : ""
          return (
            <a href={link(f)} class="internal mw-quest-main-card">
              <span class="mw-quest-type mw-quest-main">Main quest</span>
              <span class="mw-quest-main-title">{titleOf(f, fm)}</span>
              {summary && <span class="mw-quest-summary">{summary}</span>}
            </a>
          )
        })}
        {/* Everything else: one compact line each */}
        {others.length > 0 && (
          <ul class="mw-quest-list">
            {others.map(({ f, fm }) => {
              const type = String(fm.quest)
              return (
                <li>
                  <span class={`mw-quest-type mw-quest-${type}`}>{LABELS[type] ?? type}</span>
                  <a href={link(f)} class="internal mw-quest-title">
                    {titleOf(f, fm)}
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      </>
    )
  }

  QuestLog.css = style
  QuestLog.afterDOMLoaded = FILTER_SCRIPT
  return QuestLog
}) satisfies QuartzComponentConstructor
