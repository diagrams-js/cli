/**
 * diagrams render <file> command
 * Render a diagram file to svg/png/jpg/dot/json
 * Supports plugin-based import for .yaml/.yml files
 * Supports stdin (use - as file)
 */

import { Diagram, type RenderOptions } from "diagrams-js";
import {
  loadDiagram,
  loadDiagramFromData,
  readStdin,
  readFileContent,
  isImportableFile,
} from "../utils/file-loader.js";
import { loadPlugins, discoverPlugins } from "../utils/plugin-loader.js";
import { outputResult, formatFromPath, createSpinner } from "../utils/helpers.js";
import { loadConfig, mergeWithConfig } from "../utils/config.js";
import { resolve } from "path";

export interface RenderCommandOptions {
  output?: string;
  stdout?: boolean;
  format?: string;
  plugin?: string;
  theme?: string;
  direction?: string;
  curveStyle?: string;
  width?: number;
  height?: number;
  scale?: number;
  dataUrl?: boolean;
  embedData?: boolean;
  quiet?: boolean;
  config?: string;
}

export async function renderCommand(
  file: string | undefined,
  options: RenderCommandOptions,
): Promise<void> {
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

  if (!file) {
    throw new Error("No input provided. Specify a file or pipe diagram data to stdin (use -).");
  }

  const outputPath = resolveRenderOutputPath(file, outputFormat, merged.output, merged.stdout);

  const spinnerMessage = file === "-" ? "Rendering from stdin..." : `Rendering ${file}...`;
  const spinner = !merged.quiet ? createSpinner(spinnerMessage) : null;
  spinner?.start();

  try {
    let diagram: Diagram;

    if (file === "-") {
      // Stdin
      const stdinData = await readStdin();
      if (!stdinData.trim()) {
        throw new Error("No data received from stdin. Pipe diagram content to stdin.");
      }
      const loaded = await loadDiagramFromData(stdinData, merged.format);
      diagram = loaded.diagram;
    } else if (isImportableFile(file)) {
      // Plugin-based import for .yaml/.yml files
      diagram = await importWithPlugin(file, merged);
    } else {
      const loaded = await loadDiagram(file, process.cwd());
      diagram = loaded.diagram;
    }

    // Apply diagram options from CLI
    applyDiagramOptions(diagram, merged);

    const renderOptions: RenderOptions = {
      format: outputFormat as RenderOptions["format"],
    };

    if (merged.width !== undefined) renderOptions.width = merged.width;
    if (merged.height !== undefined) renderOptions.height = merged.height;
    if (merged.scale !== undefined) renderOptions.scale = merged.scale;
    if (merged.dataUrl) renderOptions.dataUrl = true;
    if (merged.embedData !== undefined) renderOptions.embedData = merged.embedData;

    const result = await diagram.render(renderOptions);

    spinner?.stop();
    if (outputPath) {
      outputResult(result, outputPath);
    }
    if (merged.stdout) {
      outputResult(result, undefined);
    }
  } catch (error) {
    spinner?.stop("Failed");
    throw error;
  }
}

async function importWithPlugin(file: string, options: RenderCommandOptions): Promise<Diagram> {
  const content = readFileContent(file, process.cwd());

  // Auto-detect plugin if not specified
  const pluginName = options.plugin || autoDetectPlugin(file, content);
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
  await diagram.import(content, pluginName);

  return diagram;
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

export function resolveRenderOutputPath(
  file: string | undefined,
  outputFormat: string,
  output?: string,
  stdout?: boolean,
): string | undefined {
  if (output) return output;
  if (stdout) return undefined;
  const baseName =
    !file || file === "-" ? "diagram" : resolve(process.cwd(), file).replace(/\.[^.]+$/, "");
  return `${baseName}.${outputFormat}`;
}

function applyDiagramOptions(diagram: Diagram, options: RenderCommandOptions): void {
  if (options.theme) {
    diagram.theme = options.theme as Diagram["theme"];
  }
  if (options.direction) {
    diagram.direction = options.direction as Diagram["direction"];
  }
  if (options.curveStyle) {
    diagram.curveStyle = options.curveStyle as Diagram["curveStyle"];
  }
}
