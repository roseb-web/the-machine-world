// The home page boxes: "Previously on…", "New since Session N", "Coming up",
// then the quest log (pinned, active quests, main quests first).
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

export default (() => {
  const QuestLog: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
    const slug = String(fileData.slug ?? "")
    if (slug !== "index") return null

    const fm0 = (fileData.frontmatter ?? {}) as Record<string, unknown>
    const go = (to: string) => resolveRelative(slug as never, to as never)
    const home = <HomeBoxes fm={fm0} go={go} />

    const quests = allFiles
      .map((f) => ({ f, fm: (f.frontmatter ?? {}) as Record<string, unknown> }))
      .filter(({ fm }) => fm.pinned === true && fm.quest_status === "active" && typeof fm.quest === "string")
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
  return QuestLog
}) satisfies QuartzComponentConstructor
