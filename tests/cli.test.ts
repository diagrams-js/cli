import { describe, it, expect } from "vite-plus/test";
import {
  formatFromPath,
  inputFormatFromPath,
  resolvePath,
  formatBytes,
} from "../src/utils/helpers.js";
import { loadConfig, mergeWithConfig } from "../src/utils/config.js";
import { parseGitRef } from "../src/commands/diff.js";

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
