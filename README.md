# @diagrams-js/cli

CLI for [diagrams-js](https://diagrams-js.hatemhosny.dev) - render, import, export, diff, and manage architecture diagrams from the terminal.

## Installation

```bash
npm install -g @diagrams-js/cli
```

Or use with npx:

```bash
npx @diagrams-js/cli render diagram.ts -o out.svg
```

## Usage

### Render a diagram

```bash
# Render to SVG (default)
diagrams render diagram.ts

# Render to PNG
diagrams render diagram.ts -o diagram.png

# Render with theme and direction
diagrams render diagram.ts -f svg -t dark -d LR -o out.svg

# Render to JSON
diagrams render diagram.json -f json
```

### Import from external formats

```bash
# Import Docker Compose and render to SVG
diagrams import docker-compose.yml -o architecture.svg

# Import Kubernetes manifest
diagrams import k8s-deployment.yaml -p kubernetes -o architecture.svg

# Import with custom options
diagrams import compose.yml -f png -t dark --width 1200 -o out.png
```

### Export to external formats

```bash
# Export diagram to Docker Compose
diagrams export diagram.json -f docker-compose -o docker-compose.yml

# Export to Kubernetes
diagrams export diagram.ts -f kubernetes -o manifest.yaml
```

### Diff diagrams in git

```bash
# Diff a single file against HEAD
diagrams diff show HEAD diagram.ts -o diff.html

# Diff between branches
diagrams diff show main...feature diagram.json -F html -o diff.html

# List changed diagram files
diagrams diff list HEAD

# Batch diff all changed files
diagrams diff batch main...feature -o ./diffs
```

### Scaffold a new diagram

```bash
# Create a basic diagram
diagrams init "My Architecture"

# Create with AWS template
diagrams init "AWS Stack" -t aws -o aws.ts

# Create with Kubernetes template
diagrams init "K8s Cluster" -t k8s -o k8s.ts
```

### Watch and auto-render

```bash
# Watch a diagram file and re-render on changes
diagrams watch diagram.ts -o out.svg

# Watch with custom options
diagrams watch diagram.ts -f png -t dark --scale 2 -o out.png
```

### Manage plugins

```bash
# List installed plugins
diagrams plugins list

# Show plugin info
diagrams plugins info docker-compose
```

## Configuration

Create a `.diagramsrc.json` file in your project root:

```json
{
  "format": "svg",
  "theme": "light",
  "direction": "TB",
  "curveStyle": "ortho",
  "scale": 2,
  "diff": {
    "layout": "side-by-side",
    "showUnchanged": "show",
    "ignorePosition": true
  }
}
```

## Supported File Formats

### Input

| Extension        | Description                                   |
| ---------------- | --------------------------------------------- |
| `.ts`            | TypeScript diagram file                       |
| `.js` / `.mjs`   | JavaScript diagram file                       |
| `.json`          | Diagram JSON export                           |
| `.svg`           | Diagram SVG with embedded metadata            |
| `.yaml` / `.yml` | Importable config (docker-compose, k8s, etc.) |

### Output

| Format | Description                            |
| ------ | -------------------------------------- |
| `svg`  | Scalable Vector Graphics (default)     |
| `png`  | PNG image (requires sharp in Node.js)  |
| `jpg`  | JPEG image (requires sharp in Node.js) |
| `dot`  | Graphviz DOT source                    |
| `json` | Diagram JSON serialization             |
| `html` | Self-contained HTML diff               |

## Programmatic API

All CLI commands are available programmatically:

```typescript
import { render, importDiagram, diff, init } from "@diagrams-js/cli";

// Render
await render("diagram.ts", { format: "svg", output: "out.svg" });

// Import
await importDiagram("docker-compose.yml", { output: "architecture.svg" });

// Diff
await diff("HEAD", "diagram.json", { format: "html", output: "diff.html" });

// Init
await init("My Architecture", { template: "aws", output: "diagram.ts" });
```

## Cross-Platform

Works on Windows, macOS, and Linux.

## License

MIT
