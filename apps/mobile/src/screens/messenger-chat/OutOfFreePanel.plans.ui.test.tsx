import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { PlanId } from "../../lib/plans-api";
import { planCardsFor } from "../plans/plans-model";
import { plansTestIds as ids } from "../plans/plans.contract";
import { catalogV1 } from "../plans/plans.test-support";
import { chatTurnsTestIds } from "./chat-turns.contract";
import { OutOfFreePanel } from "./OutOfFreePanel";

// `ui` 계층(SB-UI5): 메신저 무료 다 씀 판의 Chat Plus · Premium 카드(ADR-0144, 시안 ②) — 결선이 있을 때만.

vi.mock("./chat-input-focus", () => ({
  focusPhoneInput: vi.fn<() => void>(),
  blurPhoneInput: vi.fn<() => void>(),
  clearPhoneInput: vi.fn<() => void>(),
  restoreAccessibilityFocus: vi.fn<(testId: string) => void>(),
}));

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function mount(withOffer: boolean) {
  const offer = {
    cards: planCardsFor(catalogV1, "messenger", "monthly", null),
    onSelect: vi.fn<(plan: PlanId) => void>(),
    onCompare: vi.fn<() => void>(),
    onShown: vi.fn<() => void>(),
  };
  const onKeepChatting = vi.fn<() => void>();
  render(
    <OutOfFreePanel
      total={3}
      price={3}
      balance={2}
      reset={{ hours: 5, minutes: 12 }}
      onKeepChatting={onKeepChatting}
      onBackToChats={() => {}}
      {...(withOffer ? { offer } : {})}
    />,
  );
  return { offer, onKeepChatting };
}

test("SB-UI5a 결선이 있으면 판 스크롤 안에 카드 둘(Premium BEST), 누르면 그 요금제 · Keep chatting은 그대로", () => {
  const { offer, onKeepChatting } = mount(true);
  const content = screen.getByTestId(chatTurnsTestIds.panelScrollContent);
  expect(content.contains(screen.getByTestId(ids.offerCard("chat_plus")))).toBe(true);
  expect(screen.getByTestId(ids.offerCard("premium"))).toHaveTextContent("BEST");
  fireEvent.tap(screen.getByTestId(ids.offerCard("chat_plus")), {});
  expect(offer.onSelect).toHaveBeenCalledWith("chat_plus");
  fireEvent.tap(screen.getByTestId(chatTurnsTestIds.panelKeep), {});
  expect(onKeepChatting).toHaveBeenCalledTimes(1);
  expect(offer.onShown).toHaveBeenCalledTimes(1);
});

test("SB-UI5b 결선이 없으면 지금 그대로 — 카드 없음", () => {
  mount(false);
  expect(screen.queryByTestId(ids.offer)).toBeNull();
  expect(screen.getByTestId(chatTurnsTestIds.panelKeep)).toBeInTheDocument();
});
