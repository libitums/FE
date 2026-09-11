import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

const appRoot = path.resolve(import.meta.dirname, "..");
const packageRoot = path.resolve(appRoot, "../..", "packages/ui-lynx");

async function readText(relativePath: string, root = appRoot): Promise<string> {
  return readFile(path.join(root, relativePath), "utf8");
}

async function readBytes(relativePath: string, root = appRoot): Promise<Buffer> {
  return readFile(path.join(root, relativePath));
}

async function readJson<T>(relativePath: string, root = appRoot): Promise<T> {
  return JSON.parse(await readText(relativePath, root)) as T;
}

describe("ProgressHeader Storybook integration contract", () => {
  test("produces an actual Rspeedy Lynx web bundle", async () => {
    const bundle = await readBytes("dist/lynx/progress-header.web.bundle");
    expect(bundle.byteLength).toBeGreaterThan(1_000);
    expect(bundle.subarray(0, 8).toString("ascii")).toBe("SDRAWROF");
  });

  test("indexes every ProgressHeader story", async () => {
    const index = await readText("dist/storybook/index.json");
    for (const story of ["default", "zero", "minimum-fill", "complete", "reduced-motion"]) {
      expect(index).toContain(`components-progress-header--${story}`);
    }
  });

  test("uses the public ProgressHeader package subpath in the Lynx entry", async () => {
    const config = await readText("lynx.config.ts");
    expect(config).toMatch(
      /['"]progress-header['"]\s*:\s*['"]\.\/src\/lynx\/progress-header\.tsx['"]/,
    );

    const source = await readText("src/lynx/progress-header.tsx");
    expect(source).toMatch(/from\s+["']@libitums\/ui-lynx\/progress-header["']/);
    expect(source).toMatch(/\bProgressHeader\b/);
    expect(source).toMatch(/useInitData/);
    expect(source).toMatch(/STORYBOOK_ACTION/);
    expect(source).toMatch(/name\s*:\s*["']onExit["']/);
    expect(source).toMatch(/typeof\s+NativeModules\s*===\s*["']undefined["']/);
    expect(source.indexOf('typeof NativeModules === "undefined"')).toBeLessThan(
      source.indexOf("NativeModules.bridge"),
    );
    expect(source).not.toMatch(/\bdocument\b|\bwindow\b|createElement|<div\b|mock\s*dom/i);
  });

  test("keeps the ProgressHeader story args serializable and points at its bundle", async () => {
    const source = await readText("src/ProgressHeader.stories.ts");
    expect(source).toContain('bundleUrl: "./lynx/progress-header.web.bundle"');
    expect(source).toMatch(/width:\s*["']390(?:px)?["']/);
    for (const control of ["title", "activity", "progress", "exitAccessibilityLabel", "motion"]) {
      expect(source).toMatch(new RegExp(`${control}\\s*:\\s*\\{[\\s\\S]*?control\\s*:`));
    }
    expect(source).toMatch(/onExit\s*:\s*\{\s*control:\s*false\s*\}/);
    expect(source).toMatch(/onExit\s*:\s*fn\(\)/);
    for (const story of ["Default", "Zero", "MinimumFill", "Complete", "ReducedMotion"]) {
      expect(source).toMatch(new RegExp(`export const ${story}\\b`));
    }
  });

  test("publishes ProgressHeader runtime, declaration, and CSS exports", async () => {
    const packageJson = await readJson<{
      exports: Record<string, unknown>;
      scripts: Record<string, string>;
    }>("package.json", packageRoot);
    expect(packageJson.exports["./progress-header"]).toEqual({
      types: "./dist/progress-header/index.d.ts",
      import: "./dist/progress-header/index.js",
      default: "./dist/progress-header/index.js",
    });
    expect(packageJson.exports["./progress-header.css"]).toBe(
      "./dist/progress-header/progress-header.css",
    );
    expect(packageJson.scripts.build).toMatch(/copy-styles\.mjs/);

    const styles = await readText("src/styles.css", packageRoot);
    expect(styles).toContain('@import "./progress-header/progress-header.css"');
  });

  test("pack checker validates the archived ProgressHeader package contract", async () => {
    const checker = await readText("scripts/check-pack.mjs", packageRoot);
    expect(checker).toMatch(/package\.json/);
    expect(checker).toMatch(/subpath:\s*["']progress-header["']/);
    expect(checker).toMatch(/component:\s*["']ProgressHeader["']/);
    expect(checker).toMatch(/css:\s*["']progress-header\.css["']/);
    expect(checker).toMatch(/packedPackageJson\.exports/);
  });
});
