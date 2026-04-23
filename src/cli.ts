#!/usr/bin/env node
import { Command } from "commander";
import { renderCommand } from "./commands/render.js";
import { importCommand } from "./commands/import.js";
import { exportCommand } from "./commands/export.js";
import { diffCommand, diffBatchCommand, diffListCommand } from "./commands/diff.js";
import { initCommand } from "./commands/init.js";
import { watchCommand } from "./commands/watch.js";
import { pluginsListCommand, pluginsInfoCommand } from "./commands/plugins.js";

const program = new Command();

program
  .name("diagrams")
  .description(
    "CLI for diagrams-js - render, import, export, diff, and manage architecture diagrams",
  )
  .version("0.1.0")
  .configureOutput({
    writeErr: (str) => process.stderr.write(str),
    outputError: (str, write) => write(`Error: ${str}`),
  });

// Global options
program.option("-q, --quiet", "suppress non-error output");
program.option("-C, --config <path>", "path to config file");

// diagrams render <file>
program
  .command("render")
  .description("Render a diagram file to SVG, PNG, JPG, DOT, or JSON")
  .argument("<file>", "diagram file (.ts, .js, .json, .svg)")
  .option("-o, --output <path>", "output file path (default: stdout)")
  .option("-f, --format <format>", "output format (svg|png|jpg|dot|json)")
  .option("-t, --theme <theme>", "color theme")
  .option("-d, --direction <dir>", "layout direction (TB|BT|LR|RL)")
  .option("--curve-style <style>", "edge curve style (ortho|curved|spline|polyline)")
  .option("--width <px>", "output width for PNG/JPG", parseInt)
  .option("--height <px>", "output height for PNG/JPG", parseInt)
  .option("--scale <n>", "scale factor for PNG/JPG", parseFloat)
  .option("--data-url", "output as data URL")
  .option("--no-embed-data", "disable embedding diagram data in SVG")
  .action(async (file, options) => {
    try {
      await renderCommand(file, options);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// diagrams import <file>
program
  .command("import")
  .description("Import from external formats (docker-compose, kubernetes, etc.)")
  .argument("<file>", "source file to import (.yaml, .yml)")
  .option("-o, --output <path>", "output file path (default: stdout)")
  .option("-f, --format <format>", "output format (svg|png|jpg|dot|json)", "svg")
  .option("-p, --plugin <name>", "plugin to use for import (auto-detected if omitted)")
  .option("-t, --theme <theme>", "color theme")
  .option("-d, --direction <dir>", "layout direction (TB|BT|LR|RL)")
  .option("--curve-style <style>", "edge curve style")
  .option("--width <px>", "output width", parseInt)
  .option("--height <px>", "output height", parseInt)
  .option("--scale <n>", "scale factor", parseFloat)
  .option("--data-url", "output as data URL")
  .action(async (file, options) => {
    try {
      await importCommand(file, options);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// diagrams export <file>
program
  .command("export")
  .description("Export a diagram to an external format")
  .argument("<file>", "diagram file (.ts, .js, .json, .svg)")
  .requiredOption("-f, --format <format>", "export format (e.g., docker-compose, kubernetes)")
  .option("-o, --output <path>", "output file path (default: stdout)")
  .option("-p, --plugin <name>", "plugin to use (defaults to format name)")
  .action(async (file, options) => {
    try {
      await exportCommand(file, options);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// diagrams diff <ref> <file>
const diffCmd = program
  .command("diff")
  .description("Generate visual diffs of diagrams in git workflows");

diffCmd
  .command("show")
  .description("Show diff for a specific file between git refs")
  .argument("<ref>", "git ref (e.g., HEAD, main...feature, abc123..def456)")
  .argument("<file>", "diagram file path")
  .option("-o, --output <path>", "output file path (default: stdout)")
  .option("-F, --format <format>", "diff output format (html|svg)", "html")
  .option("-t, --theme <theme>", "theme (light|dark)", "light")
  .option("-l, --layout <layout>", "layout (side-by-side|stacked)", "side-by-side")
  .option("-u, --show-unchanged <mode>", "show unchanged (show|dim|hide)", "show")
  .option("--ignore-position", "ignore position/layout changes", true)
  .option("--ignore-metadata", "ignore metadata changes", false)
  .option("-C, --directory <path>", "working directory for git commands")
  .option("-q, --quiet", "suppress non-error output")
  .action(async (ref, file, options) => {
    try {
      await diffCommand(ref, file, options);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

diffCmd
  .command("list")
  .description("List changed diagram files between git refs")
  .argument("<ref>", "git ref (e.g., HEAD, main...feature)")
  .option("-C, --directory <path>", "working directory for git commands")
  .option("-q, --quiet", "output only file paths")
  .action(async (ref, options) => {
    try {
      await diffListCommand(ref, options);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

diffCmd
  .command("batch")
  .description("Generate diffs for all changed diagram files")
  .argument("<ref>", "git ref (e.g., HEAD, main...feature)")
  .option("-o, --output-dir <dir>", "output directory for diff files", "./diffs")
  .option("-F, --format <format>", "output format (html|svg)", "html")
  .option("-t, --theme <theme>", "theme (light|dark)", "light")
  .option("-u, --show-unchanged <mode>", "show unchanged (show|dim|hide)", "show")
  .option("--ignore-position", "ignore position/layout changes", true)
  .option("-C, --directory <path>", "working directory for git commands")
  .option("-q, --quiet", "suppress non-error output")
  .action(async (ref, options) => {
    try {
      await diffBatchCommand(ref, options);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// diagrams init [name]
program
  .command("init")
  .description("Scaffold a new diagram file")
  .argument("[name]", "diagram name", "My Architecture")
  .option("-o, --output <path>", "output file path", "diagram.ts")
  .option("-t, --template <template>", "template to use (basic|aws|k8s)", "basic")
  .option("-q, --quiet", "suppress output")
  .action(async (name, options) => {
    try {
      await initCommand(name, options);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// diagrams watch <file>
program
  .command("watch")
  .description("Watch a diagram file and re-render on changes")
  .argument("<file>", "diagram file to watch")
  .option("-o, --output <path>", "output file path")
  .option("-f, --format <format>", "output format (svg|png|jpg|dot|json)", "svg")
  .option("-t, --theme <theme>", "color theme")
  .option("-d, --direction <dir>", "layout direction (TB|BT|LR|RL)")
  .option("--curve-style <style>", "edge curve style")
  .option("--width <px>", "output width", parseInt)
  .option("--height <px>", "output height", parseInt)
  .option("--scale <n>", "scale factor", parseFloat)
  .option("-q, --quiet", "suppress non-error output")
  .action(async (file, options) => {
    try {
      await watchCommand(file, options);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// diagrams plugins <subcommand>
const pluginsCmd = program.command("plugins").description("Discover and manage plugins");

pluginsCmd
  .command("list")
  .description("List available plugins")
  .option("-q, --quiet", "suppress headers")
  .action(async (options) => {
    try {
      await pluginsListCommand(options);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

pluginsCmd
  .command("info")
  .description("Show detailed information about a plugin")
  .argument("<name>", "plugin name")
  .option("-q, --quiet", "suppress output")
  .action(async (name, options) => {
    try {
      await pluginsInfoCommand(name, options);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
