import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { describe, expect, test } from "vitest";

import * as root from "./index";
import * as button from "./button/index";
import * as backHeader from "./back-header/index";
import * as statusIndicator from "./status-indicator/index";
import * as roundButton from "./round-button/index";
import * as progressHeader from "./progress-header/index";
import * as pageIndicator from "./page-indicator/index";

const execFileAsync = promisify(execFile);
const packageRoot = path.resolve(import.meta.dirname, "..");
const componentArtifacts = {
  button: { implementation: "Button.jsx", css: "button.css" },
  "back-header": { implementation: "BackHeader.jsx", css: "back-header.css" },
  "status-indicator": { implementation: "StatusIndicator.jsx", css: "status-indicator.css" },
  "round-button": { implementation: "RoundButton.jsx", css: "round-button.css" },
  "progress-header": { implementation: "ProgressHeader.jsx", css: "progress-header.css" },
  "page-indicator": { implementation: "PageIndicator.jsx", css: "page-indicator.css" },
} as const;

const componentEntries = {
  button: "Button",
  "back-header": "BackHeader",
  "status-indicator": "StatusIndicator",
  "round-button": "RoundButton",
  "progress-header": "ProgressHeader",
  "page-indicator": "PageIndicator",
} as const;

async function readPackageJson() {
  return JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8")) as {
    main: string;
    module: string;
    types: string;
    exports: Record<string, string | { import?: string; default?: string; types?: string }>;
  };
}

describe("ui-lynx package boundaries", () => {
  test("root import preserves value identity and type-compatible subpath values", () => {
    expect(root.Button).toBe(button.Button);
    expect(root.BackHeader).toBe(backHeader.BackHeader);
    expect(root.StatusIndicator).toBe(statusIndicator.StatusIndicator);
    expect(root.RoundButton).toBe(roundButton.RoundButton);
    expect(root.ProgressHeader).toBe(progressHeader.ProgressHeader);
    expect(root.PageIndicator).toBe(pageIndicator.PageIndicator);
    expect(root.getButtonContract).toBe(button.getButtonContract);
    expect(root.getStatusIndicatorLabel).toBe(statusIndicator.getStatusIndicatorLabel);
    expect(root.getProgressHeaderProgress).toBe(progressHeader.getProgressHeaderProgress);
    expect(root.getPageIndicatorModel).toBe(pageIndicator.getPageIndicatorModel);
  });

  test("each public subpath resolves to an independent source entry", async () => {
    const packageJson = await readPackageJson();
    for (const [subpath, entry] of Object.entries(
      Object.fromEntries(Object.keys(componentEntries).map((entry) => [`./${entry}`, entry])),
    )) {
      const exportMap = packageJson.exports[subpath];
      expect(exportMap).toMatchObject({
        import: `./dist/${entry}/index.js`,
        default: `./dist/${entry}/index.js`,
        types: `./dist/${entry}/index.d.ts`,
      });
      expect(await readFile(path.join(packageRoot, "src", entry, "index.ts"), "utf8")).toContain(
        `./${componentEntries[entry as keyof typeof componentEntries]}`,
      );
    }
  });

  test("package entry fields and dist outputs are component-specific", async () => {
    const packageJson = await readPackageJson();
    expect(packageJson.main).toBe("./dist/index.js");
    expect(packageJson.module).toBe("./dist/index.js");
    expect(packageJson.types).toBe("./dist/index.d.ts");

    for (const [entry, artifacts] of Object.entries(componentArtifacts)) {
      for (const file of ["index.js", artifacts.implementation, "index.d.ts", artifacts.css]) {
        await expect(readFile(path.join(packageRoot, "dist", entry, file))).resolves.toBeDefined();
      }
    }
  });

  test("published tarball contains root and component artifacts with preserved JSX", async () => {
    const packDir = path.join(packageRoot, ".pack");
    const archives = (await readdir(packDir)).filter((file) => file.endsWith(".tgz"));
    expect(archives.length).toBeGreaterThan(0);
    const { stdout } = await execFileAsync("tar", ["-tzf", path.join(packDir, archives[0]!)]);
    for (const file of [
      "package/dist/index.js",
      "package/dist/index.d.ts",
      "package/dist/button/index.js",
      `package/dist/button/${componentArtifacts.button.implementation}`,
      "package/dist/button/index.d.ts",
      `package/dist/button/${componentArtifacts.button.css}`,
      "package/dist/back-header/index.js",
      `package/dist/back-header/${componentArtifacts["back-header"].implementation}`,
      "package/dist/back-header/index.d.ts",
      `package/dist/back-header/${componentArtifacts["back-header"].css}`,
      "package/dist/status-indicator/index.js",
      `package/dist/status-indicator/${componentArtifacts["status-indicator"].implementation}`,
      "package/dist/status-indicator/index.d.ts",
      `package/dist/status-indicator/${componentArtifacts["status-indicator"].css}`,
      "package/dist/round-button/index.js",
      `package/dist/round-button/${componentArtifacts["round-button"].implementation}`,
      "package/dist/round-button/index.d.ts",
      `package/dist/round-button/${componentArtifacts["round-button"].css}`,
      "package/dist/progress-header/index.js",
      `package/dist/progress-header/${componentArtifacts["progress-header"].implementation}`,
      "package/dist/progress-header/index.d.ts",
      `package/dist/progress-header/${componentArtifacts["progress-header"].css}`,
      "package/dist/page-indicator/index.js",
      `package/dist/page-indicator/${componentArtifacts["page-indicator"].implementation}`,
      "package/dist/page-indicator/index.d.ts",
      `package/dist/page-indicator/${componentArtifacts["page-indicator"].css}`,
    ]) {
      expect(stdout).toContain(file);
    }
  });
});
