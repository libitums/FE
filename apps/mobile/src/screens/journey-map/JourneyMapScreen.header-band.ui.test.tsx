import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { JourneyMapProgressLoad } from "./journey-map-load.contract";
import { u00Catalog, u00Screen } from "./JourneyMapScreen.tutorial-u00.test-support";

// `ui` 계층: 에피소드 띠(spec §19 H-2 + §20) — 말풍선이 열린 동안만 서고, 설명 줄 번호가 그 유닛 번호이며,
// 맵을 밀지 않습니다(맵 위 여백 인라인 없음). 번호 계산 자체는 unit(`catalog-sheet.unit.test.ts`)이 집니다.

afterEach(() => {
  cleanup();
});

// 내장 튜토리얼(u00) 구획에서 표지와 첫 레슨(S1)을 끝낸 진행으로 엽니다.
function renderMap(progressLoad?: JourneyMapProgressLoad) {
  return render(
    u00Screen(
      u00Catalog({ progress: { "u00-tutorial": ["intro", "S1"] } }),
      progressLoad === undefined ? {} : { progressLoad },
    ),
  );
}

const label = () => screen.getByTestId("ui-lynx-episode-header-label");
const header = () => screen.queryByTestId("ui-lynx-episode-header");
const mapStyle = () => screen.getByTestId("journey-map-screen-map").getAttribute("style") ?? "";

const tap = (id: string) => {
  act(() => {
    fireEvent.tap(screen.getByTestId(`ui-lynx-learning-unit-catalog-unit-u00-tutorial-${id}`), {
      detail: { y: 300 },
    });
  });
};
const closeSheet = () => {
  act(() => {
    fireEvent.tap(screen.getByTestId("step-sheet-close"), {});
  });
};

// spec §20: 띠는 말풍선이 열려 있는 동안만 선다.
test("HM1. 말풍선이 없으면 띠가 없다", () => {
  renderMap();

  expect(header()).not.toBeInTheDocument();
});

test("HM2. 유닛을 탭하면 띠가 서고 설명 줄이 그 유닛 번호다", () => {
  renderMap();

  tap("S1");

  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  expect(header()).toBeInTheDocument();
  expect(label()).toHaveTextContent("Episode 0, unit 01");
});

test("HM2. 다른 유닛을 탭하면 그 유닛 번호로 다시 바뀐다", () => {
  renderMap();

  tap("S1");
  tap("S2");

  expect(label()).toHaveTextContent("Episode 0, unit 02");
});

test("HM3. 말풍선을 닫으면 띠가 사라진다", () => {
  renderMap();

  tap("S1");
  closeSheet();

  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(header()).not.toBeInTheDocument();
});

test("HM3. 닫았다 다시 열면 띠가 다시 선다", () => {
  renderMap();

  tap("S1");
  closeSheet();
  tap("S2");

  expect(label()).toHaveTextContent("Episode 0, unit 02");
});

test("HM4. 진행을 확인하는 동안(checking)은 노드를 눌러도 말풍선도 띠도 없다", () => {
  renderMap({ status: "checking" });

  expect(header()).not.toBeInTheDocument();
  tap("S1");

  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(header()).not.toBeInTheDocument();
});

// ⟨2026-10-19⟩ 맵 상자는 이제 늘 인라인 위 여백을 갖는다(상태 표시줄 높이를 더하려고 — `mapTopLayout`). 지키는 것은
// 그대로다: 띠가 서고 높이를 재도 그 값이 바뀌지 않는다(띠가 맵을 밀지 않는다).
test("HM5. 맵 위 여백은 띠가 없을 때 고정값이다(상태 표시줄 0이면 212px)", () => {
  renderMap();

  expect(mapStyle()).toMatch(/padding-top:\s*212px/);
});

test("HM5. 띠가 서 있어도 맵을 밀지 않는다 (위 여백이 그대로, 높이를 재도 그대로)", () => {
  renderMap();

  tap("S1");
  expect(mapStyle()).toMatch(/padding-top:\s*212px/);

  fireEvent.layoutchange(screen.getByTestId("ui-lynx-episode-header").parentElement as Element, {
    detail: { height: 150 },
  });

  expect(mapStyle()).toMatch(/padding-top:\s*212px/);
});

test("HM6. 줄(loading)은 띠가 없으면 위 여백 없이, 말풍선이 열려 띠가 서면 잰 높이만큼 내려온다", () => {
  renderMap({ status: "loading" });
  const rowBox = () => screen.getByTestId("journey-progress-load-row").parentElement as Element;

  expect(rowBox().getAttribute("style") ?? "").not.toMatch(/margin-top:\s*[1-9]/);
});

test("HM6. 실패 줄 + 말풍선: 띠가 서고 줄 위 여백이 잰 높이를 따른다", () => {
  renderMap({ status: "failed", onRetry: vi.fn<() => void>() });
  const rowBox = () => screen.getByTestId("journey-progress-load-row").parentElement as Element;
  expect(rowBox().getAttribute("style") ?? "").not.toMatch(/margin-top:\s*[1-9]/);

  tap("S1");
  expect(rowBox().getAttribute("style")).toContain("110px");

  fireEvent.layoutchange(screen.getByTestId("ui-lynx-episode-header").parentElement as Element, {
    detail: { height: 138 },
  });
  expect(rowBox().getAttribute("style")).toContain("138px");

  closeSheet();
  expect(rowBox().getAttribute("style") ?? "").not.toMatch(/margin-top:\s*[1-9]/);
});
