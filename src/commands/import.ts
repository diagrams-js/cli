/**
 * diagrams import <file> command
 * Import from external formats (docker-compose, kubernetes, etc.) and render
 */

import { Diagram } from "diagrams-js";
import { readFileContent } from "../utils/file-loader.js";
import { loadPlugins, discoverPlugins } from "../utils/plugin-loader.js";
import { outputResult, formatFromPath, createSpinner } from "../utils/helpers.js";
import { loadConfig, mergeWithConfig } from "../utils/config.js";
import type { RenderOptions } from "diagrams-js";

export interface ImportCommandOptions {
  output?: string;
  format?: string;
  plugin?: string;
  theme?: string;
  direction?: string;
  curveStyle?: string;
  width?: number;
  height?: number;
  scale?: number;
  dataUrl?: boolean;
  quiet?: boolean;
  config?: string;
}

export async function importCommand(file: string, options: ImportCommandOptions): Promise<void> {
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

  const spinner = !merged.quiet ? createSpinner(`Importing ${file}...`) : null;
  spinner?.start();

  try {
    const content = readFileContent(file, process.cwd());

    // Auto-detect plugin if not specified
    const pluginName = merged.plugin || autoDetectPlugin(file, content);
    if (!pluginName) {
      throw new Error(
        `Could not auto-detect plugin for ${file}. Use --plugin to specify one.\n` +
          `Available plugins: ${discoverPlugins(process.cwd())
            .map((p) => p.name)
            .join(", ")}`,
      );
    }

    const plugins = await loadPlugins([pluginName], process.cwd());
    if (plugins.length === 0) {
      throw new Error(`Failed to load plugin "${pluginName}"`);
    }

    const diagram = Diagram(file.replace(/\.[^.]+$/, ""));
    await diagram.registerPlugins(plugins);

    // Apply diagram options from CLI
    if (merged.theme) diagram.theme = merged.theme as Diagram["theme"];
    if (merged.direction) diagram.direction = merged.direction as Diagram["direction"];
    if (merged.curveStyle) diagram.curveStyle = merged.curveStyle as Diagram["curveStyle"];

    await diagram.import(content, pluginName);

    const renderOptions: RenderOptions = {
      format: outputFormat as RenderOptions["format"],
    };
    if (merged.width !== undefined) renderOptions.width = merged.width;
    if (merged.height !== undefined) renderOptions.height = merged.height;
    if (merged.scale !== undefined) renderOptions.scale = merged.scale;
    if (merged.dataUrl) renderOptions.dataUrl = true;

    const result = await diagram.render(renderOptions);

    spinner?.stop();
    outputResult(result, merged.output);
  } catch (error) {
    spinner?.stop("Failed");
    throw error;
  }
}

function autoDetectPlugin(filePath: string, content: string): string | undefined {
  const lowerPath = filePath.toLowerCase();
  const lowerContent = content.toLowerCase().trim();

  // Docker Compose detection
  if (
    lowerPath.includes("docker-compose") ||
    lowerPath.includes("compose") ||
    lowerContent.includes("services:")
  ) {
    // Distinguish from Kubernetes
    if (lowerContent.includes("apiversion:") || lowerContent.includes("kind:")) {
      return "kubernetes";
    }
    return "docker-compose";
  }

  // Kubernetes detection
  if (
    lowerPath.includes("k8s") ||
    lowerPath.includes("kubernetes") ||
    lowerContent.startsWith("apiversion:") ||
    lowerContent.includes("\napiversion:") ||
    lowerContent.includes("kind:")
  ) {
    return "kubernetes";
  }

  return undefined;
}
