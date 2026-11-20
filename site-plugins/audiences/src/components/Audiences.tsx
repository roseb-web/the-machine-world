// Audience views: a holder on every page, with the page's locked sections (if any) and the way
// back to the site's root (for audiences.json and links). src/client.ts does the rest.
import type { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "@quartz-community/types"
import { pathToRoot } from "@quartz-community/utils"
import style from "./Audiences.css"

declare const __CLIENT__: string

export default (() => {
  const Audiences: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    const fm = (fileData.frontmatter ?? {}) as Record<string, unknown>
    const locks = Array.isArray(fm.mw_locked) ? fm.mw_locked : []
    return <div class="mw-aud" data-root={pathToRoot(String(fileData.slug ?? "") as never)} data-locks={JSON.stringify(locks)} />
  }
  Audiences.css = style
  Audiences.afterDOMLoaded = __CLIENT__
  return Audiences
}) satisfies QuartzComponentConstructor
