// The home page quest log: pinned, active quests, main quests first.

import type { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "@quartz-community/types"
import { resolveRelative } from "@quartz-community/utils"
import style from "./QuestLog.css"

const ORDER = ["main", "personal", "faction", "side"]
const LABELS: Record<string, string> = { main: "Main", personal: "Personal", faction: "Faction", side: "Side" }

export default (() => {
  const QuestLog: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
    const slug = String(fileData.slug ?? "")
    if (slug !== "index") return null

    const quests = allFiles
      .map((f) => ({ f, fm: (f.frontmatter ?? {}) as Record<string, unknown> }))
      .filter(({ fm }) => fm.pinned === true && fm.quest_status === "active" && typeof fm.quest === "string")
      .sort((a, b) => ORDER.indexOf(String(a.fm.quest)) - ORDER.indexOf(String(b.fm.quest)))
    if (quests.length === 0) return null

    const link = (f: (typeof allFiles)[number]) => resolveRelative(slug as never, String(f.slug) as never)
    const titleOf = (f: (typeof allFiles)[number], fm: Record<string, unknown>) => String(fm.title ?? f.slug)
    const main = quests.filter(({ fm }) => fm.quest === "main")
    const others = quests.filter(({ fm }) => fm.quest !== "main")

    return (
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
    )
  }

  QuestLog.css = style
  return QuestLog
}) satisfies QuartzComponentConstructor
