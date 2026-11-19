// Builds the components into dist/. Run with: npm run build (from the repo root: npm run build --prefix site-plugins/quest-log)
import { build } from "esbuild";

const shared = {
  bundle: true,
  format: "esm",
  platform: "node",
  target: "es2022",
  jsx: "automatic",
  jsxImportSource: "preact",
  external: ["preact", "preact/*", "@quartz-community/*"],
  loader: { ".css": "text", ".js": "js" },
};

await build({ ...shared, entryPoints: ["src/components/index.ts"], outfile: "dist/components/index.js" });
await build({ ...shared, entryPoints: ["src/index.ts"], outfile: "dist/index.js" });
console.log("Built quest-log");
