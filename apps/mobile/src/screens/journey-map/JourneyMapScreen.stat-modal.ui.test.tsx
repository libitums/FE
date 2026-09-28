import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { JourneyMapScreen } from "./JourneyMapScreen";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). 텍스트 질의를 쓰지 않고 testid로
// 질의합니다.

function fixture() {
  return {
    completedStepCount: 2,
    onStartStep: vi.fn(),
    completedMessengerUnitIds: [] as const,
    onStartMessengerUnit: vi.fn(),
    completedPhoneCallUnitIds: [] as const,
    onStartPhoneCallUnit: vi.fn(),
    onOpenNotifications: vi.fn(),
    streakDays: 24,
    trophyCount: 3,
    todayWeekday: 1,
  };
}

test("[JSM1] 처음에는 지표 모달이 없고, 칩 둘은 버튼으로 낭독된다", () => {
  render(<JourneyMapScreen {...fixture()} />);

  expect(screen.queryByTestId("journey-stat-modal-streak")).toBeNull();
  expect(screen.queryByTestId("journey-stat-modal-trophy")).toBeNull();
  for (const id of ["journey-map-top-bar-streak", "journey-map-top-bar-trophy"]) {
    expect(screen.getByTestId(id)).toHaveAttribute("accessibility-traits", "button");
  }
});

test("[JSM2] 연속 학습 칩 tap → 연속 모달이 연속일수 · 요일 · 찬 칸 셋을 그린다", () => {
  render(<JourneyMapScreen {...fixture()} />);

  fireEvent.tap(screen.getByTestId("journey-map-top-bar-streak"), {});

  const modal = screen.getByTestId("journey-stat-modal-streak");
  expect(modal).toBeInTheDocument();
  expect(screen.getByTestId("journey-stat-modal-value")).toHaveTextContent("24");
  expect(screen.getByTestId("journey-stat-modal-title")).toHaveTextContent("day streak");
  expect(screen.getByTestId("journey-stat-modal-days")).toHaveTextContent("SaSuMoTuWeThFr");
  expect(screen.getByTestId("journey-stat-modal-track")).toHaveAttribute(
    "accessibility-label",
    "7칸 중 3칸 완료",
  );
  expect(screen.getAllByTestId("journey-stat-modal-empty")).toHaveLength(4);
});

test("[JSM3] 트로피 칩 tap → 트로피 모달은 요일 줄 없이 트로피 수만큼 찬다", () => {
  render(<JourneyMapScreen {...fixture()} />);

  fireEvent.tap(screen.getByTestId("journey-map-top-bar-trophy"), {});

  expect(screen.getByTestId("journey-stat-modal-trophy")).toBeInTheDocument();
  expect(screen.getByTestId("journey-stat-modal-value")).toHaveTextContent("3");
  expect(screen.getByTestId("journey-stat-modal-title")).toHaveTextContent("Episode Clear!");
  expect(screen.getByTestId("journey-stat-modal-message")).toHaveTextContent(
    "Amazing work! Come back tomorrow to clear the next episode!",
  );
  expect(screen.queryByTestId("journey-stat-modal-days")).toBeNull();
  expect(screen.getAllByTestId("journey-stat-modal-empty")).toHaveLength(4);
});

test("[JSM4] 모달이 떠 있는 동안 뒤쪽 머리와 맵은 낭독에서 가려진다", () => {
  render(<JourneyMapScreen {...fixture()} />);

  fireEvent.tap(screen.getByTestId("journey-map-top-bar-streak"), {});

  expect(screen.getByTestId("journey-map-screen-actions")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );
  expect(screen.getByTestId("journey-map-screen-map")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );
});

test.each(["journey-stat-modal-back", "journey-stat-modal-continue"])(
  "[JSM5] %s 안의 버튼 tap → 모달이 닫히고 화면 전환 콜백은 불리지 않는다",
  (containerId) => {
    const props = fixture();
    render(<JourneyMapScreen {...props} />);
    fireEvent.tap(screen.getByTestId("journey-map-top-bar-trophy"), {});

    const container = screen.getByTestId(containerId);
    const button =
      container.querySelector('[data-testid="ui-lynx-round-button"]') ??
      container.querySelector('[data-testid="ui-lynx-button"]');
    expect(button).not.toBeNull();
    fireEvent.tap(button as Element, {});

    expect(screen.queryByTestId("journey-stat-modal-trophy")).toBeNull();
    expect(props.onOpenNotifications).not.toHaveBeenCalled();
    expect(props.onStartStep).not.toHaveBeenCalled();
  },
);
