/**
 * diagrams render <file> command
 * Render a diagram file to svg/png/jpg/dot/json
 */

import type { Diagram } from "diagrams-js";
import type { RenderOptions } from "diagrams-js";
import { loadDiagram } from "../utils/file-loader.js";
import { outputResult, formatFromPath, createSpinner } from "../utils/helpers.js";
import { loadConfig, mergeWithConfig } from "../utils/config.js";

export interface RenderCommandOptions {
  output?: string;
  format?: string;
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

export async function renderCommand(file: string, options: RenderCommandOptions): Promise<void> {
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

  const spinner = !merged.quiet ? createSpinner(`Rendering ${file}...`) : null;
  spinner?.start();

  try {
    const { diagram } = await loadDiagram(file, process.cwd());

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
    outputResult(result, merged.output);
  } catch (error) {
    spinner?.stop("Failed");
    throw error;
  }
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
