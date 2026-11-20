# Related

The sections under a page's text. Each only shows when it has something in it.

- **Key NPCs:** published NPCs whose `player_faction` or `player_seen` points to this page.
- **Places:** published places this page links to (not on place pages).
- **Related quests:** published quests that link to this page.
- **Related handouts:** the images listed in `player_handouts`. Click to open full size.
- **Moodboard:** pins from the page's `pinterest` board link (fetched when publishing, as `mw_moodboard`). The first 12 show, the rest behind "Show N more". Click a pin to open it larger.
- **Affinity:** on god pages, one chip per `affinity_<name>` property. The name shown is the part after `affinity_`, so `affinity_tam` shows as Tam.

To change it: edit `src/components/`, run `node build.mjs` in this folder, and commit `dist/` too.
