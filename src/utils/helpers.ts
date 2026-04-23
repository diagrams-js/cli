/**
 * Cross-platform utilities and helpers for the CLI
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";

/**
 * Write output to file or stdout
 */
export function outputResult(data: string | Uint8Array, outputPath?: string): void {
  if (outputPath) {
    const dir = dirname(outputPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    if (typeof data === "string") {
      writeFileSync(outputPath, data, "utf-8");
    } else {
      writeFileSync(outputPath, Buffer.from(data));
    }
    console.error(`Output saved to: ${outputPath}`);
  } else {
    if (typeof data === "string") {
      console.log(data);
    } else {
      process.stdout.write(Buffer.from(data));
    }
  }
}

/**
 * Detect output format from file extension
 */
export function formatFromPath(filePath: string): string | undefined {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const formatMap: Record<string, string> = {
    svg: "svg",
    png: "png",
    jpg: "jpg",
    jpeg: "jpg",
    dot: "dot",
    json: "json",
    html: "html",
  };
  return ext ? formatMap[ext] : undefined;
}

/**
 * Detect input format from file extension
 */
export function inputFormatFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const formatMap: Record<string, string> = {
    ts: "typescript",
    js: "javascript",
    mjs: "javascript",
    json: "json",
    svg: "svg",
    yaml: "yaml",
    yml: "yaml",
  };
  return ext ? formatMap[ext] || ext : "unknown";
}

/**
 * Resolve file path relative to cwd
 */
export function resolvePath(filePath: string, cwd?: string): string {
  if (resolve(filePath) === filePath) {
    return filePath;
  }
  return resolve(cwd || process.cwd(), filePath);
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Simple spinner for CLI feedback
 */
export function createSpinner(text: string) {
  let interval: NodeJS.Timeout | null = null;
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;

  return {
    start() {
      interval = setInterval(() => {
        process.stderr.write(`\r${frames[i]} ${text}`);
        i = (i + 1) % frames.length;
      }, 80);
    },
    stop(message?: string) {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      process.stderr.write(`\r${message || "Done!"}\n`);
    },
  };
}
