import { expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { EpisodeFinalUnitId } from "../episode-final/episode-final.contract";
import type { EpisodeIntroUnitId } from "../episode-intro/episode-intro.contract";
import type { MessengerUnitId } from "../messenger/messenger.contract";
import type { PhoneCallUnitId } from "../phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../visual-novel/visual-novel.contract";
import { JourneyMapScreen } from "./JourneyMapScreen";
import type { JourneyStepId } from "./journey-map";

// ⟨개정 2026-09-29⟩ 케이스 이름의 `special`을 걷습니다. 그 낱말은 **유닛 목록의 판별자**
// (`JourneyUnit.kind`)이고 맵 항목의 어휘가 아닙니다 — 맵 항목은 종류마다 제 이름을
// 답니다(`messenger`·`episode-intro` …). 이름만 두면 러너 출력이 지운 어휘로 말합니다.
//
// ⟨개정⟩ 세 케이스 모두 **표지 완료를 넘깁니다**. 표지가 미완료면 그 구획의 나머지가
// 통째로 잠겨(D6) 여기서 보려는 것(자리 · 서수 · 낭독 이름)이 전부 자물쇠에 덮입니다 —
// 잠김 축 자체는 `JourneyMapScreen.episode-intro.ui.test.tsx`의 `UI-L1`·`UI-L2`가 집니다.
function fixture() {
  return {
    completedStepCount: 2,
    onStartStep: vi.fn<(id: JourneyStepId) => void>(),
    completedEpisodeIntroIds: ["tutorial-intro"] as const,
    onStartEpisodeIntroUnit: vi.fn<(id: EpisodeIntroUnitId) => void>(),
    completedMessengerUnitIds: [] as const,
    onStartMessengerUnit: vi.fn<(id: MessengerUnitId) => void>(),
    completedPhoneCallUnitIds: [] as const,
    onStartPhoneCallUnit: vi.fn<(id: PhoneCallUnitId) => void>(),
    completedVisualNovelUnitIds: [] as const,
    onStartVisualNovelUnit: vi.fn<(id: VisualNovelUnitId) => void>(),
    completedEpisodeFinalIds: [] as const,
    onStartEpisodeFinal: vi.fn<(id: EpisodeFinalUnitId) => void>(),
  };
}

it("C1: 표지가 줄 머리에 서고 메신저 유닛이 appointment와 directions 사이에 낀다", () => {
  render(<JourneyMapScreen {...fixture()} />);

  const map = screen.getByTestId("journey-map-screen-map");
  expect(
    [
      ...map.querySelectorAll(
        [
          "[data-testid=ui-lynx-learning-unit-tutorial-intro]",
          "[data-testid=ui-lynx-learning-unit-greeting]",
          "[data-testid=ui-lynx-learning-unit-introduction]",
          "[data-testid=ui-lynx-learning-unit-ordering]",
          "[data-testid=ui-lynx-learning-unit-appointment]",
          "[data-testid=ui-lynx-learning-unit-appointment-confirmation]",
          "[data-testid=ui-lynx-learning-unit-directions]",
        ].join(","),
      ),
    ].map((node) => node.getAttribute("data-testid")),
  ).toEqual([
    // ⟨개정⟩ 첫 자리가 표지입니다 — 전에는 `greeting`이었습니다(D2).
    "ui-lynx-learning-unit-tutorial-intro",
    "ui-lynx-learning-unit-greeting",
    "ui-lynx-learning-unit-introduction",
    "ui-lynx-learning-unit-ordering",
    "ui-lynx-learning-unit-appointment",
    "ui-lynx-learning-unit-appointment-confirmation",
    "ui-lynx-learning-unit-directions",
  ]);
});

it("C2: 특별 유닛 뒤 directions는 자기 스텝 서수의 기존 상태와 조작 가능성을 유지한다", () => {
  const props = fixture();
  render(<JourneyMapScreen {...props} />);

  const directions = screen.getByTestId("ui-lynx-learning-unit-directions");
  expect(directions).toHaveAttribute("data-status", "default");
  const messengerUnit = screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation");
  expect(messengerUnit).toHaveAttribute("data-status", "available");
  fireEvent.tap(messengerUnit, {});
  expect(props.onStartMessengerUnit).toHaveBeenCalledWith("appointment-confirmation");
  fireEvent.tap(directions, {});
  expect(props.onStartStep).not.toHaveBeenCalled();
});

it("C3: directions의 실제 접근성 이름과 조작 불가 trait를 리터럴로 낸다", () => {
  render(<JourneyMapScreen {...fixture()} />);

  const directions = screen.getByTestId("ui-lynx-learning-unit-directions");
  expect(directions).toHaveAttribute("accessibility-label", "길 묻기, 잠김");
  expect(directions).toHaveAttribute("accessibility-traits", "disabled");
});
