# Related

The sections under a page's text. Each only shows when it has something in it.

- **Key NPCs:** published NPCs whose `player_faction` or `player_seen` points to this page.
- **Places:** published places this page links to (not on place pages).
- **Related quests:** published quests that link to this page.
- **Related handouts:** the images listed in `player_handouts`. Click to open full size.
- **Affinity:** on god pages, one chip per `affinity_<name>` property. The name shown is the part after `affinity_`, so `affinity_neri` shows as Neri.

To change it: edit `src/components/`, run `node build.mjs` in this folder, and commit `dist/` too.
