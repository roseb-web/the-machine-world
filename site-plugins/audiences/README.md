# Audience views

Signing in to see the sections meant for one player, or for the DM.

- A **Sign in** button at the top of every page. A password says who you are; the device remembers it until **Sign out**.
- Locked sections (in a page's `mw_locked`) open in place, at their markers (`<div class="mw-lock">`), with a tag: "Just for you" for a player, or whose it is for the DM.
- Other people's sections never show at all.
- `audiences.json` (at the site's root) is how signing in knows who you are. The locking itself is `shared/audiences.ts`.

The browser code is `src/client.ts`. To change anything: edit `src/`, run `node build.mjs` in this folder, and commit `dist/` too.
