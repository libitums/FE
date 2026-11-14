import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { AppHeader } from "./AppHeader";
import { streakRewardTestIds as ids } from "../screens/journey-map/streak-reward.contract";

// `ui` 계층(SR-UI8b): 머리가 연속 학습 보상 결선(ADR-0143)을 연속 학습 모달에만 넘긴다.

afterEach(() => {
  cleanup();
});

const streakReward = {
  collected: () => false,
  claim: async () => null,
  onClaimed: vi.fn(),
  onCoinLanded: vi.fn(),
  onSettled: vi.fn(),
  coinTargetId: "top-bar-coins-icon",
};

test("SR-UI8b 연속 칩 → 보상 카드, 트로피 칩 → 보상 없음", () => {
  render(
    <AppHeader
      streakDays={7}
      trophyCount={7}
      onOpenNotifications={vi.fn()}
      todayWeekday={3}
      streakReward={streakReward}
    />,
  );
  fireEvent.tap(screen.getByTestId("top-bar-streak"), {});
  expect(screen.getByTestId(ids.card)).toBeTruthy();
  cleanup();
  render(
    <AppHeader
      streakDays={7}
      trophyCount={7}
      onOpenNotifications={vi.fn()}
      todayWeekday={3}
      streakReward={streakReward}
    />,
  );
  fireEvent.tap(screen.getByTestId("top-bar-trophy"), {});
  expect(screen.getByTestId("journey-stat-modal-trophy")).toBeTruthy();
  expect(screen.queryByTestId(ids.card)).toBeNull();
});
