import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { CatalogMapSection } from "./catalog-map.contract";
import {
  catalogProps,
  catalogReadySections,
  mapScreen,
  tutorialAllDone,
} from "./JourneyMapScreen.test-support";

// `ui` 계층: 카탈로그 유닛의 말풍선 — 열린 노드를 누르면 튜토리얼 스텝과 같은 말풍선이 서고 그동안 에피소드 띠가
// 섭니다. 세션은 말풍선의 `Start`가 엽니다. 잠긴 노드는 말풍선이 없습니다.

afterEach(() => {
  cleanup();
});

const coverDone = { "u01-water": ["intro"] };
const tapUnit = (key: string) => {
  act(() => {
    // 최종(RP)만 스페셜 배지이고 레슨 · 문화는 원형 노드입니다.
    const prefix = key === "RP" ? "ui-lynx-special-unit" : "ui-lynx-learning-unit";
    fireEvent.tap(screen.getByTestId(`${prefix}-catalog-unit-u01-water-${key}`), {
      detail: { y: 300 },
    });
  });
};
const sheetTitle = () => screen.getByTestId("step-sheet-title");
const band = () => screen.queryByTestId("ui-lynx-episode-header");

test("CS1. 열린 레슨을 누르면 말풍선과 띠가 서고, 세션은 아직 열리지 않는다", () => {
  const catalog = catalogProps({ progress: coverDone });
  render(mapScreen({ progress: tutorialAllDone, catalog }));

  tapUnit("S1");

  expect(sheetTitle()).toHaveTextContent("Lesson 1: “Alley”");
  expect(screen.getByTestId("ui-lynx-episode-header-label")).toHaveTextContent(
    "Episode 1, unit 01",
  );
  expect(screen.getByTestId("ui-lynx-episode-header-title")).toHaveTextContent("Alley");
  expect(catalog.onStartUnit).not.toHaveBeenCalled();
});

test("CS2. Start가 그 에피소드 · 유닛으로 세션을 연다", () => {
  const catalog = catalogProps({ progress: coverDone });
  render(mapScreen({ progress: tutorialAllDone, catalog }));

  tapUnit("S1");
  act(() => {
    fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
  });

  expect(catalog.onStartUnit).toHaveBeenCalledTimes(1);
  expect(catalog.onStartUnit).toHaveBeenCalledWith("u01-water", "S1");
});

test("CS3. 말풍선을 닫으면 띠도 사라지고, 잠긴 노드는 말풍선을 열지 않는다", () => {
  render(mapScreen({ progress: tutorialAllDone, catalog: catalogProps({ progress: coverDone }) }));

  tapUnit("S1");
  act(() => {
    fireEvent.tap(screen.getByTestId("step-sheet-close"), {});
  });
  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(band()).not.toBeInTheDocument();

  tapUnit("S3");
  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(band()).not.toBeInTheDocument();
});

test("CS4. 진행 줄은 문항 수 기준 — 끝낸 유닛은 전부, 셀 수 없으면 줄이 없다", () => {
  const counted = {
    ...catalogProps({ progress: { "u01-water": ["intro", "S1"] } }),
    unitItemCountOf: vi.fn((_episodeId: string, _unitKey: string) => 16),
  };
  render(mapScreen({ progress: tutorialAllDone, catalog: counted }));

  tapUnit("S1");
  expect(screen.getByTestId("step-sheet-progress-count")).toHaveTextContent("16/16");
  expect(screen.getByTestId("step-sheet-progress-percent")).toHaveTextContent("100%");
  tapUnit("S3");
  expect(screen.getByTestId("step-sheet-progress-count")).toHaveTextContent("0/16");
  cleanup();

  render(mapScreen({ progress: tutorialAllDone, catalog: catalogProps({ progress: coverDone }) }));
  tapUnit("S1");
  expect(screen.queryByTestId("step-sheet-progress")).not.toBeInTheDocument();
  expect(screen.getByTestId("step-sheet-start")).toBeInTheDocument();
});

test("CS5. 영어 제목이 있으면 그것을 쓰고, 최종 노드는 Final test 이름이며 띠 번호는 표지부터 센다", () => {
  const [first, ...rest] = catalogReadySections;
  const sections: readonly CatalogMapSection[] = [
    { ...(first as Extract<CatalogMapSection, { kind: "catalog-ready" }>), titleEn: "Buying" },
    ...rest,
  ];
  const allLessons = { "u01-water": ["intro", "S1", "S3", "S4", "S5", "S6", "S7", "S8", "S9"] };
  render(
    mapScreen({
      progress: tutorialAllDone,
      catalog: catalogProps({ sections, progress: allLessons }),
    }),
  );

  tapUnit("RP");

  expect(sheetTitle()).toHaveTextContent("Final test: “Buying”");
  expect(screen.getByTestId("ui-lynx-episode-header-label")).toHaveTextContent(
    "Episode 1, unit 09",
  );
  expect(screen.getByTestId("ui-lynx-episode-header-title")).toHaveTextContent("Buying");
});
