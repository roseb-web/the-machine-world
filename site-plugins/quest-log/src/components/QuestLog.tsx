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

    return (
      <section class="mw-quest-log">
        <h2>Active quests</h2>
        <ul>
          {quests.map(({ f, fm }) => {
            const type = String(fm.quest)
            const summary = typeof f.description === "string" ? f.description.replace(/^Overview\s+/, "") : ""
            return (
              <li class="mw-quest">
                <span class={`mw-quest-type mw-quest-${type}`}>{LABELS[type] ?? type}</span>
                <div>
                  <a href={resolveRelative(slug as never, String(f.slug) as never)} class="internal mw-quest-title">
                    {String(fm.title ?? f.slug)}
                  </a>
                  {summary && <p class="mw-quest-summary">{summary}</p>}
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    )
  }

  QuestLog.css = style
  return QuestLog
}) satisfies QuartzComponentConstructor
