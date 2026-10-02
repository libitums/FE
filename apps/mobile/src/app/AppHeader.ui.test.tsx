import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { AppHeader } from "./AppHeader";
import { UiCopyContext } from "../lib/ui-copy";
import { markedUiCopy } from "../lib/ui-copy.test-support";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). 텍스트 질의를 쓰지 않고 testid로
// 질의합니다. 여정 맵이 머리와 지표 모달을 소유하던 때의 JN · JSM 테스트가 머리와 함께
// 이리로 옮겨 왔습니다.

function fixture() {
  return {
    streakDays: 24,
    trophyCount: 3,
    onOpenNotifications: vi.fn(),
    todayWeekday: 1,
  };
}

test("[SH2-E][AH1] 연속 학습 → 트로피 순서로 표시하고 젬 구매 진입점은 숨긴다", () => {
  render(<AppHeader {...fixture()} />);

  const streak = screen.getByTestId("top-bar-streak");
  const trophy = screen.getByTestId("top-bar-trophy");
  expect(screen.queryByTestId("top-bar-gem")).not.toBeInTheDocument();
  for (const chip of [streak, trophy]) {
    expect(chip).toHaveAttribute("accessibility-traits", "button");
  }
  expect(streak.compareDocumentPosition(trophy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("[SH2-E][AH2] 알림 버튼 tap → onOpenNotifications 정확히 1회", () => {
  const props = fixture();
  render(<AppHeader {...props} />);

  const button = screen.getByTestId("top-bar-notifications");
  expect(button).toHaveAttribute("accessibility-label", "Notifications");
  fireEvent.tap(button, {});

  expect(props.onOpenNotifications).toHaveBeenCalledTimes(1);
});

test("[AH3] 처음에는 레이어가 없고 머리는 낭독된다", () => {
  render(<AppHeader {...fixture()} />);

  expect(screen.queryByTestId("journey-stat-modal-streak")).toBeNull();
  expect(screen.queryByTestId("journey-stat-modal-trophy")).toBeNull();
  expect(screen.queryByTestId("gem-purchase-screen")).toBeNull();
  expect(screen.getByTestId("app-header")).toHaveAttribute(
    "accessibility-elements-hidden",
    "false",
  );
});

test("[JM1-E][AH4] 연속 학습 칩 tap → 연속 모달이 연속일수 · 요일 · 찬 칸 셋을 그린다", () => {
  render(<AppHeader {...fixture()} />);

  fireEvent.tap(screen.getByTestId("top-bar-streak"), {});

  expect(screen.getByTestId("journey-stat-modal-streak")).toBeInTheDocument();
  expect(screen.getByTestId("journey-stat-modal-value")).toHaveTextContent("24");
  expect(screen.getByTestId("journey-stat-modal-days")).toHaveTextContent("SaSuMoTuWeThFr");
  expect(screen.getByTestId("journey-stat-modal-track")).toHaveAttribute(
    "accessibility-label",
    "3 of 7 completed",
  );
});

test("[JM1-E][AH5] 트로피 칩 tap → 트로피 모달은 요일 줄 없이 트로피 수만큼 찬다", () => {
  render(<AppHeader {...fixture()} />);

  fireEvent.tap(screen.getByTestId("top-bar-trophy"), {});

  expect(screen.getByTestId("journey-stat-modal-trophy")).toBeInTheDocument();
  expect(screen.getByTestId("journey-stat-modal-value")).toHaveTextContent("3");
  expect(screen.queryByTestId("journey-stat-modal-days")).toBeNull();
  expect(screen.getAllByTestId("journey-stat-modal-empty")).toHaveLength(4);
});

test("[AH6] 레이어가 떠 있는 동안 머리는 낭독에서 가려진다", () => {
  render(<AppHeader {...fixture()} />);

  fireEvent.tap(screen.getByTestId("top-bar-trophy"), {});

  expect(screen.getByTestId("app-header")).toHaveAttribute("accessibility-elements-hidden", "true");
});

test.each(["journey-stat-modal-back", "journey-stat-modal-continue"])(
  "[AH7] %s 안의 버튼 tap → 모달이 닫히고 알림은 열리지 않는다",
  (containerId) => {
    const props = fixture();
    render(<AppHeader {...props} />);
    fireEvent.tap(screen.getByTestId("top-bar-trophy"), {});

    const container = screen.getByTestId(containerId);
    const button =
      container.querySelector('[data-testid="ui-lynx-round-button"]') ??
      container.querySelector('[data-testid="ui-lynx-button"]');
    expect(button).not.toBeNull();
    fireEvent.tap(button as Element, {});

    expect(screen.queryByTestId("journey-stat-modal-trophy")).toBeNull();
    expect(props.onOpenNotifications).not.toHaveBeenCalled();
  },
);

test("[AH11] 화면 쪽 레이어가 떠 있으면(obscured) 머리가 낭독에서 가려진다", () => {
  render(<AppHeader {...fixture()} obscured />);

  expect(screen.getByTestId("app-header")).toHaveAttribute("accessibility-elements-hidden", "true");
});

// JM1-E — 지표 모달의 큰 숫자 낭독 이름이 영어이고 단수 · 복수를 지킨다.
test("[JM1-E] 연속 학습 모달의 큰 숫자가 24-day streak으로, 닫기 버튼이 Back to map으로 읽힌다", () => {
  render(<AppHeader {...fixture()} />);

  fireEvent.tap(screen.getByTestId("top-bar-streak"), {});

  expect(screen.getByTestId("journey-stat-modal-hero")).toHaveAttribute(
    "accessibility-label",
    "24-day streak",
  );
  expect(
    screen
      .getByTestId("journey-stat-modal-back")
      .querySelector('[data-testid="ui-lynx-round-button"]'),
  ).toHaveAttribute("accessibility-label", "Back to map");
});

test("[JM1-E] 트로피 모달의 큰 숫자가 3 episodes cleared로 읽힌다", () => {
  render(<AppHeader {...fixture()} />);

  fireEvent.tap(screen.getByTestId("top-bar-trophy"), {});

  expect(screen.getByTestId("journey-stat-modal-hero")).toHaveAttribute(
    "accessibility-label",
    "3 episodes cleared",
  );
});

test("[JM1-E] 트로피가 하나면 1 episode cleared로 읽힌다", () => {
  render(<AppHeader {...fixture()} trophyCount={1} />);

  fireEvent.tap(screen.getByTestId("top-bar-trophy"), {});

  expect(screen.getByTestId("journey-stat-modal-hero")).toHaveAttribute(
    "accessibility-label",
    "1 episode cleared",
  );
});

// JM1-M / SH2-M — 머리 칩과 지표 모달의 문구는 문구표에서 읽습니다.
test("[JM1-M] 문구표를 주입하고 연속 학습 칩을 누르면 모달의 이름들이 표의 경로로 나온다", () => {
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <AppHeader {...fixture()} />
    </UiCopyContext.Provider>,
  );

  fireEvent.tap(screen.getByTestId("top-bar-streak"), {});

  expect(screen.getByTestId("journey-stat-modal-hero")).toHaveAttribute(
    "accessibility-label",
    "⟦journeyMap.statModal.streakHero⟧(24)",
  );
  expect(screen.getByTestId("journey-stat-modal-track")).toHaveAttribute(
    "accessibility-label",
    "⟦journeyMap.statModal.slotProgress⟧(3, 7)",
  );
  expect(
    screen
      .getByTestId("journey-stat-modal-back")
      .querySelector('[data-testid="ui-lynx-round-button"]'),
  ).toHaveAttribute("accessibility-label", "⟦common.exitTo.journey⟧");
});

test("[JM1-M] 문구표를 주입하고 트로피 칩을 누르면 큰 숫자의 이름이 episodesClearedHero 경로로 나온다", () => {
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <AppHeader {...fixture()} />
    </UiCopyContext.Provider>,
  );

  fireEvent.tap(screen.getByTestId("top-bar-trophy"), {});

  expect(screen.getByTestId("journey-stat-modal-hero")).toHaveAttribute(
    "accessibility-label",
    "⟦journeyMap.statModal.episodesClearedHero⟧(3)",
  );
});

// ---------------------------------------------------------------- 에피소드 끝 설문 (ADR-0036)

const survey = { id: "tutorial", title: "Tutorial" };

function tapInside(testId: string): void {
  const container = screen.getByTestId(testId);
  const button =
    container.querySelector('[data-testid="ui-lynx-round-button"]') ??
    container.querySelector('[data-testid="ui-lynx-button"]');
  fireEvent.tap(button!, {});
}

test("[AH-S1] 설문이 있으면 설문 시트가 뜨고, 보기를 누르면 그 별점으로 답한다", () => {
  const onAnswer = vi.fn();
  const { rerender } = render(
    <AppHeader {...fixture()} episodeSurvey={survey} onAnswerEpisodeSurvey={onAnswer} />,
  );

  expect(screen.getByTestId("episode-survey-options")).toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-4"), {});

  expect(onAnswer).toHaveBeenCalledWith("tutorial", 4);
  // 부모가 설문을 비우면(`onEpisodeSurveyClosed`) 다시 뜨지 않습니다.
  rerender(<AppHeader {...fixture()} episodeSurvey={null} onAnswerEpisodeSurvey={onAnswer} />);
  expect(screen.queryByTestId("episode-survey-options")).toBeNull();
});

test("[AH-S2] Not now는 건너뛰기다", () => {
  const onSkip = vi.fn();
  const { rerender } = render(
    <AppHeader {...fixture()} episodeSurvey={survey} onSkipEpisodeSurvey={onSkip} />,
  );

  tapInside("episode-survey-skip");

  expect(onSkip).toHaveBeenCalledWith("tutorial");
  rerender(<AppHeader {...fixture()} episodeSurvey={null} onSkipEpisodeSurvey={onSkip} />);
  expect(screen.queryByTestId("episode-survey-options")).toBeNull();
});

test("[AH-S3] 연속 축하가 먼저다 — 연속 모달을 닫은 뒤에 설문이 뜬다", () => {
  const { rerender } = render(
    <AppHeader {...fixture()} celebrateStreak={true} episodeSurvey={survey} />,
  );
  expect(screen.getByTestId("journey-stat-modal-streak")).toBeInTheDocument();
  expect(screen.queryByTestId("episode-survey-options")).toBeNull();

  // 축하를 알린 뒤 부모가 플래그를 내립니다.
  rerender(<AppHeader {...fixture()} celebrateStreak={false} episodeSurvey={survey} />);
  tapInside("journey-stat-modal-back");

  expect(screen.getByTestId("episode-survey-options")).toBeInTheDocument();
});
