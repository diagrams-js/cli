/**
 * Plugin auto-discovery and loading utilities
 */

import { readdirSync, existsSync, readFileSync } from "fs";
import { resolve, join } from "path";
import type { DiagramsPlugin } from "diagrams-js";

export interface DiscoveredPlugin {
  name: string;
  packageName: string;
  version: string;
  description?: string;
  path: string;
}

/**
 * Auto-discover diagrams-js plugins in node_modules
 */
export function discoverPlugins(cwd?: string): DiscoveredPlugin[] {
  const plugins: DiscoveredPlugin[] = [];
  const nodeModulesPath = resolve(cwd || process.cwd(), "node_modules");

  if (!existsSync(nodeModulesPath)) {
    return plugins;
  }

  // Check scoped packages: @diagrams-js/plugin-*
  const scopedPath = join(nodeModulesPath, "@diagrams-js");
  if (existsSync(scopedPath)) {
    for (const dir of readdirSync(scopedPath)) {
      if (dir.startsWith("plugin-")) {
        const pkgPath = join(scopedPath, dir, "package.json");
        if (existsSync(pkgPath)) {
          try {
            const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
              name: string;
              version: string;
              description?: string;
            };
            plugins.push({
              name: dir.replace("plugin-", ""),
              packageName: pkg.name,
              version: pkg.version,
              description: pkg.description,
              path: join(scopedPath, dir),
            });
          } catch {
            // Skip invalid packages
          }
        }
      }
    }
  }

  // Check unscoped packages: diagrams-js-plugin-*
  for (const dir of readdirSync(nodeModulesPath)) {
    if (dir.startsWith("diagrams-js-plugin-")) {
      const pkgPath = join(nodeModulesPath, dir, "package.json");
      if (existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
            name: string;
            version: string;
            description?: string;
          };
          plugins.push({
            name: dir.replace("diagrams-js-plugin-", ""),
            packageName: pkg.name,
            version: pkg.version,
            description: pkg.description,
            path: join(nodeModulesPath, dir),
          });
        } catch {
          // Skip invalid packages
        }
      }
    }
  }

  return plugins.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Load a plugin by name
 */
export async function loadPlugin(name: string, cwd?: string): Promise<DiagramsPlugin> {
  const nodeModulesPath = resolve(cwd || process.cwd(), "node_modules");

  // Try scoped package first
  const scopedPath = `@diagrams-js/plugin-${name}`;
  try {
    const mod = await import(resolve(nodeModulesPath, scopedPath));
    return (
      mod[name + "Plugin"] ||
      mod.default ||
      mod.plugin ||
      mod[Object.keys(mod).find((k) => k.endsWith("Plugin")) || ""]
    );
  } catch {
    // Try unscoped
  }

  // Try unscoped package
  const unscopedPath = `diagrams-js-plugin-${name}`;
  try {
    const mod = await import(resolve(nodeModulesPath, unscopedPath));
    return (
      mod[name + "Plugin"] ||
      mod.default ||
      mod.plugin ||
      mod[Object.keys(mod).find((k) => k.endsWith("Plugin")) || ""]
    );
  } catch {
    // Try exact name
  }

  // Try exact package name
  try {
    const mod = await import(resolve(nodeModulesPath, name));
    return (
      mod[name + "Plugin"] ||
      mod.default ||
      mod.plugin ||
      mod[Object.keys(mod).find((k) => k.endsWith("Plugin")) || ""]
    );
  } catch {
    throw new Error(`Could not load plugin "${name}". Make sure it is installed.`);
  }
}

/**
 * Load multiple plugins
 */
export async function loadPlugins(names: string[], cwd?: string): Promise<DiagramsPlugin[]> {
  const plugins: DiagramsPlugin[] = [];
  for (const name of names) {
    try {
      const plugin = await loadPlugin(name, cwd);
      if (plugin) {
        plugins.push(plugin);
      }
    } catch (error) {
      console.error(`Warning: Failed to load plugin "${name}": ${error}`);
    }
  }
  return plugins;
}
