import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";
import { dispatchRoundButtonStoryTap, normalizeRoundButtonStoryArgs } from "./round-button-story";

const appRoot = path.resolve(import.meta.dirname, "..");

async function readOutput(relativePath: string): Promise<string> {
  return readFile(path.join(appRoot, relativePath), "utf8");
}

async function readBinaryOutput(relativePath: string): Promise<Buffer> {
  return readFile(path.join(appRoot, relativePath));
}

describe("Storybook Lynx build outputs", () => {
  test("round-button init data is JSON-roundtrip cloneable and contains no callback or raw SVG", () => {
    const data = normalizeRoundButtonStoryArgs({
      accessibilityLabel: "저장",
      variant: "brand",
      onTap: () => undefined,
      rawSvg: "<svg>",
    });
    expect(JSON.parse(JSON.stringify(data))).toEqual({
      accessibilityLabel: "저장",
      icon: "info-02",
      variant: "brand",
      size: "m",
      disabled: false,
      loading: false,
    });
    expect(data).not.toHaveProperty("onTap");
    expect(JSON.stringify(data)).not.toContain("<svg");
  });
  test("active round-button dispatches STORYBOOK_ACTION onTap once with its label", () => {
    const calls: unknown[] = [];
    const data = normalizeRoundButtonStoryArgs({ accessibilityLabel: "저장" });
    expect(dispatchRoundButtonStoryTap(data, (envelope) => calls.push(envelope))).toBe(true);
    expect(calls).toEqual([{ channel: "STORYBOOK_ACTION", name: "onTap", args: ["저장"] }]);
  });
  test.each([
    "button",
    "back-header",
    "status-indicator",
    "round-button",
    "progress-header",
    "page-indicator",
  ])("%s story는 Rspeedy Lynx Web bundle을 갖는다", async (entry) => {
    const bundle = await readBinaryOutput(`dist/lynx/${entry}.web.bundle`);
    expect(bundle.byteLength).toBeGreaterThan(1_000);
    expect(bundle.subarray(0, 8).toString("ascii")).toBe("SDRAWROF");
  });

  test("정적 Storybook shell과 컴포넌트 story index를 갖는다", async () => {
    expect(await readOutput("dist/storybook/index.html")).toContain("storybook-root");

    const index = await readOutput("dist/storybook/index.json");
    expect(index).toContain("components-button--default");
    expect(index).toContain("components-back-header--default");
    expect(index).toContain("components-status-indicator--completed");
    expect(index).toContain("components-round-button--default");
    expect(index).toContain("components-round-button--brand");
    expect(index).toContain("components-round-button--loading");
    expect(index).toContain("components-round-button--disabled");
    expect(index).toContain("components-progress-header--default");
    expect(index).toContain("components-page-indicator--default");
  });

  test("runtime은 공개 dist export를 소비하고 source mapping은 typecheck에만 격리한다", async () => {
    const baseTsconfig = JSON.parse(await readOutput("tsconfig.json")) as {
      compilerOptions: { paths?: Record<string, string[]> };
    };
    const typecheckTsconfig = JSON.parse(await readOutput("tsconfig.typecheck.json")) as {
      compilerOptions: { paths?: Record<string, string[]> };
    };
    const packageJson = JSON.parse(await readOutput("package.json")) as {
      scripts: { build: string; storybook: string };
    };

    expect(baseTsconfig.compilerOptions.paths).toBeUndefined();
    expect(typecheckTsconfig.compilerOptions.paths).toMatchObject({
      "@libitums/ui-lynx": ["../../packages/ui-lynx/src/index.ts"],
      "@libitums/ui-lynx/button": ["../../packages/ui-lynx/src/button/index.ts"],
      "@libitums/ui-lynx/back-header": ["../../packages/ui-lynx/src/back-header/index.ts"],
      "@libitums/ui-lynx/status-indicator": [
        "../../packages/ui-lynx/src/status-indicator/index.ts",
      ],
      "@libitums/ui-lynx/round-button": ["../../packages/ui-lynx/src/round-button/index.ts"],
      "@libitums/ui-lynx/progress-header": ["../../packages/ui-lynx/src/progress-header/index.ts"],
      "@libitums/ui-lynx/page-indicator": ["../../packages/ui-lynx/src/page-indicator/index.ts"],
    });
    expect(packageJson.scripts.build).toMatch(/^pnpm --filter @libitums\/ui-lynx build &&/);
    expect(packageJson.scripts.storybook).toMatch(/^pnpm --filter @libitums\/ui-lynx build &&/);
  });

  test.each([
    ["button", "@libitums/ui-lynx/button"],
    ["back-header", "@libitums/ui-lynx/back-header"],
    ["status-indicator", "@libitums/ui-lynx/status-indicator"],
    ["round-button", "@libitums/ui-lynx/round-button"],
    ["progress-header", "@libitums/ui-lynx/progress-header"],
    ["page-indicator", "@libitums/ui-lynx/page-indicator"],
  ])("%s runtime entry consumes its public subpath export", async (entry, subpath) => {
    const runtime = await readOutput(`src/lynx/${entry}.tsx`);
    expect(runtime).toContain(`from "${subpath}"`);
  });
});
