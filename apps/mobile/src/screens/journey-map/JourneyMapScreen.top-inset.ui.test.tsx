import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import type { EpisodeFinalUnitId } from "../episode-final/episode-final.contract";
import type { EpisodeIntroUnitId } from "../episode-intro/episode-intro.contract";
import type { MessengerUnitId } from "../messenger/messenger.contract";
import type { PhoneCallUnitId } from "../phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../visual-novel/visual-novel.contract";
import { JourneyMapScreen } from "./JourneyMapScreen";
import type { JourneyStepId } from "./journey-map";

// `ui` 계층: ⟨2026-10-19⟩ 맵은 상태 표시줄 뒤까지 스크롤한다(사용자 결정). 셸이 위 안전 영역을 칠하지 않으므로
// 맵이 그 높이를 받아 첫 내용 · 띠 자리 · 로딩 줄을 그만큼 내린다. 값은 `mapTopLayout`이 정하고 여기서는 결선만 본다.

afterEach(cleanup);

function renderMap(statusBarInset?: number) {
  render(
    <JourneyMapScreen
      completedStepCount={0}
      onStartStep={vi.fn<(id: JourneyStepId) => void>()}
      completedEpisodeIntroIds={[]}
      onStartEpisodeIntroUnit={vi.fn<(id: EpisodeIntroUnitId) => void>()}
      completedMessengerUnitIds={[]}
      onStartMessengerUnit={vi.fn<(id: MessengerUnitId) => void>()}
      completedPhoneCallUnitIds={[]}
      onStartPhoneCallUnit={vi.fn<(id: PhoneCallUnitId) => void>()}
      completedVisualNovelUnitIds={[]}
      onStartVisualNovelUnit={vi.fn<(id: VisualNovelUnitId) => void>()}
      completedEpisodeFinalIds={[]}
      onStartEpisodeFinal={vi.fn<(id: EpisodeFinalUnitId) => void>()}
      progressLoad={{ status: "loading" }}
      {...(statusBarInset === undefined ? {} : { statusBarInset })}
    />,
  );
}

const style = (testId: string): string => screen.getByTestId(testId).getAttribute("style") ?? "";

test("SB1. 안전 영역 높이만큼 첫 내용 · 띠 자리 · 로딩 줄이 내려오고, 화면 위 여백은 스크롤 안으로 옮겨진다", () => {
  renderMap(47);
  expect(style("journey-map-screen")).toMatch(/padding-top:\s*0px/);
  expect(style("journey-map-screen-map")).toMatch(/padding-top:\s*259px/);
  expect(style("journey-map-screen-header-anchor")).toMatch(/top:\s*111px/);
  expect(style("journey-map-screen-progress-row")).toMatch(/top:\s*119px/);
});

test("SB2. 안전 영역을 넘기지 않으면 0으로 본다 — 예전 배치와 같은 화면 자리", () => {
  renderMap();
  expect(style("journey-map-screen-map")).toMatch(/padding-top:\s*212px/);
  expect(style("journey-map-screen-header-anchor")).toMatch(/top:\s*64px/);
});
