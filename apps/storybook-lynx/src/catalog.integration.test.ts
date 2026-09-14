import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";
import {
  dispatchBottomNavigatorStorySelect,
  normalizeBottomNavigatorStoryArgs,
} from "./bottom-navigator-story";
import { dispatchRoundButtonStoryTap, normalizeRoundButtonStoryArgs } from "./round-button-story";

const appRoot = path.resolve(import.meta.dirname, "..");

async function readOutput(relativePath: string): Promise<string> {
  return readFile(path.join(appRoot, relativePath), "utf8");
}

async function readBinaryOutput(relativePath: string): Promise<Buffer> {
  return readFile(path.join(appRoot, relativePath));
}

async function outputExists(relativePath: string): Promise<boolean> {
  try {
    await access(path.join(appRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

describe("Storybook Lynx build outputs", () => {
  test("bottom-navigator init data is JSON-only and normalizes every preset", () => {
    const data = normalizeBottomNavigatorStoryArgs({
      preset: "all-items",
      selectedId: "roleplay",
      disabledLast: true,
      viewportWidth: 320,
      onSelect: () => undefined,
      rawSvg: "<svg>",
    });
    expect(JSON.parse(JSON.stringify(data))).toEqual({
      preset: "all-items",
      selectedId: "roleplay",
      disabledLast: true,
      viewportWidth: 320,
      items: [
        { id: "home", accessibilityLabel: "홈", icon: "house", availability: "enabled" },
        {
          id: "journey",
          accessibilityLabel: "여정",
          icon: "map",
          availability: "enabled",
          badge: { kind: "dot", accessibilityLabel: "새 소식 있음" },
        },
        {
          id: "roleplay",
          accessibilityLabel: "롤플레이",
          icon: "user-group",
          availability: "enabled",
          badge: { kind: "count", count: 108 },
        },
        { id: "settings", accessibilityLabel: "설정", icon: "settings", availability: "enabled" },
        {
          id: "notifications",
          accessibilityLabel: "알림",
          icon: "notification",
          availability: "disabled",
          disabledReason: "로그인 후 사용 가능",
        },
      ],
    });
    expect(data).not.toHaveProperty("onSelect");
    expect(JSON.stringify(data)).not.toContain("<svg");
  });

  test("bottom-navigator bridge dispatches enabled selection once and blocks disabled", () => {
    const calls: unknown[] = [];
    const data = normalizeBottomNavigatorStoryArgs({ preset: "all-items", disabledLast: true });
    expect(dispatchBottomNavigatorStorySelect(data, "journey", (value) => calls.push(value))).toBe(
      true,
    );
    expect(
      dispatchBottomNavigatorStorySelect(data, "notifications", (value) => calls.push(value)),
    ).toBe(false);
    expect(calls).toEqual([{ channel: "STORYBOOK_ACTION", name: "onSelect", args: ["journey"] }]);
  });

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
    "bottom-navigator",
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
    expect(index).toContain("components-bottom-navigator--default");
    expect(index).toContain("components-bottom-navigator--long-accessibility-label");
    expect(index).toContain("components-bottom-navigator--all-items");
    expect(index).toContain("components-bottom-navigator--disabled");
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
      "@libitums/ui-lynx/bottom-navigator": [
        "../../packages/ui-lynx/src/bottom-navigator/index.ts",
      ],
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
    ["bottom-navigator", "@libitums/ui-lynx/bottom-navigator"],
  ])("%s runtime entry consumes its public subpath export", async (entry, subpath) => {
    const runtime = await readOutput(`src/lynx/${entry}.tsx`);
    expect(runtime).toContain(`from "${subpath}"`);
  });
  test("catalog index에는 PageIndicator의 대표 story들이 등록된다", async () => {
    const index = await readOutput("dist/storybook/index.json");
    for (const storyId of ["default", "first", "last", "single", "empty"]) {
      expect(index).toContain(`components-page-indicator--${storyId}`);
    }
  });

  test("bottom-navigator runtime은 enabled tap 뒤 controlled selection을 갱신한다", async () => {
    const runtime = await readOutput("src/lynx/bottom-navigator.tsx");

    expect(runtime).toContain("useState(data.selectedId)");
    expect(runtime).toContain("setSelectedId(id)");
    expect(runtime).toContain("selectedId={selectedId}");
  });

  test("PageIndicator story args와 controls는 직렬화 가능한 숫자 계약을 유지한다", async () => {
    expect(await outputExists("src/PageIndicator.stories.ts")).toBe(true);
    const story = await readOutput("src/PageIndicator.stories.ts");
    expect(story).toMatch(/pageCount:\s*\d+/);
    expect(story).toMatch(/currentPage:\s*\d+/);
    expect(story).toMatch(
      /pageCount:\s*\{\s*control:\s*\{\s*type:\s*["']number["'][^}]*max:\s*100/,
    );
    expect(story).toMatch(
      /currentPage:\s*\{\s*control:\s*\{\s*type:\s*["']number["'][^}]*max:\s*100/,
    );
  });

  test("Rspeedy entry와 package 산출물은 최신 컴포넌트 구조와 docs를 노출한다", async () => {
    const config = await readOutput("lynx.config.ts");
    expect(config).toMatch(
      /["']?page-indicator["']?\s*:\s*["']\.\/src\/lynx\/page-indicator\.tsx["']/,
    );

    const packageJson = JSON.parse(
      await readFile(path.resolve(appRoot, "../../packages/ui-lynx/package.json"), "utf8"),
    ) as {
      exports: Record<string, { types?: string; import?: string; default?: string }>;
    };
    expect(packageJson.exports["./page-indicator"]).toEqual({
      types: "./dist/page-indicator/index.d.ts",
      import: "./dist/page-indicator/index.js",
      default: "./dist/page-indicator/index.js",
    });
    expect(await outputExists("../../packages/ui-lynx/dist/styles.css")).toBe(true);
    expect(await outputExists("../../packages/ui-lynx/dist/page-indicator/PageIndicator.jsx")).toBe(
      true,
    );
    expect(
      await outputExists("../../packages/ui-lynx/dist/page-indicator/page-indicator.css"),
    ).toBe(true);

    const packVerifier = await readFile(
      path.resolve(appRoot, "../../packages/ui-lynx/scripts/check-pack.mjs"),
      "utf8",
    );
    expect(packVerifier).toContain("package/dist/index.js");
    expect(packVerifier).toContain("package/dist/index.d.ts");
    expect(packVerifier).toContain("package/dist/styles.css");
    expect(packVerifier).toContain("package/docs/component-file-conventions.md");
    expect(packVerifier).toContain('subpath: "progress-header"');
    expect(packVerifier).toContain('directory: "progress-header"');
    expect(packVerifier).toContain('component: "ProgressHeader"');
    expect(packVerifier).toContain('modules: ["contract"]');
    expect(packVerifier).toContain('subpath: "page-indicator"');
    expect(packVerifier).toContain('directory: "page-indicator"');
    expect(packVerifier).toContain('component: "PageIndicator"');
    expect(packVerifier).toContain('modules: ["page-indicator.contract"]');
    expect(packVerifier).toContain('css: "page-indicator.css"');
    expect(packVerifier).toContain("package/dist/${directory}/index.js");
    expect(packVerifier).toContain("package/dist/${directory}/${component}.jsx");
    expect(packVerifier).toContain("package/dist/${directory}/${module}.js");
    expect(packVerifier).toContain("package/dist/${directory}/${css}");
    expect(packVerifier).toContain("authored ReactLynx JSX");
  });
});
