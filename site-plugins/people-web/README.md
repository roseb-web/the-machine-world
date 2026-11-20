# People web

The People web page. Shows on any page whose properties have `mw_web` (the export adds it).

- Two tabs: **Groups** (people joined to their groups, coloured by group type) and **Relationships** (people joined to each other, styled by tie type).
- Only published people are in it, using their `player_groups` and `player_relations`.
- The drawing code is shared with Obsidian: `shared/web-render.ts`.

The browser code is `src/client.ts`. To change anything: edit `src/`, run `node build.mjs` in this folder, and commit `dist/` too.
