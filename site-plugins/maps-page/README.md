# Maps page

Zoomable maps with pins, in the style of old survey sheets. Shows on any page whose properties have `mw_maps` (the export adds it from map notes embedded in a Player Pages note).

- A button for each map ("Sheet I · The North").
- Pins: hover for the name, click for a card. Pins with a page link to it.
- The party's current place (from the home page's `party_location`) gets a gold pin.
- The legend lists the pins. Hover a name to find its pin, click to fly to it.

Leaflet ships with the site (`quartz/static/leaflet`) and loads only when a map page opens.

To change it: edit `src/components/`, run `node build.mjs` in this folder, and commit `dist/` too.
