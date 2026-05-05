#!/usr/bin/env node
import { Command } from "commander";
import { renderCommand } from "./commands/render.js";
import { exportCommand } from "./commands/export.js";
import { diffCommand, diffBatchCommand, diffListCommand } from "./commands/diff.js";
import { initCommand } from "./commands/init.js";
import { watchCommand } from "./commands/watch.js";
import { pluginsListCommand, pluginsInfoCommand } from "./commands/plugins.js";

const program = new Command();

program
  .name("diagrams")
  .description("CLI for diagrams-js - render, export, diff, and manage architecture diagrams")
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
  .description(
    "Render a diagram file to SVG, PNG, JPG, DOT, or JSON (supports plugin import for .yaml/.yml)",
  )
  .argument("[file]", "diagram file (.ts, .js, .json, .svg, .yaml, .yml) or - for stdin")
  .option(
    "-o, --output <path>",
    "output file path (default: same name as input with .svg extension)",
  )
  .option("--stdout", "output to stdout (in addition to --output if both are set)")
  .option("-f, --format <format>", "output format (svg|png|jpg|dot|json)")
  .option(
    "-p, --plugin <name>",
    "plugin to use for importing .yaml/.yml files (auto-detected if omitted)",
  )
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

// diagrams export <file>
program
  .command("export")
  .description("Export a diagram to an external format")
  .argument("<file>", "diagram file (.ts, .js, .json, .svg) or - for stdin")
  .requiredOption("-f, --format <format>", "export format (e.g., docker-compose, kubernetes)")
  .option("-o, --output <path>", "output file path (default: same name with format extension)")
  .option("--stdout", "output to stdout (in addition to --output if both are set)")
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
  .argument("<file>", "diagram file path (used for git lookup and output naming)")
  .option("-o, --output <path>", "output file path (default: <filename>-diff.html)")
  .option("--stdout", "output to stdout (in addition to --output if both are set)")
  .option("-f, --format <format>", "diff output format (html|svg)", "html")
  .option("-t, --theme <theme>", "theme (light|dark)", "light")
  .option("-l, --layout <layout>", "layout (side-by-side|stacked)", "side-by-side")
  .option("-u, --show-unchanged <mode>", "show unchanged (show|dim|hide)", "show")
  .option("--ignore-position", "ignore position/layout changes", true)
  .option("--ignore-metadata", "ignore metadata changes", false)
  .option("-D, --directory <path>", "working directory for git commands")
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
  .option("-D, --directory <path>", "working directory for git commands")
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
  .option("-f, --format <format>", "output format (html|svg)", "html")
  .option("-t, --theme <theme>", "theme (light|dark)", "light")
  .option("-u, --show-unchanged <mode>", "show unchanged (show|dim|hide)", "show")
  .option("--ignore-position", "ignore position/layout changes", true)
  .option("-D, --directory <path>", "working directory for git commands")
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
  .option(
    "-o, --output <path>",
    "output file path (default: same name as input with .svg extension)",
  )
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
