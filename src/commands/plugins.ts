/**
 * diagrams plugins <subcommand> command
 * Discover and manage plugins
 */

import { discoverPlugins, loadPlugin } from "../utils/plugin-loader.js";

export interface PluginsListOptions {
  quiet?: boolean;
}

export interface PluginsInfoOptions {
  quiet?: boolean;
}

export async function pluginsListCommand(options: PluginsListOptions = {}): Promise<void> {
  const plugins = discoverPlugins(process.cwd());

  if (plugins.length === 0) {
    if (!options.quiet) {
      console.error("No diagrams-js plugins found.");
      console.error("Install plugins with: npm install @diagrams-js/plugin-<name>");
    }
    return;
  }

  if (!options.quiet) {
    console.error(`Found ${plugins.length} plugin(s):\n`);
  }

  for (const plugin of plugins) {
    console.log(`${plugin.name}`);
    console.log(`  Package: ${plugin.packageName}`);
    console.log(`  Version: ${plugin.version}`);
    if (plugin.description) {
      console.log(`  Description: ${plugin.description}`);
    }
    console.log("");
  }
}

export async function pluginsInfoCommand(
  name: string,
  options: PluginsInfoOptions = {},
): Promise<void> {
  try {
    const plugin = await loadPlugin(name, process.cwd());

    if (!options.quiet) {
      console.log(`Plugin: ${plugin.name}`);
      console.log(`Version: ${plugin.version}`);
      console.log(`API Version: ${plugin.apiVersion}`);
      console.log(`Runtime Support:`);
      console.log(`  Node.js: ${plugin.runtimeSupport.node ? "Yes" : "No"}`);
      console.log(`  Browser: ${plugin.runtimeSupport.browser ? "Yes" : "No"}`);
      console.log(`  Deno: ${plugin.runtimeSupport.deno ? "Yes" : "No"}`);
      console.log(`  Bun: ${plugin.runtimeSupport.bun ? "Yes" : "No"}`);
      console.log(`Capabilities:`);

      for (const cap of plugin.capabilities) {
        console.log(`  - ${cap.type}: ${(cap as { name?: string }).name || ""}`);
        if (cap.type === "importer") {
          console.log(
            `    Extensions: ${(cap as { extensions?: string[] }).extensions?.join(", ") || "N/A"}`,
          );
        }
        if (cap.type === "exporter") {
          console.log(`    Extension: ${(cap as { extension?: string }).extension || "N/A"}`);
        }
      }

      if (plugin.dependencies && plugin.dependencies.length > 0) {
        console.log(`Dependencies: ${plugin.dependencies.join(", ")}`);
      }
    }
  } catch (error) {
    console.error(
      `Failed to load plugin "${name}": ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
