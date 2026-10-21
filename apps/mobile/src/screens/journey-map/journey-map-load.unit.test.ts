import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test, vi } from "vitest";

import { uiCopyEn } from "../../lib/ui-copy-en";
import {
  canSelectMapNode,
  knownProgressLoad,
  mapNodeStatusUnder,
  nodeAccessOf,
  progressLoadRowAnnouncementFor,
} from "./journey-map-load";
import type { JourneyMapNodeAccess, JourneyMapProgressLoad } from "./journey-map-load.contract";
import type { JourneyMapItemStatus, JourneyMapNodeStatus } from "./journey-map-types";

// `unit` 계층: 노드를 「확인 중」으로 덮는 순수 함수와 낭독 규칙, 그리고 소스 검사.

describe("ML1' nodeAccessOf", () => {
  const loads: readonly (readonly [string, JourneyMapProgressLoad, JourneyMapNodeAccess])[] = [
    ["known", { status: "known" }, "open"],
    ["checking", { status: "checking" }, "checking"],
    ["loading", { status: "loading" }, "checking"],
    ["retrying", { status: "retrying" }, "open"],
    ["failed", { status: "failed", onRetry: vi.fn<() => void>() }, "open"],
  ];

  test.each(loads)("ML1'. %s -> %s", (_name, load, access) => {
    expect(nodeAccessOf(load)).toBe(access);
  });
});

describe("ML2 mapNodeStatusUnder", () => {
  const statuses: readonly JourneyMapItemStatus[] = ["locked", "available", "completed"];

  test.each(statuses)("ML2. open이면 %s 그대로다", (status) => {
    expect(mapNodeStatusUnder("open", status)).toBe(status);
  });

  test.each(statuses)("ML2. checking이면 %s가 checking으로 덮인다", (status) => {
    expect(mapNodeStatusUnder("checking", status)).toBe("checking");
  });
});

describe("ML4 canSelectMapNode", () => {
  test.each([
    ["locked", false],
    ["available", true],
    ["completed", true],
    ["checking", false],
  ] as const satisfies readonly (readonly [JourneyMapNodeStatus, boolean])[])(
    "ML4. %s -> %s",
    (status, expected) => {
      expect(canSelectMapNode(status)).toBe(expected);
    },
  );
});

describe("ML5 progressLoadRowAnnouncementFor", () => {
  const copy = uiCopyEn.progressLoad;

  test.each([
    [null, "loading", copy.loadingAnnouncement],
    [null, "failed", copy.failed],
    ["loading", "failed", copy.failed],
    ["failed", "loading", copy.loadingAnnouncement],
    ["loading", "loading", null],
    ["failed", "failed", null],
  ] as const)("ML5. (%s -> %s) 낭독", (previous, next, expected) => {
    expect(progressLoadRowAnnouncementFor(previous, next, copy)).toBe(expected);
  });

  test("ML5. 로딩 낭독은 말줄임표가 없는 문구다", () => {
    expect(copy.loadingAnnouncement).not.toContain("…");
    expect(copy.loadingAnnouncement.length).toBeGreaterThan(0);
  });
});

describe("ML6 knownProgressLoad", () => {
  test("ML6. known 하나이고 두 번 읽어도 같은 참조다", () => {
    expect(knownProgressLoad).toEqual({ status: "known" });
    expect(knownProgressLoad).toBe(knownProgressLoad);
  });
});

// 소스 검사 — 코드 모양으로만 지킬 수 있는 약속입니다.
const dir = __dirname;
const read = (path: string): string => readFileSync(path, "utf8");
const lineCount = (source: string): number => source.trimEnd().split("\n").length;

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("SC1 노드의 잠금 가드", () => {
  // 스페셜 항목의 잠금 가드는 공유 항목 `SpecialUnitMapItem` 한 곳이 집니다. 어댑터는 그것에 위임하고,
  // 카탈로그 레슨 노드는 `LearningUnit` 쪽 가드를 스스로 집니다.
  const adapters = ["CatalogCoverMapItem", "CatalogUnitNode"];
  const guards = ["SpecialUnitMapItem", "CatalogUnitNode"];

  test.each([...adapters, "SpecialUnitMapItem"])('SC1. %s — `!== "locked"` 0건', (name) => {
    expect(withoutComments(read(join(dir, `${name}.tsx`)))).not.toMatch(/!==\s*["']locked["']/);
  });

  test.each(guards)("SC1. %s — canSelectMapNode( 1건 이상", (name) => {
    const source = withoutComments(read(join(dir, `${name}.tsx`)));
    expect([...source.matchAll(/canSelectMapNode\(/g)].length).toBeGreaterThanOrEqual(1);
  });

  test.each(adapters)("SC1. %s — SpecialUnitMapItem에 위임한다", (name) => {
    expect(withoutComments(read(join(dir, `${name}.tsx`)))).toMatch(/<SpecialUnitMapItem\b/);
  });
});

describe("SC3 화면 쪽 새 파일", () => {
  const screenFiles = [
    ...readdirSync(dir).filter(
      (name) => /^journey-map-load.*\.ts$/.test(name) && !name.includes(".test."),
    ),
    "JourneyProgressLoadRow.tsx",
    "FirstUnitMapTooltip.tsx",
  ];

  const limitedFiles = [
    "../../app/AppSession.tsx",
    "JourneyMapScreen.tsx",
    "../../app/render-screen.tsx",
    "../../app/screen-wiring.ts",
  ];

  test("SC3. 새 화면 파일 목록이 비어 있지 않다", () => {
    expect(screenFiles.length).toBeGreaterThanOrEqual(4);
  });

  test.each(screenFiles)(
    "SC3. %s — 한글 문자열 리터럴 · .agent-harness 없음, 300줄 이하",
    (name) => {
      const raw = read(join(dir, name));
      expect(raw).not.toContain(".agent-harness");
      expect(withoutComments(raw)).not.toMatch(/(["'`])(?:(?!\1)[^\\\n]|\\.)*[가-힣]/);
      expect(lineCount(raw)).toBeLessThanOrEqual(300);
    },
  );

  test.each(limitedFiles)("SC3. %s — 300줄 이하", (name) => {
    expect(lineCount(read(join(dir, name)))).toBeLessThanOrEqual(300);
  });
});
