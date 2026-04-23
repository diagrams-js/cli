/**
 * diagrams export <file> command
 * Export a diagram to an external format (docker-compose, kubernetes, etc.)
 */

import { loadDiagram } from "../utils/file-loader.js";
import { loadPlugins } from "../utils/plugin-loader.js";
import { outputResult, createSpinner } from "../utils/helpers.js";

export interface ExportCommandOptions {
  format: string;
  output?: string;
  plugin?: string;
  quiet?: boolean;
}

export async function exportCommand(file: string, options: ExportCommandOptions): Promise<void> {
  if (!options.format) {
    throw new Error("Export format is required. Use --format or -f.");
  }

  const spinner = !options.quiet
    ? createSpinner(`Exporting ${file} to ${options.format}...`)
    : null;
  spinner?.start();

  try {
    const { diagram } = await loadDiagram(file, process.cwd());

    // Load plugin if specified, otherwise the format name is the plugin name
    const pluginName = options.plugin || options.format;
    const plugins = await loadPlugins([pluginName], process.cwd());
    if (plugins.length > 0) {
      await diagram.registerPlugins(plugins);
    }

    const result = await diagram.export(options.format);

    spinner?.stop();
    outputResult(result, options.output);
  } catch (error) {
    spinner?.stop("Failed");
    throw error;
  }
}
