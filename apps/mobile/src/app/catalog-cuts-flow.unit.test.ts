import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { catalogMapSectionsOf } from "../screens/journey-map/catalog-map";
import { catalogTitleLines } from "../screens/journey-map/catalog-title";
import { CATALOG_INTRO_TITLE_MAX_CHARS, nextCatalogCutsFlowStep } from "./catalog-cuts-flow";
import type { CatalogCutsFlowEvent, CatalogCutsFlowStep } from "./catalog-cuts-flow";

// `unit` 계층: 컷 route 하나 안의 걸음 전이 표와 표지 둘째 줄의 줄 나눔만 봅니다.

const steps: readonly CatalogCutsFlowStep[] = ["intro", "cuts", "banner", "left"];
const events: readonly CatalogCutsFlowEvent[] = [
  "continue",
  "skip",
  "exit",
  "cuts-done",
  "banner-done",
];

const table: readonly (readonly [CatalogCutsFlowStep, CatalogCutsFlowEvent])[] = [
  ["intro", "continue"],
  ["intro", "skip"],
  ["intro", "exit"],
  ["cuts", "cuts-done"],
  ["cuts", "exit"],
  ["banner", "banner-done"],
];

describe("nextCatalogCutsFlowStep", () => {
  test("CF1. 표지: continue는 컷으로, skip과 exit는 끝으로 간다", () => {
    expect(nextCatalogCutsFlowStep("intro", "continue")).toBe("cuts");
    expect(nextCatalogCutsFlowStep("intro", "skip")).toBe("left");
    expect(nextCatalogCutsFlowStep("intro", "exit")).toBe("left");
  });

  test("CF2. 컷: cuts-done은 배너로, exit는 배너 없이 끝으로 간다", () => {
    expect(nextCatalogCutsFlowStep("cuts", "cuts-done")).toBe("banner");
    expect(nextCatalogCutsFlowStep("cuts", "exit")).toBe("left");
  });

  test("CF3. 배너: banner-done은 끝으로 간다", () => {
    expect(nextCatalogCutsFlowStep("banner", "banner-done")).toBe("left");
  });

  const outside = steps.flatMap((step) =>
    events
      .filter((event) => !table.some(([s, e]) => s === step && e === event))
      .map((event) => [step, event] as const),
  );

  test("CF4. 표 밖의 짝은 열네 개다", () => {
    expect(outside).toHaveLength(14);
  });

  test.each(outside)("CF4. 표 밖의 짝 %s + %s 는 받은 걸음 그대로다", (step, event) => {
    expect(nextCatalogCutsFlowStep(step, event)).toBe(step);
  });

  test("CF5. 걸음의 길은 끝까지 가고 같은 사건을 두 번 넣어도 같다", () => {
    const run = (path: readonly CatalogCutsFlowEvent[]): CatalogCutsFlowStep =>
      path.reduce<CatalogCutsFlowStep>(
        (step, event) => nextCatalogCutsFlowStep(step, event),
        "intro",
      );

    expect(run(["continue", "cuts-done", "banner-done"])).toBe("left");
    expect(
      run(["continue", "continue", "cuts-done", "cuts-done", "banner-done", "banner-done"]),
    ).toBe("left");
    for (const event of events) expect(nextCatalogCutsFlowStep("left", event)).toBe("left");
  });
});

describe("표지 둘째 줄의 줄 나눔", () => {
  const sections = catalogMapSectionsOf(
    buildEpisodeCatalog({ bundled: bundledCatalogInput, cache: { manifest: null, episodes: {} } }),
  );

  test("CF6. 상한은 양의 정수다", () => {
    expect(Number.isInteger(CATALOG_INTRO_TITLE_MAX_CHARS)).toBe(true);
    expect(CATALOG_INTRO_TITLE_MAX_CHARS).toBeGreaterThan(0);
  });

  test("CF6. 실데이터 세 이름은 띄어쓰기에서만 끊겨 이으면 원래 제목이 된다", () => {
    expect(sections.length).toBeGreaterThanOrEqual(3);
    for (const section of sections) {
      const { lines } = catalogTitleLines(section.title, CATALOG_INTRO_TITLE_MAX_CHARS);
      expect(lines.length).toBeGreaterThanOrEqual(1);
      expect(lines.length).toBeLessThanOrEqual(2);
      expect(lines.join(" ")).toBe(section.title);
    }
  });

  // 실데이터 제목은 2026-10-16부터 모두 짧다 — 긴 이름은 옛 제목으로 고정한다.
  test("CF6. 상한을 넘는 긴 이름은 두 줄로 나뉜다", () => {
    const { lines } = catalogTitleLines(
      "익선 게스트하우스 여성 도미토리",
      CATALOG_INTRO_TITLE_MAX_CHARS,
    );
    expect(lines).toHaveLength(2);
  });
});
