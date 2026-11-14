import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";
import type { ReactNode } from "@lynx-js/react";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import type { StreakRewardClaim } from "../../lib/streak-reward-api";
import { JourneyStatModal } from "./JourneyStatModal";
import { streakTrack } from "./journey-stat";
import {
  streakRewardCoinSourceId,
  streakRewardFlightLayerId,
  streakRewardTestIds as ids,
  type StreakRewardWiring,
} from "./streak-reward.contract";

// `ui` 계층(SR-UI1 ~ UI7): 연속 학습 모달의 엽전 보상(ADR-0143) — 꼬리표 · 큰 목표 줄 · 문구 · 보상 카드 · Collect.
// 서버 지급은 결선(`claim`)의 경계라 대역입니다.

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

type Rect = { top: number; height: number; left: number; width: number };

/** 자리 대역 — 엽전 출시 모달 날기 테스트와 같은 꼴. `null`이면 못 잼, `"silent"`면 답하지 않음(Android). */
function stubRects(table: Record<string, Rect> | null | "silent"): void {
  vi.spyOn(lynx, "createSelectorQuery").mockImplementation(
    () =>
      ({
        select: (selector: string) => ({
          invoke: (options: {
            method: string;
            success?: (res: unknown) => void;
            fail?: (res: unknown) => void;
          }) => ({
            exec: () => {
              if (table === "silent") return;
              const rect = table?.[selector];
              if (rect === undefined) options.fail?.({ code: 5 });
              else options.success?.(rect);
            },
          }),
        }),
      }) as unknown as ReturnType<typeof lynx.createSelectorQuery>,
  );
}

const placed: Record<string, Rect> = {
  [`#${streakRewardFlightLayerId}`]: { top: 0, height: 0, left: 0, width: 0 },
  [`#${streakRewardCoinSourceId}`]: { top: 500, height: 32, left: 150, width: 32 },
  "#top-bar-coins-icon": { top: 60, height: 24, left: 300, width: 24 },
};

const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function wiring(
  claim: StreakRewardClaim | null = null,
  collected = false,
): StreakRewardWiring & { calls: Record<string, unknown[][]> } {
  const calls: Record<string, unknown[][]> = {
    claim: [],
    onClaimed: [],
    onCoinLanded: [],
    onSettled: [],
  };
  return {
    calls,
    collected: () => collected,
    claim: async () => {
      calls.claim!.push([]);
      return claim;
    },
    onClaimed: (...args) => void calls.onClaimed!.push(args),
    onCoinLanded: (...args) => void calls.onCoinLanded!.push(args),
    onSettled: () => void calls.onSettled!.push([]),
    coinTargetId: "top-bar-coins-icon",
  };
}

const modal = (
  days: number,
  reward: StreakRewardWiring | undefined,
  onClose: () => void = vi.fn(),
  kind: "streak" | "trophy" = "streak",
) => (
  <JourneyStatModal
    kind={kind}
    value={days}
    track={streakTrack(days, 3, weekdays)}
    onClose={onClose}
    {...(reward === undefined ? {} : { reward })}
  />
);
const reduced = (element: ReactNode) => <MotionProvider motion="reduced">{element}</MotionProvider>;
const present = (testId: string) => screen.queryByTestId(testId) !== null;
const granted = { days: 7, amount: 40, granted: true, balance: 90 };
const tapCollect = () =>
  act(() => {
    fireEvent.tap(within(screen.getByTestId(ids.collect)).getByTestId("ui-lynx-button"), {});
  });
const flush = () => act(async () => new Promise<void>((resolve) => queueMicrotask(resolve)));

test("SR-UI1 평범한 날(5일): 3일 칸은 받은 꼬리표, 7일 칸은 +40, 14일 목표 줄, 「2 more days」 문구, Continue", () => {
  render(modal(5, wiring()));
  for (const index of [0, 1, 3, 4, 5]) expect(present(ids.tag(index))).toBe(false);
  expect(screen.getByTestId(ids.tag(2))).toHaveAttribute("data-kind", "earned");
  expect(screen.getByTestId(ids.tag(2))).toHaveTextContent("+15");
  expect(screen.getByTestId(ids.tag(6))).toHaveAttribute("data-kind", "upcoming");
  expect(screen.getByTestId(ids.tag(6))).toHaveTextContent("+40");
  expect(screen.getByTestId(ids.goal)).toHaveTextContent("14-day goal");
  expect(screen.getByTestId(ids.goal)).toHaveTextContent("+70");
  expect(screen.getByTestId(ids.goalFill).style.width).toBe(`${(5 / 14) * 100}%`);
  const message = screen.getByTestId("journey-stat-modal-message");
  expect(message).toHaveTextContent("Amazing work!");
  expect(message).toHaveTextContent("2 more days");
  expect(message).toHaveTextContent("to +40 Yeopjeon.");
  expect(present("journey-stat-modal-continue")).toBe(true);
  expect(present(ids.collect)).toBe(false);
  expect(present(ids.card)).toBe(false);
});

test("SR-UI2 보상 날(7일, 안 받음): 카드 +40 · 「7-day streak reward」 · Collect, 문구 · 목표 줄 · Continue 없음", () => {
  render(modal(7, wiring()));
  expect(screen.getByTestId(ids.card)).toHaveTextContent("+40");
  expect(screen.getByTestId(ids.card)).toHaveTextContent("7-day streak reward");
  expect(screen.getByTestId(ids.collect)).toHaveTextContent("Collect");
  expect(present("journey-stat-modal-continue")).toBe(false);
  expect(present("journey-stat-modal-message")).toBe(false);
  expect(present(ids.goal)).toBe(false);
  expect(present(ids.tag(6))).toBe(false);
});

test("SR-UI3 Collect: 지급 한 번(두 번째 탭 무시) → 모달이 걷히고 엽전이 날아간 뒤 닫힌다", async () => {
  vi.useFakeTimers();
  stubRects(placed);
  const reward = wiring(granted);
  const onClose = vi.fn();
  render(modal(7, reward, onClose));
  tapCollect();
  tapCollect();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(reward.calls.claim).toHaveLength(1);
  expect(reward.calls.onClaimed).toEqual([[granted, 7]]);
  expect(screen.getByTestId("journey-stat-modal-streak").getAttribute("class")).toContain(
    "journey-stat-modal-out",
  );
  expect(present(ids.flight)).toBe(true);
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3_000);
  });
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(reward.calls.onSettled).toHaveLength(1);
  expect(reward.calls.onCoinLanded.at(-1)).toEqual([6, 6]);
});

test("SR-UI3b 측정이 답하지 않아도(Android) 안전 타이머가 끝을 내 한 번만 닫고, 못 재면 곧바로 닫는다", async () => {
  vi.useFakeTimers();
  stubRects("silent");
  const reward = wiring(granted);
  const onClose = vi.fn();
  render(modal(7, reward, onClose));
  tapCollect();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5_000);
  });
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(reward.calls.onSettled).toHaveLength(1);
  cleanup();

  stubRects(null);
  const failed = vi.fn();
  render(modal(7, wiring(granted), failed));
  tapCollect();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(failed).toHaveBeenCalledTimes(1);
});

test("SR-UI4 지급 실패(null) · 이미 받음(granted false)이면 날지 않고 곧바로 닫힌다", async () => {
  for (const claim of [null, { ...granted, granted: false }]) {
    const reward = wiring(claim);
    const onClose = vi.fn();
    render(modal(7, reward, onClose));
    tapCollect();
    await flush();
    await flush();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(present(ids.flight)).toBe(false);
    expect(reward.calls.onClaimed).toEqual([[claim, 7]]);
    expect(reward.calls.onSettled).toHaveLength(1);
    cleanup();
  }
});

test("SR-UI5 움직임 줄이기: 등장 움직임 없음, 지급돼도 날지 않고 닫힌다", async () => {
  render(reduced(modal(5, wiring())));
  expect(document.querySelectorAll(".journey-stat-modal-tag-enter")).toHaveLength(0);
  expect(document.querySelectorAll(".journey-stat-modal-goal-fill-enter")).toHaveLength(0);
  expect(document.querySelectorAll(".journey-stat-modal-message-enter")).toHaveLength(0);
  cleanup();
  render(modal(5, wiring()));
  expect(document.querySelectorAll(".journey-stat-modal-tag-enter")).toHaveLength(2);
  expect(document.querySelectorAll(".journey-stat-modal-goal-fill-enter")).toHaveLength(1);
  expect(document.querySelectorAll(".journey-stat-modal-message-enter")).toHaveLength(1);
  cleanup();

  const onClose = vi.fn();
  render(reduced(modal(7, wiring(granted), onClose)));
  expect(document.querySelectorAll(".journey-stat-modal-card-enter")).toHaveLength(0);
  tapCollect();
  await flush();
  await flush();
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(present(ids.flight)).toBe(false);
});

test("SR-UI6 결선이 없거나(손님) 트로피 모달이면 꼬리표 · 목표 · 카드가 없다", () => {
  render(modal(7, undefined));
  expect(present(ids.tag(2))).toBe(false);
  expect(present(ids.card)).toBe(false);
  expect(present(ids.goal)).toBe(false);
  expect(present("journey-stat-modal-continue")).toBe(true);
  expect(screen.getByTestId("journey-stat-modal-message")).toHaveTextContent("Come back tomorrow");
  cleanup();
  render(modal(7, wiring(), vi.fn(), "trophy"));
  expect(present(ids.tag(2))).toBe(false);
  expect(present(ids.card)).toBe(false);
  expect(present(ids.goal)).toBe(false);
});

test("SR-UI7 낭독: 카드 · 목표 줄은 한 요소 라벨, 꼬리표는 숨김", () => {
  render(modal(7, wiring()));
  expect(screen.getByTestId(ids.card)).toHaveAttribute(
    "accessibility-label",
    "+40 Yeopjeon, 7-day streak reward",
  );
  expect(screen.getByTestId(ids.card)).toHaveAttribute("accessibility-element", "true");
  expect(screen.getByTestId(ids.tag(2))).toHaveAttribute("accessibility-elements-hidden", "true");
  cleanup();
  render(modal(5, wiring()));
  expect(screen.getByTestId(ids.goal)).toHaveAttribute(
    "accessibility-label",
    "14-day goal, +70 Yeopjeon",
  );
});

test("SR-UI8 이미 받은 날(7일)은 오늘 칸이 초록 꼬리표이고 Continue — 지급을 부르지 않는다", () => {
  const reward = wiring(granted, true);
  render(modal(7, reward));
  expect(screen.getByTestId(ids.tag(6))).toHaveAttribute("data-kind", "earned");
  expect(present(ids.card)).toBe(false);
  expect(present(ids.collect)).toBe(false);
  expect(present("journey-stat-modal-continue")).toBe(true);
  expect(screen.getByTestId(ids.goal)).toHaveTextContent("14-day goal");
});
