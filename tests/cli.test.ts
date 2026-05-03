import { describe, it, expect, vi } from "vite-plus/test";
import {
  formatFromPath,
  inputFormatFromPath,
  resolvePath,
  formatBytes,
} from "../src/utils/helpers.js";
import { loadConfig, mergeWithConfig } from "../src/utils/config.js";
import { parseGitRef } from "../src/commands/diff.js";
import { resolveRenderOutputPath } from "../src/commands/render.js";
import { resolveDiffOutputPath } from "../src/commands/diff.js";
import { resolveExportOutputPath } from "../src/commands/export.js";
import { isImportableFile, isDiagramFile, readStdin } from "../src/utils/file-loader.js";

describe("CLI helpers", () => {
  it("should detect format from file path", () => {
    expect(formatFromPath("diagram.svg")).toBe("svg");
    expect(formatFromPath("diagram.png")).toBe("png");
    expect(formatFromPath("diagram.jpg")).toBe("jpg");
    expect(formatFromPath("diagram.jpeg")).toBe("jpg");
    expect(formatFromPath("diagram.dot")).toBe("dot");
    expect(formatFromPath("diagram.json")).toBe("json");
    expect(formatFromPath("diagram.html")).toBe("html");
    expect(formatFromPath("diagram.txt")).toBeUndefined();
  });

  it("should detect input format from file path", () => {
    expect(inputFormatFromPath("diagram.ts")).toBe("typescript");
    expect(inputFormatFromPath("diagram.js")).toBe("javascript");
    expect(inputFormatFromPath("diagram.mjs")).toBe("javascript");
    expect(inputFormatFromPath("diagram.json")).toBe("json");
    expect(inputFormatFromPath("diagram.svg")).toBe("svg");
    expect(inputFormatFromPath("diagram.yaml")).toBe("yaml");
    expect(inputFormatFromPath("diagram.yml")).toBe("yaml");
  });

  it("should resolve paths", () => {
    const resolved = resolvePath("diagram.ts", "C:\\projects");
    expect(resolved).toContain("diagram.ts");
  });

  it("should format bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
  });
});

describe("Config utilities", () => {
  it("should return empty config when no file exists", () => {
    const config = loadConfig("/nonexistent");
    expect(config).toEqual({});
  });

  it("should merge options with config", () => {
    const options = { format: undefined, theme: undefined };
    const config = { format: "png", theme: "dark" };
    const merged = mergeWithConfig(options, config, ["format", "theme"]);
    expect(merged).toEqual({ format: "png", theme: "dark" });
  });

  it("should not override explicitly set options", () => {
    const options = { format: "svg", theme: undefined };
    const config = { format: "png", theme: "dark" };
    const merged = mergeWithConfig(options, config, ["format", "theme"]);
    expect(merged).toEqual({ format: "svg", theme: "dark" });
  });
});

describe("Git ref parsing", () => {
  it("should parse single ref", () => {
    expect(parseGitRef("HEAD")).toEqual({ base: "HEAD" });
    expect(parseGitRef("main")).toEqual({ base: "main" });
  });

  it("should parse double-dot range", () => {
    expect(parseGitRef("main..feature")).toEqual({ base: "main", target: "feature" });
  });

  it("should parse triple-dot range", () => {
    expect(parseGitRef("main...feature")).toEqual({ base: "main", target: "feature" });
  });

  it("should trim whitespace", () => {
    expect(parseGitRef(" main ")).toEqual({ base: "main" });
    expect(parseGitRef("main .. feature")).toEqual({ base: "main", target: "feature" });
  });
});

describe("resolveRenderOutputPath", () => {
  it("should default to same-name svg in same directory", () => {
    const result = resolveRenderOutputPath("diagram.ts", "svg", undefined, undefined);
    expect(result).toMatch(/diagram\.svg$/);
  });

  it("should default to same-name with given format", () => {
    const result = resolveRenderOutputPath("diagram.ts", "png", undefined, undefined);
    expect(result).toMatch(/diagram\.png$/);
  });

  it("should handle relative paths", () => {
    const result = resolveRenderOutputPath("src/diagram.ts", "svg", undefined, undefined);
    expect(result).toMatch(/src[/\\]diagram\.svg$/);
  });

  it("should use explicit output path when provided", () => {
    const result = resolveRenderOutputPath("diagram.ts", "svg", "out/custom.svg", undefined);
    expect(result).toBe("out/custom.svg");
  });

  it("should return undefined when stdout is set", () => {
    const result = resolveRenderOutputPath("diagram.ts", "svg", undefined, true);
    expect(result).toBeUndefined();
  });

  it("should prefer explicit output over stdout", () => {
    const result = resolveRenderOutputPath("diagram.ts", "svg", "out/custom.svg", true);
    expect(result).toBe("out/custom.svg");
  });
});

describe("resolveDiffOutputPath", () => {
  it("should default to <filename>-diff.html", () => {
    const result = resolveDiffOutputPath("diagram.ts", "/project", undefined, undefined);
    expect(result).toMatch(/diagram-diff\.html$/);
  });

  it("should preserve directory from cwd", () => {
    const result = resolveDiffOutputPath("src/diagram.ts", "/project", undefined, undefined);
    expect(result).toMatch(/[/\\]project[/\\]diagram-diff\.html$/);
  });

  it("should use explicit output path when provided", () => {
    const result = resolveDiffOutputPath("diagram.ts", "/project", "custom.html", undefined);
    expect(result).toBe("custom.html");
  });

  it("should return undefined when stdout is set", () => {
    const result = resolveDiffOutputPath("diagram.ts", "/project", undefined, true);
    expect(result).toBeUndefined();
  });

  it("should prefer explicit output over stdout", () => {
    const result = resolveDiffOutputPath("diagram.ts", "/project", "custom.html", true);
    expect(result).toBe("custom.html");
  });
});

describe("file type detection", () => {
  it("should detect diagram files", () => {
    expect(isDiagramFile("diagram.ts")).toBe(true);
    expect(isDiagramFile("diagram.js")).toBe(true);
    expect(isDiagramFile("diagram.mjs")).toBe(true);
    expect(isDiagramFile("diagram.json")).toBe(true);
    expect(isDiagramFile("diagram.svg")).toBe(true);
    expect(isDiagramFile("diagram.yaml")).toBe(false);
    expect(isDiagramFile("diagram.yml")).toBe(false);
    expect(isDiagramFile("diagram.txt")).toBe(false);
  });

  it("should detect importable files", () => {
    expect(isImportableFile("docker-compose.yml")).toBe(true);
    expect(isImportableFile("docker-compose.yaml")).toBe(true);
    expect(isImportableFile("k8s.yaml")).toBe(true);
    expect(isImportableFile("diagram.ts")).toBe(false);
    expect(isImportableFile("diagram.json")).toBe(false);
  });
});

describe("resolveExportOutputPath", () => {
  it("should default to file with format extension", () => {
    const result = resolveExportOutputPath("diagram.json", "docker-compose", undefined, undefined);
    expect(result).toMatch(/diagram\.yml$/);
  });

  it("should use yaml for kubernetes", () => {
    const result = resolveExportOutputPath("diagram.json", "kubernetes", undefined, undefined);
    expect(result).toMatch(/diagram\.yaml$/);
  });

  it("should use format name as extension for unknown formats", () => {
    const result = resolveExportOutputPath("diagram.json", "custom", undefined, undefined);
    expect(result).toMatch(/diagram\.custom$/);
  });

  it("should use 'diagram' as base name for stdin", () => {
    const result = resolveExportOutputPath("-", "docker-compose", undefined, undefined);
    expect(result).toMatch(/diagram\.yml$/);
  });

  it("should use explicit output when provided", () => {
    const result = resolveExportOutputPath(
      "diagram.json",
      "docker-compose",
      "out/compose.yml",
      undefined,
    );
    expect(result).toBe("out/compose.yml");
  });

  it("should return undefined when stdout is set", () => {
    const result = resolveExportOutputPath("diagram.json", "docker-compose", undefined, true);
    expect(result).toBeUndefined();
  });

  it("should prefer explicit output over stdout", () => {
    const result = resolveExportOutputPath(
      "diagram.json",
      "docker-compose",
      "out/compose.yml",
      true,
    );
    expect(result).toBe("out/compose.yml");
  });
});

describe("readStdin", () => {
  it("should read data from stdin", async () => {
    const originalIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = false;

    const mockData = '{"name":"test"}';
    const handlers: Record<string, ((arg?: unknown) => void)[]> = {};

    vi.spyOn(process.stdin, "setEncoding").mockImplementation(() => process.stdin);
    vi.spyOn(process.stdin, "on").mockImplementation(
      (event: string, handler: (arg?: unknown) => void) => {
        if (!handlers[event]) handlers[event] = [];
        handlers[event].push(handler);
        return process.stdin;
      },
    );

    const promise = readStdin();

    // Simulate data and end events
    handlers["data"]?.forEach((h) => h(mockData));
    handlers["end"]?.forEach((h) => h());

    const result = await promise;
    expect(result).toBe(mockData);

    process.stdin.isTTY = originalIsTTY;
    vi.restoreAllMocks();
  });
});
