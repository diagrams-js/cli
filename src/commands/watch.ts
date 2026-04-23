/**
 * diagrams watch <file> command
 * Watch a diagram file and re-render on changes
 */

import { watch as createWatcher } from "chokidar";
import { loadDiagram } from "../utils/file-loader.js";
import { formatFromPath, createSpinner } from "../utils/helpers.js";
import { loadConfig, mergeWithConfig } from "../utils/config.js";
import type { RenderOptions } from "diagrams-js";
import { writeFileSync } from "fs";
import { dirname } from "path";
import { mkdirSync } from "fs";

export interface WatchCommandOptions {
  output?: string;
  format?: string;
  theme?: string;
  direction?: string;
  curveStyle?: string;
  width?: number;
  height?: number;
  scale?: number;
  quiet?: boolean;
  config?: string;
}

export async function watchCommand(file: string, options: WatchCommandOptions): Promise<void> {
  const config = loadConfig(options.config);
  const merged = mergeWithConfig(options, config, [
    "format",
    "theme",
    "direction",
    "curveStyle",
    "width",
    "height",
    "scale",
  ]);

  const outputFormat =
    merged.format || (merged.output ? formatFromPath(merged.output) : undefined) || "svg";

  if (!merged.quiet) {
    console.error(`Watching ${file} for changes...`);
    if (merged.output) {
      console.error(`Output: ${merged.output} (${outputFormat})`);
    } else {
      console.error(`Output: stdout (${outputFormat})`);
    }
  }

  // Initial render
  await renderOnce(file, merged, outputFormat);

  // Set up watcher
  const watcher = createWatcher(file, {
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on("change", async () => {
    if (!merged.quiet) {
      console.error(`\n[change] ${file}`);
    }
    try {
      await renderOnce(file, merged, outputFormat);
    } catch (error) {
      console.error("Render failed:", error instanceof Error ? error.message : String(error));
    }
  });

  // Keep process alive
  process.on("SIGINT", () => {
    watcher.close().then(() => process.exit(0));
  });

  process.on("SIGTERM", () => {
    watcher.close().then(() => process.exit(0));
  });
}

async function renderOnce(
  file: string,
  options: WatchCommandOptions,
  outputFormat: string,
): Promise<void> {
  const spinner = !options.quiet ? createSpinner("Rendering...") : null;
  spinner?.start();

  try {
    const { diagram } = await loadDiagram(file, process.cwd());

    if (options.theme) diagram.theme = options.theme as typeof diagram.theme;
    if (options.direction) diagram.direction = options.direction as typeof diagram.direction;
    if (options.curveStyle) diagram.curveStyle = options.curveStyle as typeof diagram.curveStyle;

    const renderOptions: RenderOptions = {
      format: outputFormat as RenderOptions["format"],
    };
    if (options.width !== undefined) renderOptions.width = options.width;
    if (options.height !== undefined) renderOptions.height = options.height;
    if (options.scale !== undefined) renderOptions.scale = options.scale;

    const result = await diagram.render(renderOptions);

    if (options.output) {
      const dir = dirname(options.output);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      if (typeof result === "string") {
        writeFileSync(options.output, result, "utf-8");
      } else {
        writeFileSync(options.output, Buffer.from(result));
      }
      spinner?.stop(`Rendered to ${options.output}`);
    } else {
      spinner?.stop("Rendered (output to stdout suppressed in watch mode)");
    }
  } catch (error) {
    spinner?.stop("Failed");
    throw error;
  }
}

function existsSync(path: string): boolean {
  try {
    const { statSync } = require("fs");
    statSync(path);
    return true;
  } catch {
    return false;
  }
}
