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
      accessibilityLabel: "정보",
      icon: "not-a-supported-icon",
      variant: "brand",
      size: "l",
      disabled: false,
      loading: false,
      onTap: () => undefined,
      rawSvg: "<svg>must not cross the boundary</svg>",
    });

    expect(JSON.parse(JSON.stringify(data))).toEqual({
      accessibilityLabel: "정보",
      icon: "info-02",
      variant: "brand",
      size: "l",
      disabled: false,
      loading: false,
    });
    expect(data).not.toHaveProperty("onTap");
    expect(JSON.stringify(data)).not.toContain("<svg");
  });

  test("active round-button dispatches STORYBOOK_ACTION onTap once with its label", () => {
    const data = normalizeRoundButtonStoryArgs({ accessibilityLabel: "저장" });
    const calls: unknown[] = [];

    expect(dispatchRoundButtonStoryTap(data, (envelope) => calls.push(envelope))).toBe(true);
    expect(calls).toEqual([{ channel: "STORYBOOK_ACTION", name: "onTap", args: ["저장"] }]);
  });

  test.each([
    { disabled: true, loading: false },
    { disabled: false, loading: true },
    { disabled: true, loading: true },
  ])("loading/disabled round-button dispatches no action (%o)", (state) => {
    const data = normalizeRoundButtonStoryArgs({ accessibilityLabel: "삭제", ...state });
    const bridge = () => {
      throw new Error("bridge must not be called for an unavailable action");
    };

    expect(dispatchRoundButtonStoryTap(data, bridge)).toBe(false);
  });

  test.each(["button", "back-header", "status-indicator", "round-button"])(
    "%s story는 Rspeedy Lynx Web bundle을 갖는다",
    async (entry) => {
      const bundle = await readBinaryOutput(`dist/lynx/${entry}.web.bundle`);
      expect(bundle.byteLength).toBeGreaterThan(1_000);
      expect(bundle.subarray(0, 8).toString("ascii")).toBe("SDRAWROF");
    },
  );

  test("정적 Storybook shell과 세 컴포넌트 story index를 갖는다", async () => {
    expect(await readOutput("dist/storybook/index.html")).toContain("storybook-root");

    const index = await readOutput("dist/storybook/index.json");
    expect(index).toContain("components-button--default");
    expect(index).toContain("components-back-header--default");
    expect(index).toContain("components-status-indicator--completed");
    expect(index).toContain("components-round-button--default");
    expect(index).toContain("components-round-button--brand");
    expect(index).toContain("components-round-button--loading");
    expect(index).toContain("components-round-button--disabled");
  });

  test("round-button은 serializable Controls와 공개 subpath 경계를 사용한다", async () => {
    const config = await readOutput("lynx.config.ts");
    const story = await readOutput("src/RoundButton.stories.ts");
    const entry = await readOutput("src/lynx/round-button.tsx");

    expect(config).toContain('"round-button": "./src/lynx/round-button.tsx"');
    expect(story).toContain('title: "Components/Round Button"');
    expect(story).toContain("RoundButtonStoryArgs");
    expect(story).toContain("onTap");
    expect(story).toContain('"info-02"');
    expect(entry).toContain('from "@libitums/ui-lynx/round-button"');
    expect(entry).toContain("useInitData");
    expect(entry).not.toMatch(/<RoundButton\s[^>]*\bonTap\s*=/);
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
    expect(typecheckTsconfig.compilerOptions.paths?.["@libitums/ui-lynx"]).toEqual([
      "../../packages/ui-lynx/src/index.tsx",
    ]);
    expect(typecheckTsconfig.compilerOptions.paths?.["@libitums/ui-lynx/round-button"]).toEqual([
      "../../packages/ui-lynx/src/round-button.tsx",
    ]);
    expect(packageJson.scripts.build).toMatch(/^pnpm --filter @libitums\/ui-lynx build &&/);
    expect(packageJson.scripts.storybook).toMatch(/^pnpm --filter @libitums\/ui-lynx build &&/);
  });
});
