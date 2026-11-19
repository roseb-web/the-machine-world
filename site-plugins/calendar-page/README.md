# Calendar page

The Calendar and Timeline pages. Shows on any page whose properties have `mw_calendar` (the export adds it from Calendarium's settings). `mw_timeline: true` shows the timeline instead of the month grid.

- **Calendar:** month grid with the 6-day week, today ringed, events as labels, an "Ongoing" strip for long events, hover a day for all three date styles, and "Coming up".
- **Timeline:** vertical, years only. Long events are bars down the side, single events are dots. A filter for each category.

The browser code is `src/client.ts`. To change anything: edit `src/`, run `node build.mjs` in this folder, and commit `dist/` too.
