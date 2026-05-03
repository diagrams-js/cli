/**
 * diagrams diff <ref> <file> command
 * Generate visual diffs of diagrams in git workflows
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, basename, extname } from "path";
import type { DiagramJSON } from "diagrams-js";
import { loadConfig, mergeWithConfig } from "../utils/config.js";
import { outputResult, createSpinner } from "../utils/helpers.js";

export interface DiffCommandOptions {
  output?: string;
  stdout?: boolean;
  format?: "html" | "svg";
  theme?: "light" | "dark";
  layout?: "side-by-side" | "stacked";
  showUnchanged?: "show" | "dim" | "hide";
  ignorePosition?: boolean;
  ignoreMetadata?: boolean;
  directory?: string;
  quiet?: boolean;
}

export interface GitRef {
  base: string;
  target?: string;
}

export function resolveDiffOutputPath(
  file: string,
  cwd: string,
  output?: string,
  stdout?: boolean,
): string | undefined {
  if (output) return output;
  if (stdout) return undefined;
  const baseName = basename(file, extname(file));
  return resolve(cwd, `${baseName}-diff.html`);
}

export async function diffCommand(
  ref: string,
  file: string,
  options: DiffCommandOptions,
): Promise<void> {
  const config = loadConfig(options.directory);
  const merged = mergeWithConfig(options, config, [
    "format",
    "theme",
    "layout",
    "showUnchanged",
    "ignorePosition",
    "ignoreMetadata",
  ]);

  const gitRef = parseGitRef(ref);
  const cwd = merged.directory || process.cwd();

  const outputPath = resolveDiffOutputPath(file, cwd, merged.output, merged.stdout);

  const spinner = !merged.quiet ? createSpinner(`Generating diff for ${file}...`) : null;
  spinner?.start();

  try {
    // Ensure we're in a git repository
    try {
      git("rev-parse --show-toplevel", cwd);
    } catch {
      throw new Error("Not a git repository");
    }

    // Get before and after content
    const beforeContent = getFileContent(file, gitRef.base, cwd);
    const afterContent = gitRef.target
      ? getFileContent(file, gitRef.target, cwd)
      : getWorkingContent(file, cwd);

    if (!beforeContent) {
      throw new Error(`File not found at ref: ${file}@${gitRef.base}`);
    }
    if (!afterContent) {
      throw new Error(
        `File not found: ${file}${gitRef.target ? `@${gitRef.target}` : " (working directory)"}`,
      );
    }

    // Extract diagram JSON from both versions
    const beforeJSON = await extractDiagramJSON(beforeContent, file, cwd);
    const afterJSON = await extractDiagramJSON(afterContent, file, cwd);

    // Generate diff
    const { computeDiff, renderDiff } = await import("diagrams-js");

    const diff = computeDiff(beforeJSON, afterJSON, {
      ignore: {
        position: merged.ignorePosition ?? true,
        metadata: merged.ignoreMetadata ?? false,
      },
    });

    const diffOutput = await renderDiff(diff, beforeJSON, afterJSON, {
      format: merged.format ?? "html",
      theme: merged.theme ?? "light",
      layout: merged.layout ?? "side-by-side",
      showUnchanged: merged.showUnchanged ?? "show",
      showLegend: true,
      showSummary: false,
      hoverDetails: true,
    });

    spinner?.stop();
    if (outputPath) {
      outputResult(diffOutput, outputPath);
    }
    if (merged.stdout) {
      outputResult(diffOutput, undefined);
    }
  } catch (error) {
    spinner?.stop("Failed");
    throw error;
  }
}

/**
 * diagrams diff batch <ref> command
 * Generate diffs for all changed diagram files
 */
export async function diffBatchCommand(
  ref: string,
  options: DiffCommandOptions & { outputDir?: string },
): Promise<void> {
  const config = loadConfig(options.directory);
  const merged = mergeWithConfig(options, config, [
    "format",
    "theme",
    "layout",
    "showUnchanged",
    "ignorePosition",
    "ignoreMetadata",
  ]);

  const gitRef = parseGitRef(ref);
  const cwd = merged.directory || process.cwd();
  const outputDir = options.outputDir || "./diffs";

  try {
    git("rev-parse --show-toplevel", cwd);
  } catch {
    throw new Error("Not a git repository");
  }

  const changedFiles = getChangedDiagramFiles(gitRef.base, gitRef.target, cwd);

  if (changedFiles.length === 0) {
    if (!merged.quiet) {
      console.error("No changed diagram files found.");
    }
    return;
  }

  if (!merged.quiet) {
    console.error(`Found ${changedFiles.length} changed diagram file(s). Generating diffs...`);
  }

  const { mkdirSync } = await import("fs");
  mkdirSync(resolve(cwd, outputDir), { recursive: true });

  for (const file of changedFiles) {
    try {
      const diffOptions: DiffCommandOptions = {
        format: merged.format ?? "html",
        theme: merged.theme ?? "light",
        layout: merged.layout ?? "side-by-side",
        showUnchanged: merged.showUnchanged ?? "show",
        ignorePosition: merged.ignorePosition ?? true,
        directory: cwd,
        quiet: true,
      };

      const diffOutput = await diffCommandInternal(gitRef, file, diffOptions);
      const outputName = file.replace(/[^a-zA-Z0-9]/g, "_") + ".diff." + (merged.format ?? "html");
      const outputPath = resolve(cwd, outputDir, outputName);
      writeFileSync(outputPath, diffOutput, "utf-8");

      if (!merged.quiet) {
        console.error(`  \u2713 ${file} \u2192 ${outputPath}`);
      }
    } catch (error) {
      console.error(`  \u2717 ${file}:`, error instanceof Error ? error.message : String(error));
    }
  }

  if (!merged.quiet) {
    console.error("Done!");
  }
}

/**
 * diagrams diff list <ref> command
 * List changed diagram files between git refs
 */
export async function diffListCommand(
  ref: string,
  options: { directory?: string; quiet?: boolean },
): Promise<void> {
  const gitRef = parseGitRef(ref);
  const cwd = options.directory || process.cwd();

  try {
    git("rev-parse --show-toplevel", cwd);
  } catch {
    throw new Error("Not a git repository");
  }

  const changedFiles = getChangedDiagramFiles(gitRef.base, gitRef.target, cwd);

  if (changedFiles.length === 0) {
    if (!options.quiet) {
      console.error("No changed diagram files found.");
    }
    return;
  }

  for (const file of changedFiles) {
    console.log(file);
  }
}

// Internal helper for batch diff (reuses logic without console output)
async function diffCommandInternal(
  gitRef: GitRef,
  filePath: string,
  options: DiffCommandOptions,
): Promise<string> {
  const cwd = options.directory || process.cwd();

  const beforeContent = getFileContent(filePath, gitRef.base, cwd);
  const afterContent = gitRef.target
    ? getFileContent(filePath, gitRef.target, cwd)
    : getWorkingContent(filePath, cwd);

  if (!beforeContent || !afterContent) {
    throw new Error(`Could not read file at both refs: ${filePath}`);
  }

  const beforeJSON = await extractDiagramJSON(beforeContent, filePath, cwd);
  const afterJSON = await extractDiagramJSON(afterContent, filePath, cwd);

  const { computeDiff, renderDiff } = await import("diagrams-js");

  const diff = computeDiff(beforeJSON, afterJSON, {
    ignore: {
      position: options.ignorePosition ?? true,
      metadata: options.ignoreMetadata ?? false,
    },
  });

  return renderDiff(diff, beforeJSON, afterJSON, {
    format: options.format ?? "html",
    theme: options.theme ?? "light",
    layout: options.layout ?? "side-by-side",
    showUnchanged: options.showUnchanged ?? "show",
    showLegend: true,
    showSummary: false,
    hoverDetails: true,
  });
}

// Git utilities
export function parseGitRef(ref: string): GitRef {
  if (ref.includes("...")) {
    const [base, target] = ref.split("...");
    return { base: base.trim(), target: target.trim() };
  }
  if (ref.includes("..")) {
    const [base, target] = ref.split("..");
    return { base: base.trim(), target: target.trim() };
  }
  return { base: ref.trim() };
}

function git(command: string, cwd?: string): string {
  try {
    return execSync(`git ${command}`, {
      encoding: "utf-8",
      cwd: cwd || process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    }).trim();
  } catch (error) {
    throw new Error(`Git command failed: git ${command}\n${error}`);
  }
}

function getFileContent(filePath: string, ref: string, cwd?: string): string | null {
  try {
    return git(`show "${ref}:${filePath}"`, cwd);
  } catch {
    return null;
  }
}

function getWorkingContent(filePath: string, cwd?: string): string | null {
  const fullPath = resolve(cwd || process.cwd(), filePath);
  if (!existsSync(fullPath)) {
    return null;
  }
  return readFileSync(fullPath, "utf-8");
}

function getChangedDiagramFiles(baseRef: string, targetRef?: string, cwd?: string): string[] {
  const diffCommand = targetRef
    ? `diff --name-only "${baseRef}"..."${targetRef}"`
    : `diff --name-only "${baseRef}"`;

  const output = git(diffCommand, cwd);
  if (!output) return [];

  return output
    .split("\n")
    .filter(
      (file) =>
        file.endsWith(".ts") ||
        file.endsWith(".js") ||
        file.endsWith(".json") ||
        file.endsWith(".svg") ||
        file.endsWith(".yaml") ||
        file.endsWith(".yml"),
    )
    .filter((file) => !file.includes("node_modules/"));
}

// Extract diagram JSON from file content
async function extractDiagramJSON(
  fileContent: string,
  filePath: string,
  cwd?: string,
): Promise<DiagramJSON> {
  const { Diagram } = await import("diagrams-js");

  if (filePath.endsWith(".svg")) {
    try {
      const diagram = await Diagram.fromSVG(fileContent);
      return diagram.toJSON();
    } catch {
      throw new Error(`Invalid or unsupported SVG file: ${filePath}`);
    }
  }

  if (filePath.endsWith(".json")) {
    try {
      return JSON.parse(fileContent) as DiagramJSON;
    } catch {
      throw new Error(`Invalid JSON in file: ${filePath}`);
    }
  }

  // For TS/JS files, execute them
  const { writeFileSync, rmSync, mkdirSync } = await import("fs");
  const { join } = await import("path");

  const isTypeScript = filePath.endsWith(".ts");
  const ext = isTypeScript ? ".ts" : ".js";
  const fullFilePath = cwd ? resolve(cwd, filePath) : resolve(filePath);
  const importPath = "file://" + fullFilePath.replace(/\\/g, "/");
  const projectRoot = cwd || process.cwd();

  const wrapperDir = join(projectRoot, ".diagrams-cli");
  if (!existsSync(wrapperDir)) {
    mkdirSync(wrapperDir, { recursive: true });
  }

  const wrapperContent = `
import { Diagram } from "diagrams-js";
import * as diagramModule from "${importPath}";

async function main() {
  const exported = diagramModule.default || diagramModule;

  if (exported && typeof exported.toJSON === "function") {
    console.log(JSON.stringify(exported.toJSON(), null, 2));
    return;
  }

  if (typeof exported === "function") {
    const result = await exported();
    if (result && typeof result.toJSON === "function") {
      console.log(JSON.stringify(result.toJSON(), null, 2));
      return;
    }
  }

  for (const key of Object.keys(diagramModule)) {
    const val = diagramModule[key];
    if (val && typeof val.toJSON === "function") {
      console.log(JSON.stringify(val.toJSON(), null, 2));
      return;
    }
  }

  console.error("No diagram found in module");
  process.exit(1);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
`;

  const wrapperPath = join(wrapperDir, `diff-wrapper-${Date.now()}${ext}`);
  writeFileSync(wrapperPath, wrapperContent, "utf-8");

  try {
    const nodeArgs = isTypeScript ? ["--experimental-strip-types"] : [];
    const output = execSync(`node ${nodeArgs.join(" ")} "${wrapperPath}"`, {
      encoding: "utf-8",
      cwd: projectRoot,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30000,
      windowsHide: true,
    });

    rmSync(wrapperPath, { force: true });
    return JSON.parse(output.trim()) as DiagramJSON;
  } catch (error) {
    try {
      rmSync(wrapperPath, { force: true });
    } catch {
      // ignore
    }

    const jsonCommentMatch = fileContent.match(/\/\/\s*diagram-json:\s*(\{[\s\S]*?\})/);
    if (jsonCommentMatch) {
      try {
        return JSON.parse(jsonCommentMatch[1]) as DiagramJSON;
      } catch {
        // not valid
      }
    }

    throw new Error(
      `Failed to extract diagram JSON from ${filePath}:\n` +
        (error instanceof Error ? error.message : String(error)),
    );
  }
}
