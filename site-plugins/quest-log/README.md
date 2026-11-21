# Quest log

Shows pinned, active quests on the home page, main quests first.

Also the quest log page: the folder page of a folder of quests. Active quests (cards, main first), Not started (dashed cards), and Finished (completed, failed and missed, newest first), with filters by type. "Updated Session 5" comes from `mw_quest_last`, worked out when publishing from the quest's latest session heading.
A quest shows when its note has `pinned: true`, `quest_status: active`, and a player callout.

To change it: edit `src/components/`, run `node build.mjs` in this folder, and commit `dist/` too.
