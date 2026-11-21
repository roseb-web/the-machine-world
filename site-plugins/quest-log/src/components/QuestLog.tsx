// The home page boxes: "Previously on…", "New since Session N", "Coming up",
// then the quest log (pinned, active quests, main quests first).
// Also the quest log page: the folder page of a folder of quests (Active, Not started, Finished).
// The data comes from Publish: mw_last_session, mw_changes and mw_coming_up on the home page.

import type { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "@quartz-community/types"
import { resolveRelative } from "@quartz-community/utils"
import style from "./QuestLog.css"

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

  const card = (q: (typeof quests)[number], when: string | undefined) => {
    const t = type(q)
    const main = t === "main" && statusOf(q.fm) === "active"
    // The start of the Overview (Quartz's description runs on into the rest of the page)
    const summary = typeof q.f.description === "string" ? q.f.description.replace(/^Overview\s+/, "").split(/\s+What we know\b/)[0] : ""
    const handouts = Array.isArray(q.fm.player_handouts) ? q.fm.player_handouts.length : 0
    const meta = [when, handouts ? `${handouts} handout${handouts === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ")
    return (
      <a href={go(q.f)} class={`internal mw-ql-card ${main ? "mw-ql-main" : ""}`} data-type={t}>
        <span class={`mw-quest-type mw-quest-${t}`}>{main ? "Main quest" : (LABELS[t] ?? t)}</span>
        <span class="mw-ql-title">{title(q)}</span>
        {summary && <span class="mw-ql-summary">{summary}</span>}
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
      {types.length > 1 && (
        <div class="mw-ql-filters" role="group" aria-label="Show quests of type">
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
              <li data-type={type(q)}>
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

// Filters: show one type of quest (sections with none left are hidden)
const FILTER_SCRIPT = `
document.addEventListener("nav", () => {
  const log = document.querySelector(".mw-ql");
  if (!log) return;
  const buttons = log.querySelectorAll(".mw-ql-filter");
  const show = (type) => {
    buttons.forEach((b) => b.classList.toggle("mw-on", b.dataset.type === type));
    let any = false;
    log.querySelectorAll(".mw-ql-section").forEach((sec) => {
      let n = 0;
      sec.querySelectorAll("[data-type]").forEach((item) => {
        const on = !type || item.dataset.type === type;
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
  buttons.forEach((b) => b.addEventListener("click", () => show(b.dataset.type)));
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
