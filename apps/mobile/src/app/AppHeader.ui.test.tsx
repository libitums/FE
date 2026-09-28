import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { AppHeader } from "./AppHeader";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). 텍스트 질의를 쓰지 않고 testid로
// 질의합니다. 여정 맵이 머리와 지표 모달을 소유하던 때의 JN · JSM 테스트가 머리와 함께
// 이리로 옮겨 왔습니다.

function fixture() {
  return {
    streakDays: 24,
    trophyCount: 3,
    gemCount: 1240,
    onOpenNotifications: vi.fn(),
    onPurchaseGems: vi.fn(),
    todayWeekday: 1,
  };
}

test("[AH1] 칩 셋은 연속 학습 → 트로피 → 젬 순서의 버튼이고, 이름에 값이 실린다", () => {
  render(<AppHeader {...fixture()} />);

  const streak = screen.getByTestId("top-bar-streak");
  const trophy = screen.getByTestId("top-bar-trophy");
  const gem = screen.getByTestId("top-bar-gem");
  for (const chip of [streak, trophy, gem]) {
    expect(chip).toHaveAttribute("accessibility-traits", "button");
  }
  expect(gem).toHaveAttribute("accessibility-label", "젬 1240개");
  expect(gem).toHaveTextContent("1240");
  expect(streak.compareDocumentPosition(trophy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(trophy.compareDocumentPosition(gem) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("[AH2] 알림 버튼 tap → onOpenNotifications 정확히 1회", () => {
  const props = fixture();
  render(<AppHeader {...props} />);

  const button = screen.getByTestId("top-bar-notifications");
  expect(button).toHaveAttribute("accessibility-label", "알림");
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

test("[AH4] 연속 학습 칩 tap → 연속 모달이 연속일수 · 요일 · 찬 칸 셋을 그린다", () => {
  render(<AppHeader {...fixture()} />);

  fireEvent.tap(screen.getByTestId("top-bar-streak"), {});

  expect(screen.getByTestId("journey-stat-modal-streak")).toBeInTheDocument();
  expect(screen.getByTestId("journey-stat-modal-value")).toHaveTextContent("24");
  expect(screen.getByTestId("journey-stat-modal-days")).toHaveTextContent("SaSuMoTuWeThFr");
  expect(screen.getByTestId("journey-stat-modal-track")).toHaveAttribute(
    "accessibility-label",
    "7칸 중 3칸 완료",
  );
});

test("[AH5] 트로피 칩 tap → 트로피 모달은 요일 줄 없이 트로피 수만큼 찬다", () => {
  render(<AppHeader {...fixture()} />);

  fireEvent.tap(screen.getByTestId("top-bar-trophy"), {});

  expect(screen.getByTestId("journey-stat-modal-trophy")).toBeInTheDocument();
  expect(screen.getByTestId("journey-stat-modal-value")).toHaveTextContent("3");
  expect(screen.queryByTestId("journey-stat-modal-days")).toBeNull();
  expect(screen.getAllByTestId("journey-stat-modal-empty")).toHaveLength(4);
});

test("[AH6] 레이어가 떠 있는 동안 머리는 낭독에서 가려진다", () => {
  render(<AppHeader {...fixture()} />);

  fireEvent.tap(screen.getByTestId("top-bar-gem"), {});

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

test("[AH8] 젬 칩 tap → 구매 화면이 보유 젬을 싣고 뜬다", () => {
  render(<AppHeader {...fixture()} />);

  fireEvent.tap(screen.getByTestId("top-bar-gem"), {});

  expect(screen.getByTestId("gem-purchase-screen")).toBeInTheDocument();
  expect(screen.getByTestId("gem-purchase-screen-balance-value")).toHaveTextContent("1,240");
});

test("[AH9] 구매 화면의 Pay → 고른 팩을 올리고 화면이 닫힌다", () => {
  const props = fixture();
  render(<AppHeader {...props} />);
  fireEvent.tap(screen.getByTestId("top-bar-gem"), {});

  const pay = screen
    .getByTestId("gem-purchase-screen-pay")
    .querySelector('[data-testid="ui-lynx-button"]');
  fireEvent.tap(pay as Element, {});

  expect(props.onPurchaseGems).toHaveBeenCalledTimes(1);
  expect(props.onPurchaseGems).toHaveBeenCalledWith(expect.objectContaining({ id: "max" }));
  expect(screen.queryByTestId("gem-purchase-screen")).toBeNull();
});

test("[AH10] 구매 화면의 닫기 → 아무것도 사지 않고 닫힌다", () => {
  const props = fixture();
  render(<AppHeader {...props} />);
  fireEvent.tap(screen.getByTestId("top-bar-gem"), {});

  const close = screen
    .getByTestId("gem-purchase-screen-close")
    .querySelector('[data-testid="ui-lynx-round-button"]');
  fireEvent.tap(close as Element, {});

  expect(screen.queryByTestId("gem-purchase-screen")).toBeNull();
  expect(props.onPurchaseGems).not.toHaveBeenCalled();
});

test("[AH11] 화면 쪽 레이어가 떠 있으면(obscured) 머리가 낭독에서 가려진다", () => {
  render(<AppHeader {...fixture()} obscured />);

  expect(screen.getByTestId("app-header")).toHaveAttribute("accessibility-elements-hidden", "true");
});
