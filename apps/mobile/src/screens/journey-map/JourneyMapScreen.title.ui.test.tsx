import { expect, it, vi } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import type { EpisodeFinalUnitId } from "../episode-final/episode-final.contract";
import type { EpisodeIntroUnitId } from "../episode-intro/episode-intro.contract";
import type { MessengerUnitId } from "../messenger/messenger.contract";
import type { PhoneCallUnitId } from "../phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../visual-novel/visual-novel.contract";
import { JourneyMapScreen } from "./JourneyMapScreen";
import type { JourneyStepId } from "./journey-map";

// 데이터 경계의 제목을 바꿔치기해, 화면이 자체 문구 대신 전달받은 값을 쓰는지 봅니다.
vi.mock("./journey-map", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./journey-map")>();
  return {
    ...actual,
    // 화면이 읽는 것은 구획(에피소드 + 그 항목들)입니다 — 평평한 목록이 아니라
    // 이쪽을 바꿔야 화면에 닿습니다.
    journeyMapSections: actual.journeyMapSections.map((section) => ({
      ...section,
      items: section.items.map((item) =>
        item.kind === "messenger" ? { ...item, title: "Verification message title" } : item,
      ),
    })),
  };
});

it("특별 항목의 표시와 접근성 이름에 맵 데이터의 제목을 사용한다", () => {
  render(
    // ⟨개정 2026-09-29⟩ 표지 완료를 넘깁니다 — 미완료면 메신저 항목이 잠겨(D6) 낭독
    // 이름에 상태 접미사 「잠김」이 끼고, 이 케이스가 보려는 **제목의 출처**가
    // 그 접미사에 가려집니다.
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
    />,
  );
  const item = screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation");
  // 제목은 표식 아래 라벨과 접근성 이름 두 곳에 같은 값으로 실립니다. 이름 뒤의
  // 「이야기 연결」은 `LearningUnit`이 붙이는 것이라 제목과 무관합니다.
  expect(screen.getByText("Verification message title")).toBeInTheDocument();
  expect(item).toHaveAttribute("accessibility-label", "Verification message title, story");
});
