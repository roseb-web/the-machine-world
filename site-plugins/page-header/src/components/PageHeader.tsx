// The page header: title, plus the portrait, subtitle and chips from the player properties.
// Replaces Quartz's plain article title. Pages without player properties just get the title.
// The look itself is in header.tsx (shared with the browser, for details that open after signing in).

import type { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "@quartz-community/types"
import { headerView } from "./header"
import style from "./PageHeader.css"

export default (() => {
  const PageHeader: QuartzComponent = (props: QuartzComponentProps) => {
    const fm = (props.fileData.frontmatter ?? {}) as Record<string, unknown>
    return <div class="mw-page-header">{headerView(fm, String(props.fileData.slug ?? ""))}</div>
  }

  PageHeader.css = style
  return PageHeader
}) satisfies QuartzComponentConstructor
