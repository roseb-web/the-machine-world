// Builds the components into dist/. Run with: node build.mjs
// The browser code (src/client.ts) is bundled first, then put into the component as a string.
import { build } from "esbuild";

const client = await build({
  entryPoints: ["src/client.ts"],
  bundle: true,
  format: "iife",
  target: "es2020",
  minify: true,
  write: false,
});

const shared = {
  bundle: true,
  format: "esm",
  platform: "node",
  target: "es2022",
  jsx: "automatic",
  jsxImportSource: "preact",
  external: ["preact", "preact/*", "@quartz-community/*"],
  loader: { ".css": "text" },
  define: { __CLIENT__: JSON.stringify(client.outputFiles[0].text) },
};

await build({ ...shared, entryPoints: ["src/components/index.ts"], outfile: "dist/components/index.js" });
await build({ ...shared, entryPoints: ["src/index.ts"], outfile: "dist/index.js" });
console.log("Built audiences");
