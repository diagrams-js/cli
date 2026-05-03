import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: {
      cli: "./src/cli.ts",
    },
    format: ["esm"],
    outExtensions: () => ({
      js: ".mjs",
      dts: ".d.mts",
    }),
    deps: {
      onlyBundle: false,
      neverBundle: ["commander", "diagrams-js", "chokidar"],
    },
  },
});
