import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { CatalogMapSections } from "./CatalogMapSections";
import type { CatalogGate, CatalogMapSection } from "./catalog-map.contract";

// `ui` 계층: 카탈로그 맨 끝 「다음 에피소드 준비 중」 구획(시안 C1) — 마지막 구획이 열린 에피소드일 때만 그다음
// 번호로 서고, 구획 전체가 낭독 요소 하나이며 누를 수 없습니다.

afterEach(() => {
  cleanup();
});

const ready = (episodeId: string, ordinal: number): CatalogMapSection => ({
  kind: "catalog-ready",
  episodeId,
  ordinal,
  title: episodeId,
  lessonKeys: ["S1", "S2"],
  finalKey: "RP",
  completionKeys: ["RP"],
  cultureKeys: [],
});
const gate = {
  legacyTutorialPassed: true,
  progress: {},
} as unknown as CatalogGate;

function mount(sections: readonly CatalogMapSection[]) {
  const onStartCover = vi.fn<(episodeId: string) => void>();
  const onSelectUnit = vi.fn<(episodeId: string, unitKey: string, tapY: number) => void>();
  render(
    <CatalogMapSections
      sections={sections}
      gate={gate}
      onStartCover={onStartCover}
      onSelectUnit={onSelectUnit}
    />,
  );
  return { onStartCover, onSelectUnit };
}

describe("CatalogComingSoonSection", () => {
  test("CSU1. 마지막이 열린 에피소드면 그다음 번호의 준비 중 구획이 맨 끝에 서고 한 요소로 읽힌다", () => {
    mount([ready("u01", 1), ready("u02", 2), ready("u03", 3)]);

    const section = screen.getByTestId("catalog-coming-soon");
    expect(screen.getByTestId("catalog-coming-soon-label")).toHaveTextContent("Episode 4.");
    expect(screen.getByTestId("catalog-coming-soon-title")).toHaveTextContent("Coming soon");
    expect(screen.getByTestId("catalog-coming-soon-body")).toHaveTextContent(
      "We're preparing the next story.",
    );
    expect(section).toHaveAttribute("accessibility-element", "true");
    expect(section).toHaveAttribute(
      "accessibility-label",
      "Episode 4. Coming soon. We're preparing the next story.",
    );
    expect(section).not.toHaveAttribute("accessibility-traits", "button");
    const root = screen.getByTestId("journey-map-screen-catalog");
    expect(root.lastElementChild).toBe(section);
  });

  test("CSU2. 마지막이 준비 중이거나 구획이 없으면 서지 않는다", () => {
    mount([
      ready("u01", 1),
      {
        kind: "catalog-unavailable",
        episodeId: "u02",
        ordinal: 2,
        title: "u02",
        reason: "pending",
      },
    ]);
    expect(screen.queryByTestId("catalog-coming-soon")).not.toBeInTheDocument();
    cleanup();

    mount([]);
    expect(screen.queryByTestId("catalog-coming-soon")).not.toBeInTheDocument();
  });

  test("CSU3. 눌러도 아무것도 시작하지 않는다", () => {
    const { onStartCover, onSelectUnit } = mount([ready("u01", 1)]);

    fireEvent.tap(screen.getByTestId("catalog-coming-soon"), {});
    expect(screen.getByTestId("catalog-coming-soon-label")).toHaveTextContent("Episode 2.");
    expect(onStartCover).not.toHaveBeenCalled();
    expect(onSelectUnit).not.toHaveBeenCalled();
  });
});
