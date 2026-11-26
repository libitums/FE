import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { UiCopyContext, uiCopyFor } from "../../lib/ui-copy";
import { SubscriptionBonusModal } from "./SignupRewardModal";
import { signupRewardTestIds as ids } from "./signup-reward.contract";

// `ui` 계층(CB-UI1 · UI2): Chat Plus 첫 구독 보너스 모달(ADR-0196 D4) — 가입 보상 창과 같은 틀(위 알약 · 제목 · 주머니 · +N · Got it)에 구독 문구.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  while (backHandlers.runTop()) {
    /* 남은 등록 비움 */
  }
  vi.useRealTimers();
});

test("CB-UI1 SUBSCRIBER GIFT · Welcome to Chat Plus! · 보조문 · +0 → +100(낭독 「+100 Yeopjeon」) · Got it이면 날기 시작", () => {
  const onFlightStart = vi.fn();
  render(
    <SubscriptionBonusModal
      amount={100}
      coinTargetId="chip-icon"
      onFlightStart={onFlightStart}
      onDone={() => undefined}
    />,
  );
  const modal = screen.getByTestId(ids.modal);
  expect(modal.textContent).toContain("SUBSCRIBER GIFT");
  expect(modal.textContent).toContain("Welcome to Chat Plus!");
  expect(modal.textContent).toContain("A one-time thank-you for subscribing.");
  expect(screen.getByTestId(ids.amount).textContent).toBe("+0");
  act(() => {
    vi.advanceTimersByTime(3_000);
  });
  expect(screen.getByTestId(ids.amount).textContent).toBe("+100");
  expect(modal.querySelector('[accessibility-label="+100 Yeopjeon"]')).not.toBeNull();
  expect(screen.queryByTestId(ids.ticketStage)).toBeNull();
  act(() => {
    fireEvent.tap(within(screen.getByTestId(ids.gotIt)).getByText(/./), {});
  });
  expect(onFlightStart).toHaveBeenCalledTimes(1);
});

test("CB-UI2 화면 언어를 따른다 — 일본어는 サブスク特典 · Chat Plusへようこそ！", () => {
  render(
    <UiCopyContext.Provider value={uiCopyFor("ja")}>
      <SubscriptionBonusModal amount={100} coinTargetId="chip-icon" onDone={() => undefined} />
    </UiCopyContext.Provider>,
  );
  const modal = screen.getByTestId(ids.modal);
  expect(modal.textContent).toContain("サブスク特典");
  expect(modal.textContent).toContain("Chat Plusへようこそ！");
});
