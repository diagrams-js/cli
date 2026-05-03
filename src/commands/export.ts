/**
 * diagrams export <file> command
 * Export a diagram to an external format (docker-compose, kubernetes, etc.)
 */

import { loadDiagram, loadDiagramFromData, readStdin } from "../utils/file-loader.js";
import { loadPlugins } from "../utils/plugin-loader.js";
import { outputResult, createSpinner } from "../utils/helpers.js";
import { resolve, basename, extname } from "path";

export interface ExportCommandOptions {
  format: string;
  output?: string;
  stdout?: boolean;
  plugin?: string;
  quiet?: boolean;
}

export async function exportCommand(file: string, options: ExportCommandOptions): Promise<void> {
  if (!options.format) {
    throw new Error("Export format is required. Use --format or -f.");
  }

  const outputPath = resolveExportOutputPath(file, options.format, options.output, options.stdout);

  const spinner = !options.quiet
    ? createSpinner(`Exporting ${file} to ${options.format}...`)
    : null;
  spinner?.start();

  try {
    let diagram;

    if (file === "-") {
      const stdinData = await readStdin();
      if (!stdinData.trim()) {
        throw new Error("No data received from stdin. Pipe diagram content to stdin.");
      }
      const loaded = await loadDiagramFromData(stdinData);
      diagram = loaded.diagram;
    } else {
      const loaded = await loadDiagram(file, process.cwd());
      diagram = loaded.diagram;
    }

    // Load plugin if specified, otherwise the format name is the plugin name
    const pluginName = options.plugin || options.format;
    const plugins = await loadPlugins([pluginName], process.cwd());
    if (plugins.length > 0) {
      await diagram.registerPlugins(plugins);
    }

    const result = await diagram.export(options.format);

    spinner?.stop();
    if (outputPath) {
      outputResult(result, outputPath);
    }
    if (options.stdout) {
      outputResult(result, undefined);
    }
  } catch (error) {
    spinner?.stop("Failed");
    throw error;
  }
}

export function resolveExportOutputPath(
  file: string,
  exportFormat: string,
  output?: string,
  stdout?: boolean,
): string | undefined {
  if (output) return output;
  if (stdout) return undefined;

  // Determine extension from export format
  const formatExtMap: Record<string, string> = {
    "docker-compose": "yml",
    kubernetes: "yaml",
    k8s: "yaml",
  };
  const ext = formatExtMap[exportFormat.toLowerCase()] || exportFormat;

  const baseName = file === "-" ? "diagram" : basename(file, extname(file));
  return resolve(process.cwd(), `${baseName}.${ext}`);
}
