import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { CatalogMapSections } from "./CatalogMapSections";
import type { CatalogGate, CatalogReadySection } from "./catalog-map.contract";
import type { JourneyMapNodeAccess } from "./journey-map-load.contract";

// `ui` 계층: 카탈로그 구획이 access를 받아 「확인 중」으로 서는지 봅니다. 사슬 파생과 덮기 규칙은 unit이
// 지므로 렌더 결과(data-status · 낭독 이름 · 콜백)만 봅니다.

const lessonKeys = ["S1", "S3", "S4"];
const section: CatalogReadySection = {
  kind: "catalog-ready",
  episodeId: "u01-water",
  ordinal: 1,
  title: "Water",
  lessonKeys,
  finalKey: "RP",
  completionKeys: ["RP"],
  cultureKeys: [],
};
const gate: CatalogGate = { tutorialPassed: true, progress: { "u01-water": ["intro", "S1"] } };

const coverId = "ui-lynx-special-unit-catalog-cover-u01-water";
// 최종(`RP`)은 `SpecialUnit`, 레슨은 `LearningUnit`이 그립니다.
const nodeId = (key: string) =>
  `ui-lynx-${key === "RP" ? "special" : "learning"}-unit-catalog-unit-u01-water-${key}`;
const unitKeys = [...lessonKeys, "RP"];

function mount(access?: JourneyMapNodeAccess) {
  const onStartCover = vi.fn<(episodeId: string) => void>();
  const onStartUnit = vi.fn<(episodeId: string, unitKey: string, tapY: number) => void>();
  render(
    <CatalogMapSections
      sections={[section]}
      gate={gate}
      {...(access === undefined ? {} : { access })}
      onStartCover={onStartCover}
      onSelectUnit={onStartUnit}
    />,
  );
  return { onStartCover, onStartUnit };
}

const statusOf = (testId: string) => screen.getByTestId(testId).getAttribute("data-status");

describe("CatalogMapSections access", () => {
  test("MN-C1. checking이면 표지 · 레슨 · 최종이 전부 checking이고 탭에 콜백이 없다", () => {
    const { onStartCover, onStartUnit } = mount("checking");

    for (const id of [coverId, ...unitKeys.map(nodeId)]) {
      expect(statusOf(id)).toBe("checking");
      fireEvent.tap(screen.getByTestId(id), {});
    }

    expect(onStartCover).not.toHaveBeenCalled();
    expect(onStartUnit).not.toHaveBeenCalled();
  });

  test("MN-C2. access를 생략하면 지금과 같은 상태로 선다", () => {
    mount();

    expect(statusOf(coverId)).toBe("clear");
    expect(statusOf(nodeId("S1"))).toBe("clear");
    expect(statusOf(nodeId("S3"))).toBe("available");
    expect(statusOf(nodeId("S4"))).toBe("default");
    expect(statusOf(nodeId("RP"))).toBe("default");
  });

  test("MN-C2. access가 open이어도 생략과 같다", () => {
    mount("open");

    expect(statusOf(nodeId("S3"))).toBe("available");
    expect(statusOf(nodeId("S4"))).toBe("default");
  });

  test("MN-C3. checking의 낭독 이름은 노드 이름 뒤에 loading이 붙는다", () => {
    mount("checking");

    expect(screen.getByTestId(nodeId("S1"))).toHaveAttribute(
      "accessibility-label",
      "Episode 1. Lesson 1, loading",
    );
    expect(screen.getByTestId(nodeId("RP"))).toHaveAttribute(
      "accessibility-label",
      "special, Episode 1. Final test, loading",
    );
    expect(screen.getByTestId(coverId).getAttribute("accessibility-label")).toContain(", loading");
  });
});
