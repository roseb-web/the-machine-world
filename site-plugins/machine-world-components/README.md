# Machine World components

Custom Quartz components for the wiki.

- **SetMenu**: the left-hand menu. Fixed sections in a fixed order. A section only shows once it has published pages.

## Changing a component
1. Edit the files in `src/components/`.
2. Rebuild: `node build.mjs` (run inside this folder).
3. Commit the `dist/` folder too: the site build uses it as it is.
