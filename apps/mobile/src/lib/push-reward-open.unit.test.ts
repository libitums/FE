import { afterEach, expect, test, vi } from "vitest";

import { notePushRewardOpen, onPushRewardOpen, takePushRewardOpen } from "./push-reward-open";
import { rewardTicketPassActive, setRewardTicketPass } from "./reward-ticket-pass";
import { ticketsUnlimited } from "./unlimited-tickets";

// `unit` 계층(PR-U3 · U4): 누른 알림의 보상 신호와 보상 무제한 티켓 판정(ADR-0175).

afterEach(() => {
  takePushRewardOpen();
  setRewardTicketPass(0);
});

test("PR-U3. 여정 맵 목적지만 신호가 되고, 꺼내면 비며, 구독자에게 알린다", () => {
  const listener = vi.fn();
  const off = onPushRewardOpen(listener);
  notePushRewardOpen({ kind: "companion-chat", characterId: "minseo", variant: null });
  notePushRewardOpen({ kind: "notifications" });
  expect(listener).not.toHaveBeenCalled();
  expect(takePushRewardOpen()).toBeNull();

  notePushRewardOpen({ kind: "journey-map" });
  notePushRewardOpen({ kind: "journey-map", campaignId: "c1" });
  expect(listener).toHaveBeenCalledTimes(2);
  // 마지막 누름이 남습니다.
  expect(takePushRewardOpen()).toEqual({ campaignId: "c1" });
  expect(takePushRewardOpen()).toBeNull();

  off();
  notePushRewardOpen({ kind: "journey-map" });
  expect(listener).toHaveBeenCalledTimes(2);
  expect(takePushRewardOpen()).toEqual({ campaignId: null });
});

test("PR-U4. 보상 이용권은 끝 시각 전까지만 살아 있고 ticketsUnlimited가 읽는다", () => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  expect(rewardTicketPassActive(1_000_000)).toBe(false);
  expect(ticketsUnlimited()).toBe(false);
  setRewardTicketPass(2_000_000);
  expect(rewardTicketPassActive(1_999_999)).toBe(true);
  expect(rewardTicketPassActive(2_000_000)).toBe(false);
  expect(ticketsUnlimited()).toBe(true);
  vi.setSystemTime(2_000_000);
  expect(ticketsUnlimited()).toBe(false);
  vi.useRealTimers();
});
