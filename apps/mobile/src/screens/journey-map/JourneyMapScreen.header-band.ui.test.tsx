import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { EpisodeFinalUnitId } from "../episode-final/episode-final.contract";
import type { EpisodeIntroUnitId } from "../episode-intro/episode-intro.contract";
import type { MessengerUnitId } from "../messenger/messenger.contract";
import type { PhoneCallUnitId } from "../phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../visual-novel/visual-novel.contract";
import { JourneyMapScreen } from "./JourneyMapScreen";
import type { JourneyStepId } from "./journey-map";
import type { JourneyMapProgressLoad } from "./journey-map-load.contract";

// `ui` 계층: 에피소드 띠(spec §19 H-2 + §20) — 말풍선이 열린 동안만 서고, 설명 줄 번호가 그 스텝 번호이며,
// 맵을 밀지 않습니다(맵 위 여백 인라인 없음). 번호 계산 자체는 unit(`episode-unit-label.unit.test.ts`)이 집니다.

afterEach(() => {
  cleanup();
});

function renderMap(progressLoad?: JourneyMapProgressLoad) {
  return render(
    <JourneyMapScreen
      completedStepCount={2}
      onStartStep={vi.fn<(id: JourneyStepId) => void>()}
      completedEpisodeIntroIds={["tutorial-intro"]}
      onStartEpisodeIntroUnit={vi.fn<(id: EpisodeIntroUnitId) => void>()}
      completedMessengerUnitIds={[]}
      onStartMessengerUnit={vi.fn<(id: MessengerUnitId) => void>()}
      completedPhoneCallUnitIds={[]}
      onStartPhoneCallUnit={vi.fn<(id: PhoneCallUnitId) => void>()}
      completedVisualNovelUnitIds={[]}
      onStartVisualNovelUnit={vi.fn<(id: VisualNovelUnitId) => void>()}
      completedEpisodeFinalIds={[]}
      onStartEpisodeFinal={vi.fn<(id: EpisodeFinalUnitId) => void>()}
      progressLoad={progressLoad}
    />,
  );
}

const label = () => screen.getByTestId("ui-lynx-episode-header-label");
const header = () => screen.queryByTestId("ui-lynx-episode-header");
const mapStyle = () => screen.getByTestId("journey-map-screen-map").getAttribute("style") ?? "";

const tap = (id: string) => {
  act(() => {
    fireEvent.tap(screen.getByTestId(`ui-lynx-learning-unit-${id}`), { detail: { y: 300 } });
  });
};
const closeSheet = () => {
  act(() => {
    fireEvent.tap(screen.getByTestId("step-sheet-close"), {});
  });
};

// spec §20: 띠는 스텝 말풍선이 열려 있는 동안만 선다.
test("HM1. 말풍선이 없으면 띠가 없다", () => {
  renderMap();

  expect(header()).not.toBeInTheDocument();
});

test("HM2. 스텝을 탭하면 띠가 서고 설명 줄이 그 스텝 번호다", () => {
  renderMap();

  tap("greeting");

  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  expect(header()).toBeInTheDocument();
  expect(label()).toHaveTextContent("Episode 0, unit 01");
});

test("HM2. 다른 스텝을 탭하면 그 스텝 번호로 다시 바뀐다", () => {
  renderMap();

  tap("greeting");
  tap("introduction");

  expect(label()).toHaveTextContent("Episode 0, unit 02");
});

test("HM3. 말풍선을 닫으면 띠가 사라진다", () => {
  renderMap();

  tap("greeting");
  closeSheet();

  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(header()).not.toBeInTheDocument();
});

test("HM3. 닫았다 다시 열면 띠가 다시 선다", () => {
  renderMap();

  tap("greeting");
  closeSheet();
  tap("introduction");

  expect(label()).toHaveTextContent("Episode 0, unit 02");
});

test("HM4. 진행을 확인하는 동안(checking)은 노드를 눌러도 말풍선도 띠도 없다", () => {
  renderMap({ status: "checking" });

  expect(header()).not.toBeInTheDocument();
  tap("greeting");

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

  tap("greeting");
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

  tap("greeting");
  expect(rowBox().getAttribute("style")).toContain("110px");

  fireEvent.layoutchange(screen.getByTestId("ui-lynx-episode-header").parentElement as Element, {
    detail: { height: 138 },
  });
  expect(rowBox().getAttribute("style")).toContain("138px");

  closeSheet();
  expect(rowBox().getAttribute("style") ?? "").not.toMatch(/margin-top:\s*[1-9]/);
});
