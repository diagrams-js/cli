/**
 * diagrams init [name] command
 * Scaffold a new diagram file
 */

import { writeFileSync, existsSync } from "fs";
import { resolve } from "path";

export interface InitCommandOptions {
  output?: string;
  template?: string;
  quiet?: boolean;
}

const templates: Record<string, (name: string) => string> = {
  basic: (name) => `import { Diagram, Node } from "diagrams-js";

const diagram = Diagram("${name}");

const web = diagram.add(Node("Web Server"));
const db = diagram.add(Node("Database"));

web.to(db);

export default diagram;
`,

  aws: (name) => `import { Diagram } from "diagrams-js";
import { EC2 } from "diagrams-js/aws/compute";
import { RDS } from "diagrams-js/aws/database";
import { S3 } from "diagrams-js/aws/storage";

const diagram = Diagram("${name}");

const web = diagram.add(EC2("Web Server"));
const db = diagram.add(RDS("Database"));
const storage = diagram.add(S3("Storage"));

web.to(db);
web.to(storage);

export default diagram;
`,

  k8s: (name) => `import { Diagram } from "diagrams-js";
import { Deploy } from "diagrams-js/k8s/compute";
import { SVC } from "diagrams-js/k8s/network";

const diagram = Diagram("${name}");

const deploy = diagram.add(Deploy("App Deployment"));
const svc = diagram.add(SVC("App Service"));

svc.to(deploy);

export default diagram;
`,
};

export async function initCommand(name?: string, options: InitCommandOptions = {}): Promise<void> {
  const diagramName = name || "My Architecture";
  const templateName = options.template || "basic";
  const outputPath = options.output || "diagram.ts";

  if (!templates[templateName]) {
    throw new Error(
      `Unknown template: ${templateName}. Available: ${Object.keys(templates).join(", ")}`,
    );
  }

  const fullPath = resolve(process.cwd(), outputPath);

  if (existsSync(fullPath)) {
    throw new Error(`File already exists: ${fullPath}`);
  }

  const content = templates[templateName](diagramName);
  writeFileSync(fullPath, content, "utf-8");

  if (!options.quiet) {
    console.error(`Created ${outputPath} using template "${templateName}"`);
  }
}
