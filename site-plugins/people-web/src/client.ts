// Browser code for the People web page. Runs on every page change (Quartz "nav" event).
import { renderWeb } from "../../../shared/web-render";
import type { WebData } from "../../../shared/web";

const storage = {
  get: (k: string) => {
    const v = localStorage.getItem("mw-web:" + k);
    return v === null ? undefined : JSON.parse(v);
  },
  set: (k: string, v: unknown) => {
    if (v === null) localStorage.removeItem("mw-web:" + k);
    else localStorage.setItem("mw-web:" + k, JSON.stringify(v));
  },
};

document.addEventListener("nav", () => {
  for (const root of document.querySelectorAll<HTMLElement>(".mw-web-page")) {
    try {
      const data: WebData = JSON.parse(root.dataset.web || "{}");
      renderWeb(root, data, { hrefOf: (open) => open, linkClass: "internal", wheelZoom: "ctrl", storage });
    } catch (e) {
      console.error("People web failed", e);
    }
  }
});
