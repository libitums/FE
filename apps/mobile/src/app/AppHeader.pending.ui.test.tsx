import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../lib/back-handler";
import { AppHeader, type HeaderPlans } from "./AppHeader";

// `ui` 계층(AH-P1 · AH-P2, ADR-0163 D3): 구매 뒤 확인 대기 동안 머리의 바뀔 칩 — 엽전 칩 · 둘째 줄 요금제 칩의 값이 스켈레톤이고
// 이름 앞에 「Updating」. 상점을 먼저 닫아도 기다림이 머리에서 이어집니다.

afterEach(() => {
  cleanup();
  while (backHandlers.runTop()) {
    /* 남은 핸들러를 비웁니다 */
  }
});

function mount(updating: HeaderPlans["updating"]) {
  render(
    <AppHeader
      streakDays={1}
      trophyCount={0}
      coinCount={120}
      onOpenNotifications={() => {}}
      onOpenShop={vi.fn()}
      plans={{
        chip: "plans",
        goUnlimited: undefined,
        activated: null,
        onActivatedShown: () => {},
        updating,
      }}
    />,
  );
}
const present = (testId: string) => screen.queryByTestId(testId) !== null;

test("AH-P1 엽전 대기 — 엽전 칩 값이 스켈레톤 · 이름 「Updating, …」, 요금제 칩은 그대로", () => {
  mount({ coins: true, plan: false });
  expect(present("top-bar-coins-updating")).toBe(true);
  expect(screen.getByTestId("top-bar-coins")).not.toHaveTextContent("120");
  expect(screen.getByTestId("top-bar-coins").getAttribute("accessibility-label")).toBe(
    "Updating, 120 coins, get more",
  );
  expect(present("header-plan-chip-updating")).toBe(false);
  expect(screen.getByTestId("header-plan-chip")).toHaveTextContent("PLANS");
});

test("AH-P2 구독 대기 — 요금제 칩 글이 스켈레톤 · 이름 「Updating, Plans」, 엽전 칩은 숫자 그대로", () => {
  mount({ coins: false, plan: true });
  expect(present("header-plan-chip-updating")).toBe(true);
  expect(screen.getByTestId("header-plan-chip")).not.toHaveTextContent("PLANS");
  expect(screen.getByTestId("header-plan-chip").getAttribute("accessibility-label")).toBe(
    "Updating, Plans",
  );
  expect(present("top-bar-coins-updating")).toBe(false);
  expect(screen.getByTestId("top-bar-coins")).toHaveTextContent("120");
});
