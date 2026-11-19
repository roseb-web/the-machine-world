// src/components/MapsPage.tsx
import { pathToRoot, resolveRelative } from "@quartz-community/utils";

// src/components/MapsPage.css
var MapsPage_default = '/* Old survey sheets: double-rule frame, small-capital legend, ringed survey points */\n\n.mw-maps {\n  margin: 1rem 0 2rem;\n}\n\n.mw-sheets {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n  margin-bottom: 0.9rem;\n}\n\n.mw-sheet-btn {\n  font-family: var(--bodyFont);\n  font-size: 0.9rem;\n  color: var(--darkgray);\n  background: transparent;\n  border: 1px solid var(--lightgray);\n  border-radius: 6px;\n  padding: 0.3rem 0.8rem;\n  cursor: pointer;\n}\n\n.mw-sheet-btn:hover {\n  border-color: var(--secondary);\n}\n\n.mw-sheet-btn.mw-on {\n  color: var(--dark);\n  border-color: var(--dark);\n}\n\n.mw-sheet-no {\n  font-variant: small-caps;\n  letter-spacing: 0.06em;\n  color: var(--gray);\n  margin-right: 0.2rem;\n}\n\n.mw-map-layout {\n  display: flex;\n  flex-direction: column;\n  gap: 0.8rem;\n}\n\n/* The double rule */\n.mw-map-frame {\n  border: 1px solid var(--dark);\n  padding: 4px;\n  background: var(--light);\n}\n\n.mw-map {\n  height: 420px;\n  border: 1px solid var(--dark);\n  background: var(--light);\n  font-family: var(--bodyFont);\n}\n\n\n/* Legend */\n.mw-legend {\n  border: 1px solid var(--lightgray);\n  padding: 0.8rem 0.9rem;\n  font-size: 0.9rem;\n}\n\n.mw-legend-title {\n  font-variant: small-caps;\n  letter-spacing: 0.12em;\n  color: var(--gray);\n  border-bottom: 1px solid var(--lightgray);\n  padding-bottom: 0.3rem;\n  margin-bottom: 0.5rem;\n}\n\n.mw-legend-list {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.2rem 1.4rem;\n}\n\n.mw-legend-list li {\n  margin: 0;\n}\n\n.mw-legend-list button {\n  display: flex;\n  align-items: center;\n  gap: 0.4rem;\n  text-align: left;\n  background: none;\n  border: none;\n  padding: 0.2rem 0;\n  font: inherit;\n  color: var(--darkgray);\n  cursor: pointer;\n}\n\n.mw-legend-list button:hover {\n  color: var(--secondary);\n}\n\n.mw-legend-party {\n  width: 8px;\n  height: 8px;\n  border-radius: 50%;\n  background: var(--secondary);\n}\n\n.mw-legend-empty,\n.mw-legend-hint {\n  font-size: 0.78rem;\n  color: var(--gray);\n  margin: 0.6rem 0 0;\n}\n\n/* Survey points: a ring with a dot */\n.mw-pin span {\n  display: block;\n  width: 14px;\n  height: 14px;\n  margin: 4px;\n  border-radius: 50%;\n  border: 2px solid var(--dark);\n  background: var(--light);\n  box-sizing: border-box;\n  position: relative;\n  transition: transform 0.15s ease;\n}\n\n.mw-pin span::after {\n  content: "";\n  position: absolute;\n  inset: 3px;\n  border-radius: 50%;\n  background: var(--dark);\n}\n\n.mw-pin-plain span {\n  border-color: var(--tertiary);\n}\n\n.mw-pin-plain span::after {\n  background: var(--tertiary);\n}\n\n.mw-pin-party span {\n  width: 18px;\n  height: 18px;\n  margin: 2px;\n  border-color: var(--secondary);\n  box-shadow: 0 0 0 4px color-mix(in srgb, var(--secondary) 30%, transparent);\n}\n\n.mw-pin-party span::after {\n  background: var(--secondary);\n  inset: 4px;\n}\n\n.mw-pin:hover span,\n.mw-pin-hot span {\n  transform: scale(1.35);\n}\n';

// src/components/maps.inline.txt
var maps_inline_default = '// Turns .mw-maps into Leaflet maps. Runs on every page change (Quartz "nav" event).\n(function () {\n  // Leaflet ships with the site, in quartz/static/leaflet.\n  const OVERRIDES = `.mw-map .leaflet-control-zoom a {\n  color: var(--dark);\n  background: var(--light);\n  border-color: var(--lightgray);\n}\n\n/* Hover label and click card */\n.mw-tip {\n  font-family: var(--bodyFont);\n  font-size: 0.85rem;\n  color: var(--dark);\n  background: var(--light);\n  border: 1px solid var(--dark);\n  border-radius: 4px;\n  box-shadow: none;\n}\n\n.mw-tip-text {\n  color: var(--darkgray);\n  font-size: 0.8rem;\n}\n\n.mw-popup .leaflet-popup-content-wrapper {\n  background: var(--light);\n  color: var(--darkgray);\n  border: 1px solid var(--dark);\n  border-radius: 6px;\n  box-shadow: none;\n}\n\n.mw-popup .leaflet-popup-tip {\n  background: var(--light);\n  border: 1px solid var(--dark);\n  box-shadow: none;\n}\n\n.mw-popup .leaflet-popup-content {\n  margin: 0.7rem 0.9rem;\n  font-family: var(--bodyFont);\n  font-size: 0.85rem;\n  line-height: 1.4;\n}\n\n.mw-popup .leaflet-popup-content p {\n  margin: 0.3rem 0;\n  line-height: 1.4;\n}\n\n.mw-card-party {\n  font-variant: small-caps;\n  letter-spacing: 0.08em;\n  color: var(--secondary);\n  font-size: 0.8rem;\n}\n\n.mw-card-title {\n  font-family: var(--headerFont);\n  font-size: 1.05rem;\n  color: var(--dark);\n}\n\n.mw-card-chip {\n  display: inline-block;\n  font-size: 0.72rem;\n  padding: 0 0.5rem;\n  margin: 0.25rem 0;\n  border-radius: 6px;\n  background: var(--lightgray);\n  color: var(--darkgray);\n}\n\n.mw-card p {\n  margin: 0.3rem 0;\n}\n\na.mw-card-link {\n  color: var(--secondary) !important;\n  background: none !important;\n  padding: 0 !important;\n}\n\n.mw-map.leaflet-container {\n  background: var(--light);\n}\n`\n  let loading = null\n  const loadLeaflet = (LEAFLET) => {\n    if (window.L) return Promise.resolve()\n    if (loading) return loading\n    loading = new Promise((resolve, reject) => {\n      const css = document.createElement("link")\n      css.rel = "stylesheet"\n      css.href = LEAFLET + "leaflet.css"\n      document.head.appendChild(css)\n      // Quartz puts component styles in a CSS layer, and Leaflet\'s unlayered styles would win.\n      // So the rules that restyle Leaflet go in unlayered too, after Leaflet\'s.\n      const own = document.createElement("style")\n      own.textContent = OVERRIDES\n      document.head.appendChild(own)\n      const js = document.createElement("script")\n      js.src = LEAFLET + "leaflet.js"\n      js.onload = () => resolve()\n      js.onerror = reject\n      document.head.appendChild(js)\n    })\n    return loading\n  }\n  const esc = (s) => String(s ?? "").replace(/[&<>"\']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", \'"\': "&quot;", "\'": "&#39;" })[c])\n  const imageSize = (src) =>\n    new Promise((resolve, reject) => {\n      const img = new Image()\n      img.onload = () => resolve([img.naturalWidth, img.naturalHeight])\n      img.onerror = reject\n      img.src = src\n    })\n\n  async function setup(root) {\n    const maps = JSON.parse(root.dataset.maps || "[]")\n    const el = root.querySelector(".mw-map")\n    const list = root.querySelector(".mw-legend-list")\n    await loadLeaflet(root.dataset.leaflet)\n    const L = window.L\n    let map = null\n\n    async function show(i) {\n      const m = maps[i]\n      if (map) map.remove()\n      list.innerHTML = ""\n      const [w, h] = await imageSize(m.image)\n      const bounds = [[-h, 0], [0, w]]\n      // The sheet keeps the image\'s shape, so the whole map fits when it opens.\n      el.style.height = Math.round(Math.min(Math.max(el.clientWidth * (h / w), 320), window.innerHeight * 0.75)) + "px"\n      map = L.map(el, {\n        crs: L.CRS.Simple,\n        zoomSnap: 0, // fits the sheet exactly\n        zoomDelta: m.zoomDelta ?? 0.5,\n        minZoom: -6, // lets the whole sheet fit; tightened to the fitted zoom below\n        maxZoom: m.maxZoom ?? 1,\n        attributionControl: false,\n        maxBounds: [[-h * 1.15, -w * 0.15], [h * 0.15, w * 1.15]],\n      })\n      L.imageOverlay(m.image, bounds).addTo(map)\n      map.fitBounds(bounds)\n      const fitZoom = map.getZoom()\n      map.setMinZoom(fitZoom)\n\n      const pins = [...m.pins].sort((a, b) => (b.party ? 1 : 0) - (a.party ? 1 : 0) || a.title.localeCompare(b.title))\n      for (const p of pins) {\n        const icon = L.divIcon({\n          className: `mw-pin mw-pin-${esc(p.type)} ${p.party ? "mw-pin-party" : ""} ${p.href ? "" : "mw-pin-plain"}`,\n          html: "<span></span>",\n          iconSize: [22, 22],\n          iconAnchor: [11, 11],\n        })\n        const card =\n          `<div class="mw-card">` +\n          (p.party ? `<div class="mw-card-party">The party is here</div>` : "") +\n          `<div class="mw-card-title">${esc(p.title)}</div>` +\n          (p.chip ? `<span class="mw-card-chip">${esc(p.chip)}</span>` : "") +\n          (p.summary ? `<p>${esc(p.summary)}</p>` : "") +\n          (p.href ? `<a class="internal mw-card-link" href="${esc(p.href)}">Open page \u2192</a>` : "") +\n          `</div>`\n        const marker = L.marker([p.lat, p.lng], { icon, title: p.title, riseOnHover: true }).addTo(map)\n        marker.bindTooltip(esc(p.title) + (p.text && !p.href ? `<br><span class="mw-tip-text">${esc(p.text)}</span>` : ""), {\n          direction: "top",\n          offset: [0, -10],\n          className: "mw-tip",\n        })\n        marker.bindPopup(card, { className: "mw-popup", minWidth: 220, maxWidth: 260, closeButton: false, offset: [0, -6] })\n\n        const li = document.createElement("li")\n        li.innerHTML = `<button type="button">${p.party ? \'<span class="mw-legend-party"></span>\' : ""}${esc(p.title)}</button>`\n        const btn = li.firstChild\n        btn.addEventListener("mouseenter", () => marker.getElement()?.classList.add("mw-pin-hot"))\n        btn.addEventListener("mouseleave", () => marker.getElement()?.classList.remove("mw-pin-hot"))\n        btn.addEventListener("click", () => {\n          // Closer, but not past the image\'s own size (it gets blurry)\n          map.flyTo([p.lat, p.lng], Math.min(fitZoom + 1.5, 0), { duration: 0.6 })\n          map.once("moveend", () => marker.openPopup())\n        })\n        list.appendChild(li)\n      }\n      if (!pins.length) list.innerHTML = \'<li class="mw-legend-empty">No places marked yet.</li>\'\n    }\n\n    const buttons = [...root.querySelectorAll(".mw-sheet-btn")]\n    buttons.forEach((b) =>\n      b.addEventListener("click", () => {\n        buttons.forEach((x) => x.classList.toggle("mw-on", x === b))\n        show(Number(b.dataset.sheet))\n      }),\n    )\n    await show(0)\n    window.addCleanup?.(() => map && map.remove())\n  }\n\n  document.addEventListener("nav", () => {\n    for (const root of document.querySelectorAll(".mw-maps")) setup(root).catch((e) => console.error("Map failed", e))\n  })\n})()\n';

// src/components/MapsPage.tsx
import { jsx, jsxs } from "preact/jsx-runtime";
var ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
var linkTarget = (v) => typeof v === "string" ? v.match(/^\[\[([^\]|]+)/)?.[1] : void 0;
var MapsPage_default2 = (() => {
  const MapsPage = ({ fileData, allFiles }) => {
    const fm = fileData.frontmatter ?? {};
    const maps = Array.isArray(fm.mw_maps) ? fm.mw_maps : [];
    if (!maps.length) return null;
    const slug = String(fileData.slug ?? "");
    const root = pathToRoot(slug);
    const bySlug = new Map(allFiles.map((f) => [String(f.slug), f]));
    const home = bySlug.get("index");
    const party = linkTarget(home?.frontmatter?.party_location);
    const data = maps.map((m) => ({
      ...m,
      image: `${root}/${m.image}`,
      pins: m.pins.map((p) => {
        const f = p.page ? bySlug.get(p.page) : void 0;
        const pfm = f?.frontmatter ?? {};
        const summary = String(f?.description ?? "").replace(/^Overview\s*/, "");
        return {
          ...p,
          href: p.page ? resolveRelative(slug, p.page) : void 0,
          chip: typeof pfm.player_type === "string" ? pfm.player_type : void 0,
          summary: p.text ?? (summary ? summary.split(/(?<=[.!?])\s/)[0] : void 0),
          party: !!p.page && p.page === party
        };
      })
    }));
    return /* @__PURE__ */ jsxs("div", { class: "mw-maps", "data-maps": JSON.stringify(data), "data-leaflet": `${root}/static/leaflet/`, children: [
      data.length > 1 && /* @__PURE__ */ jsx("div", { class: "mw-sheets", role: "tablist", children: data.map((m, i) => /* @__PURE__ */ jsxs("button", { type: "button", role: "tab", class: `mw-sheet-btn ${i === 0 ? "mw-on" : ""}`, "data-sheet": i, children: [
        /* @__PURE__ */ jsxs("span", { class: "mw-sheet-no", children: [
          "Sheet ",
          ROMAN[i] ?? i + 1
        ] }),
        " ",
        m.title
      ] })) }),
      /* @__PURE__ */ jsxs("div", { class: "mw-map-layout", children: [
        /* @__PURE__ */ jsx("div", { class: "mw-map-frame", children: /* @__PURE__ */ jsx("div", { class: "mw-map" }) }),
        /* @__PURE__ */ jsxs("aside", { class: "mw-legend", children: [
          /* @__PURE__ */ jsx("div", { class: "mw-legend-title", children: "Legend" }),
          /* @__PURE__ */ jsx("ul", { class: "mw-legend-list" }),
          /* @__PURE__ */ jsx("p", { class: "mw-legend-hint", children: "Hover a name to find it on the map. Click to go there." })
        ] })
      ] })
    ] });
  };
  MapsPage.css = MapsPage_default;
  MapsPage.afterDOMLoaded = maps_inline_default;
  return MapsPage;
});
export {
  MapsPage_default2 as MapsPage
};
