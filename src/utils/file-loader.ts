/**
 * File loading utilities for diagram sources
 * Handles .ts, .js, .json, .svg input files, stdin, and inline data
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { resolve, join, extname } from "path";
import type { Diagram } from "diagrams-js";

/**
 * Load a diagram from a file path
 * Supports .ts, .js, .mjs, .json, .svg files
 */
export async function loadDiagram(
  filePath: string,
  cwd?: string,
): Promise<{ diagram: Diagram; format: string }> {
  const fullPath = resolve(cwd || process.cwd(), filePath);

  if (!existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  const ext = extname(fullPath).toLowerCase();
  const content = readFileSync(fullPath, "utf-8");

  switch (ext) {
    case ".ts":
    case ".js":
    case ".mjs": {
      const diagram = await executeDiagramFile(fullPath, cwd);
      return { diagram, format: "code" };
    }
    case ".json": {
      const { Diagram } = await import("diagrams-js");
      const json = JSON.parse(content);
      const diagram = await Diagram.fromJSON(json);
      return { diagram, format: "json" };
    }
    case ".svg": {
      const { Diagram } = await import("diagrams-js");
      const diagram = await Diagram.fromSVG(content);
      return { diagram, format: "svg" };
    }
    default:
      throw new Error(`Unsupported file format: ${ext}. Supported: .ts, .js, .mjs, .json, .svg`);
  }
}

/**
 * Load a diagram from inline string data
 * Supports JSON and SVG content
 */
export async function loadDiagramFromData(
  data: string,
  format?: string,
): Promise<{ diagram: Diagram; format: string }> {
  const trimmed = data.trim();
  const detectedFormat = format || detectDataFormat(trimmed);

  switch (detectedFormat) {
    case "json": {
      const { Diagram } = await import("diagrams-js");
      const json = JSON.parse(trimmed);
      const diagram = await Diagram.fromJSON(json);
      return { diagram, format: "json" };
    }
    case "svg": {
      const { Diagram } = await import("diagrams-js");
      const diagram = await Diagram.fromSVG(trimmed);
      return { diagram, format: "svg" };
    }
    default:
      throw new Error(
        `Could not detect diagram format from data. Use --format to specify (json|svg).`,
      );
  }
}

function detectDataFormat(data: string): string | undefined {
  if (data.startsWith("{") || data.startsWith("[")) return "json";
  if (data.startsWith("<svg") || data.includes("<svg")) return "svg";
  return undefined;
}

/**
 * Read all data from stdin
 */
export function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      resolve(data);
    });
    process.stdin.on("error", (err) => {
      reject(err);
    });
    // If stdin is already at EOF (not piped), resolve immediately
    if (process.stdin.isTTY) {
      resolve(data);
    }
  });
}

/**
 * Execute a TypeScript or JavaScript diagram file and extract the Diagram instance
 */
async function executeDiagramFile(filePath: string, cwd?: string): Promise<Diagram> {
  const { Diagram } = await import("diagrams-js");
  const isTypeScript = filePath.endsWith(".ts");
  const ext = isTypeScript ? ".ts" : ".js";

  // Convert to file:// URL for Windows compatibility with ESM
  const importPath = "file://" + resolve(filePath).replace(/\\/g, "/");
  const projectRoot = cwd || process.cwd();

  // Create a wrapper directory
  const wrapperDir = join(projectRoot, ".diagrams-cli");
  if (!existsSync(wrapperDir)) {
    mkdirSync(wrapperDir, { recursive: true });
  }

  // Create a wrapper that imports the diagram file and exports the diagram
  const wrapperContent = `
import { Diagram } from "diagrams-js";
import * as diagramModule from "${importPath}";

async function main() {
  const exported = diagramModule.default || diagramModule;

  // If it's a Diagram instance, serialize to JSON
  if (exported && typeof exported.toJSON === "function") {
    console.log(JSON.stringify(exported.toJSON(), null, 2));
    return;
  }

  // If it's a function that returns a Diagram or Promise<Diagram>
  if (typeof exported === "function") {
    const result = await exported();
    if (result && typeof result.toJSON === "function") {
      console.log(JSON.stringify(result.toJSON(), null, 2));
      return;
    }
  }

  // Try named exports
  for (const key of Object.keys(diagramModule)) {
    const val = diagramModule[key];
    if (val && typeof val.toJSON === "function") {
      console.log(JSON.stringify(val.toJSON(), null, 2));
      return;
    }
  }

  console.error("No diagram found in module. Export a Diagram instance as default or named export.");
  process.exit(1);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
`;

  const wrapperPath = join(wrapperDir, `wrapper-${Date.now()}${ext}`);
  writeFileSync(wrapperPath, wrapperContent, "utf-8");

  try {
    const { execSync } = await import("child_process");
    const nodeArgs = isTypeScript ? ["--experimental-strip-types"] : [];
    const output = execSync(`node ${nodeArgs.join(" ")} "${wrapperPath}"`, {
      encoding: "utf-8",
      cwd: projectRoot,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30000,
      windowsHide: true,
    });

    const json = JSON.parse(output.trim());
    return Diagram.fromJSON(json);
  } catch (error) {
    // Check for inline JSON comment fallback
    const content = readFileSync(filePath, "utf-8");
    const jsonCommentMatch = content.match(/\/\/\s*diagram-json:\s*(\{[\s\S]*?\})/);
    if (jsonCommentMatch) {
      try {
        const json = JSON.parse(jsonCommentMatch[1]);
        return Diagram.fromJSON(json);
      } catch {
        // Not valid JSON in comment
      }
    }

    throw new Error(
      `Failed to execute diagram file ${filePath}:\n` +
        (error instanceof Error ? error.message : String(error)) +
        `\n\nMake sure the file exports a Diagram instance.`,
    );
  } finally {
    // Clean up wrapper
    try {
      rmSync(wrapperPath, { force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Read raw file content
 */
export function readFileContent(filePath: string, cwd?: string): string {
  const fullPath = resolve(cwd || process.cwd(), filePath);
  if (!existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  return readFileSync(fullPath, "utf-8");
}

/**
 * Detect if a file is a diagram source file (code, json, or svg)
 */
export function isDiagramFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return [".ts", ".js", ".mjs", ".json", ".svg"].includes(ext);
}

/**
 * Detect if a file is an importable config file (yaml for plugins)
 */
export function isImportableFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return [".yaml", ".yml"].includes(ext);
}
