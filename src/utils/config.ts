/**
 * Configuration file support (.diagramsrc.json)
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";

export interface CliConfig {
  /** Default output format */
  format?: string;
  /** Default theme */
  theme?: string;
  /** Default direction */
  direction?: string;
  /** Default curve style */
  curveStyle?: string;
  /** Default width for raster images */
  width?: number;
  /** Default height for raster images */
  height?: number;
  /** Default scale factor */
  scale?: number;
  /** Plugins to auto-load */
  plugins?: string[];
  /** Diff default options */
  diff?: {
    layout?: "side-by-side" | "stacked";
    showUnchanged?: "show" | "dim" | "hide";
    ignorePosition?: boolean;
    ignoreMetadata?: boolean;
  };
}

const configFileNames = [".diagramsrc.json", ".diagramsrc.js", ".diagramsrc.mjs"];

/**
 * Find and load configuration file from cwd or parent directories
 */
export function loadConfig(cwd?: string): CliConfig {
  const baseDir = cwd || process.cwd();
  let currentDir = resolve(baseDir);

  while (currentDir !== dirname(currentDir)) {
    for (const fileName of configFileNames) {
      const configPath = resolve(currentDir, fileName);
      if (existsSync(configPath)) {
        return parseConfig(configPath);
      }
    }
    currentDir = dirname(currentDir);
  }

  return {};
}

function parseConfig(configPath: string): CliConfig {
  if (configPath.endsWith(".json")) {
    try {
      const content = readFileSync(configPath, "utf-8");
      return JSON.parse(content) as CliConfig;
    } catch (error) {
      throw new Error(`Failed to parse config file ${configPath}: ${error}`);
    }
  }

  // For JS/MJS configs, we'd need dynamic import - handled separately
  return {};
}

/**
 * Merge CLI options with config file values
 */
export function mergeWithConfig<T extends Record<string, unknown>>(
  options: T,
  config: CliConfig,
  keys: Array<keyof CliConfig>,
): T {
  const merged = { ...options };
  for (const key of keys) {
    if (config[key] !== undefined && merged[key as string] === undefined) {
      (merged as Record<string, unknown>)[key as string] = config[key];
    }
  }
  return merged;
}
