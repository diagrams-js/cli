/**
 * Programmatic API for @diagrams-js/cli
 *
 * All commands can be used programmatically by importing from this module.
 *
 * @example
 * ```typescript
 * import { render, diff } from "@diagrams-js/cli";
 *
 * // Render a diagram file
 * await render("diagram.ts", { format: "svg", output: "out.svg" });
 *
 * // Generate a diff
 * await diff("HEAD", "diagram.json", { format: "html", output: "diff.html" });
 * ```
 */

export { renderCommand as render } from "./commands/render.js";
export { importCommand as importDiagram } from "./commands/import.js";
export { exportCommand as exportDiagram } from "./commands/export.js";
export {
  diffCommand as diff,
  diffBatchCommand as diffBatch,
  diffListCommand as diffList,
} from "./commands/diff.js";
export { initCommand as init } from "./commands/init.js";
export { watchCommand as watch } from "./commands/watch.js";
export {
  pluginsListCommand as listPlugins,
  pluginsInfoCommand as pluginInfo,
} from "./commands/plugins.js";

// Re-export utility types
export type { RenderCommandOptions } from "./commands/render.js";
export type { ImportCommandOptions } from "./commands/import.js";
export type { ExportCommandOptions } from "./commands/export.js";
export type { DiffCommandOptions, GitRef } from "./commands/diff.js";
export type { InitCommandOptions } from "./commands/init.js";
export type { WatchCommandOptions } from "./commands/watch.js";
export type { PluginsListOptions, PluginsInfoOptions } from "./commands/plugins.js";

// Re-export utilities
export {
  loadDiagram,
  readFileContent,
  isDiagramFile,
  isImportableFile,
} from "./utils/file-loader.js";
export { discoverPlugins, loadPlugin, loadPlugins } from "./utils/plugin-loader.js";
export { loadConfig, mergeWithConfig } from "./utils/config.js";
export {
  outputResult,
  formatFromPath,
  inputFormatFromPath,
  resolvePath,
  createSpinner,
} from "./utils/helpers.js";
