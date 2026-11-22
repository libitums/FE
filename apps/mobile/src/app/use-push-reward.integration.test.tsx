import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import type { PushRewardClaim } from "../lib/push-reward-api";
import { notePushRewardOpen, takePushRewardOpen } from "../lib/push-reward-open";
import { rewardTicketPassActive, setRewardTicketPass } from "../lib/reward-ticket-pass";
import { ticketsUnlimited } from "../lib/unlimited-tickets";
import { emptyPushRewardRecord, type PushRewardRecord } from "./push-reward-record";
import type { ScreenWiring } from "./screen-wiring";
import { usePushReward } from "./use-push-reward";

// `integration` 계층(PR-I8 ~ I12): 보상 훅 ↔ 이용권 모듈 값 ↔ 그 값을 먼저 읽는 티켓 결선. 셸처럼 읽는 쪽이 훅보다 앞에 섭니다.
// 대역은 claim · 기기 저장소뿐입니다.

const HOUR = 3_600_000;

let stored: PushRewardRecord;
let asked: string[];
let answers: ((result: PushRewardClaim | null) => void)[];
const store = {
  read: () => stored,
  write: (next: PushRewardRecord) => void (stored = next),
};

function Shell({ signedIn }: { readonly signedIn: boolean }) {
  const unlimited = ticketsUnlimited();
  usePushReward({
    wiring: {
      accountState: signedIn ? "signed-in" : "guest",
      messengerChat: { eventSink: null },
    } as unknown as ScreenWiring,
    idle: false,
    guideOn: false,
    chip: () => 0,
    acceptBalance: () => undefined,
    store,
    claim: (id) => {
      asked.push(id);
      return new Promise<PushRewardClaim | null>((resolve) => answers.push(resolve));
    },
  });
  return <text data-testid="unlimited">{String(unlimited)}</text>;
}

const shown = () => screen.getByTestId("unlimited").textContent;
const tap = (campaignId: string) =>
  act(() => notePushRewardOpen({ kind: "journey-map", campaignId }));
const answer = (index: number, result: PushRewardClaim | null) =>
  act(async () => {
    answers[index]?.(result);
    await Promise.resolve();
  });
const withPass = (): PushRewardRecord => ({
  modal: null,
  pass: { startedAtMs: Date.now(), untilMs: Date.now() + HOUR },
});
const tickets = (): PushRewardClaim => ({
  status: "granted",
  campaignId: "c1",
  reward: { kind: "tickets", hours: 1, untilMs: Date.now() + HOUR },
  balance: null,
});

beforeEach(() => {
  stored = emptyPushRewardRecord;
  asked = [];
  answers = [];
});
afterEach(() => {
  cleanup();
  takePushRewardOpen();
  setRewardTicketPass(0);
  vi.restoreAllMocks();
});

test("PR-I8 다시 그리기는 이용권 모듈 값을 쓰지 않는다 — 렌더는 읽기만", async () => {
  const view = render(<Shell signedIn />);
  await act(async () => Promise.resolve());
  const until = Date.now() + HOUR;
  setRewardTicketPass(until);
  view.rerender(<Shell signedIn />);
  expect(rewardTicketPassActive(Date.now())).toBe(true);
});

test("PR-I9 저장된 이용권 · 받은 이용권은 훅보다 앞에서 읽는 티켓 결선의 그림에 닿는다", async () => {
  render(<Shell signedIn />);
  await act(async () => Promise.resolve());
  expect(shown()).toBe("false");
  tap("c1");
  await answer(0, tickets());
  expect(shown()).toBe("true");

  cleanup();
  render(<Shell signedIn />);
  await act(async () => Promise.resolve());
  expect(shown()).toBe("true");
});

test("PR-I10 로그아웃 · 내려감이면 이용권 값이 남지 않는다", async () => {
  stored = withPass();
  const view = render(<Shell signedIn />);
  await act(async () => Promise.resolve());
  expect(shown()).toBe("true");
  view.rerender(<Shell signedIn={false} />);
  await act(async () => Promise.resolve());
  expect(rewardTicketPassActive(Date.now())).toBe(false);
  expect(shown()).toBe("false");

  view.rerender(<Shell signedIn />);
  await act(async () => Promise.resolve());
  expect(shown()).toBe("true");
  cleanup();
  expect(rewardTicketPassActive(Date.now())).toBe(false);
});

test("PR-I11 응답 전에 계정이 바뀌면 그 보상을 새 상태에 적지 않는다", async () => {
  const view = render(<Shell signedIn />);
  await act(async () => Promise.resolve());
  tap("c1");
  view.rerender(<Shell signedIn={false} />);
  await answer(0, tickets());
  expect(stored).toBe(emptyPushRewardRecord);
  expect(rewardTicketPassActive(Date.now())).toBe(false);
});

test("PR-I12 묻는 중에 누른 다른 보상 알림은 응답 뒤에 묻고, 같은 알림은 두 번 묻지 않는다", async () => {
  render(<Shell signedIn />);
  await act(async () => Promise.resolve());
  tap("c1");
  tap("c1");
  await answer(0, null);
  expect(asked).toEqual(["c1"]);

  tap("c2");
  tap("c3");
  await answer(1, null);
  expect(asked).toEqual(["c1", "c2", "c3"]);
});

test("PR-I14 세션이 내려간 뒤(로그아웃 = key 재시작) 온 응답은 저장 · 이용권 · 다음 누름에 손대지 않는다", async () => {
  render(<Shell signedIn />);
  await act(async () => Promise.resolve());
  tap("c1");
  tap("c2");
  cleanup();
  await answer(0, tickets());
  expect(stored).toBe(emptyPushRewardRecord);
  expect(rewardTicketPassActive(Date.now())).toBe(false);
  expect(asked).toEqual(["c1"]);
  expect(takePushRewardOpen()).toEqual({ campaignId: "c2" });
});
