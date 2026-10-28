import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { CatalogMapSections } from "./CatalogMapSections";
import type { CatalogGate, CatalogReadySection } from "./catalog-map.contract";

// `ui` 계층: 끝낸 에피소드에 업데이트로 생긴 유닛의 NEW 태그 — 판정은 unit(UF1)이 지므로 렌더가 그 결과를 내는지만
// 봅니다(태그 · 낭독 꼬리, 레슨 · 이야기 노드 모두).

function ready(episodeId: string, ordinal: number): CatalogReadySection {
  return {
    kind: "catalog-ready",
    episodeId,
    ordinal,
    title: episodeId,
    lessonKeys: ["S1", "S2", "CULT"],
    finalKey: "RP",
    completionKeys: ["RP"],
    cultureKeys: ["CULT"],
  };
}

afterEach(() => {
  cleanup();
});

function mount(progress: CatalogGate["progress"]) {
  render(
    <CatalogMapSections
      sections={[ready("u01", 1), ready("u02", 2)]}
      gate={{ legacyTutorialPassed: true, progress } as unknown as CatalogGate}
      onStartCover={vi.fn<(episodeId: string) => void>()}
      onSelectUnit={vi.fn<(episodeId: string, unitKey: string, tapY: number) => void>()}
    />,
  );
}
const tag = (episodeId: string, key: string) =>
  screen.queryByTestId(`catalog-fresh-tag-${episodeId}-${key}`);

test("UFU1. 완료한 에피소드의 안 끝낸 유닛에만 NEW 태그가 서고, 낭독 끝에 「new」가 붙는다", () => {
  mount({ u01: ["intro", "S1", "RP"], u02: ["intro", "S1"] });
  expect(tag("u01", "S2")?.textContent).toBe("NEW");
  expect(tag("u01", "CULT")?.textContent).toBe("NEW");
  expect(tag("u01", "S1")).toBeNull();
  expect(tag("u02", "S2")).toBeNull();
  const label = screen
    .getByTestId("ui-lynx-learning-unit-catalog-unit-u01-S2")
    .getAttribute("accessibility-label");
  expect(label?.endsWith(", new")).toBe(true);
});
