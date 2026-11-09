import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";
import type { ReactNode } from "@lynx-js/react";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import { LessonCompleteScreen } from "./LessonCompleteScreen";
import {
  coinFlightDurationMs,
  coinFlightStaggerMs,
  lessonCompleteCoinFlightDelayMs,
} from "./lesson-complete-reward";
import { coinFlightSourceId, coinFlightTargetId } from "./LessonCompleteCoinFlight";

// `ui` 계층: 결과 화면의 엽전 보상 카드 · 머리 엽전 칩 · 엽전이 하나씩 칩으로 날아가 숫자가 차는 재생(ADR-0116).
// 곡선 · 실제 자리는 기기 e2e가 봅니다. 여기서는 언제 무엇이 서고 칩이 몇을 보이는가입니다. 자리는 이 파일이 대역으로 답합니다.

type Rect = { top: number; height: number; left: number; width: number };

function stubRects(table: Record<string, Rect> | null): void {
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
              const rect = table?.[selector];
              if (options.method !== "boundingClientRect" || rect === undefined) {
                options.fail?.({ code: 5 });
              } else options.success?.(rect);
            },
          }),
        }),
      }) as unknown as ReturnType<typeof lynx.createSelectorQuery>,
  );
}

const placed: Record<string, Rect> = {
  "#lesson-complete-coin-layer": { top: 0, height: 0, left: 0, width: 0 },
  [`#${coinFlightSourceId}`]: { top: 500, height: 48, left: 40, width: 48 },
  [`#${coinFlightTargetId}`]: { top: 60, height: 24, left: 300, width: 24 },
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (_args: unknown, callback: (result: unknown) => void) =>
        callback("announced"),
    },
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function screenWith(overrides: Partial<Parameters<typeof LessonCompleteScreen>[0]> = {}) {
  return (
    <LessonCompleteScreen
      results={["correct"]}
      skippedCount={0}
      verdict="passed"
      streakDays={4}
      trophyCount={2}
      reward={{ coinAmount: 10, grade: "AMAZING" }}
      coinCount={30}
      onExit={vi.fn()}
      {...overrides}
    />
  );
}
const reduced = (element: ReactNode) => <MotionProvider motion="reduced">{element}</MotionProvider>;
const chip = () => screen.getByTestId("lesson-complete-screen-coins-chip");
const flyingCoins = () => screen.queryAllByTestId("lesson-complete-coin-flight-coin");
const flightStart = lessonCompleteCoinFlightDelayMs("expressive");
const landingOf = (index: number) =>
  flightStart + index * coinFlightStaggerMs + coinFlightDurationMs;

test("LC-C1. 처음 통과면 엽전 카드가 서고, 머리 엽전 칩은 보상 전 값에서 시작하며 이름은 보유량이다", () => {
  stubRects(placed);
  render(screenWith());

  const card = screen.getByTestId("lesson-complete-screen-reward-coins");
  expect(card).toHaveTextContent("+ 10 REWARD");
  expect(card).toHaveAttribute("accessibility-label", "Reward, 10 coins");
  expect(chip()).toHaveTextContent("20");
  expect(chip()).toHaveAttribute("accessibility-label", "30 coins");
  expect(chip()).not.toHaveAttribute("accessibility-traits");
});

test("LC-C2. 카드가 다 올라온 뒤 엽전 10개가 날고, 하나 닿을 때마다 칩이 1씩 올라 보유량에 닿는다", () => {
  stubRects(placed);
  render(screenWith());
  expect(flyingCoins()).toHaveLength(0);
  expect(flightStart).toBeGreaterThan(0);
  expect(coinFlightStaggerMs).toBeGreaterThan(0);
  expect(coinFlightDurationMs).toBeGreaterThan(0);

  act(() => {
    vi.advanceTimersByTime(flightStart);
  });
  expect(flyingCoins()).toHaveLength(10);
  expect(screen.getByTestId("lesson-complete-coin-flight")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );
  expect(chip()).toHaveTextContent("20");

  act(() => {
    vi.advanceTimersByTime(landingOf(0) - flightStart);
  });
  expect(chip()).toHaveTextContent("21");
  expect(flyingCoins()).toHaveLength(9);

  act(() => {
    vi.advanceTimersByTime(landingOf(9) - landingOf(0));
  });
  expect(chip()).toHaveTextContent("30");
  expect(flyingCoins()).toHaveLength(0);
});

test("LC-C3. 자리를 재지 못하면 날지 않고 칩이 바로 보유량을 보인다", () => {
  stubRects(null);
  render(screenWith());

  act(() => {
    vi.advanceTimersByTime(flightStart);
  });
  expect(flyingCoins()).toHaveLength(0);
  expect(chip()).toHaveTextContent("30");
});

test("LC-C4. 움직임 줄이기에서는 날지 않고 칩 숫자만 보유량으로 바뀐다", () => {
  stubRects(placed);
  render(reduced(screenWith()));

  act(() => {
    vi.advanceTimersByTime(landingOf(9));
  });
  expect(screen.queryByTestId("lesson-complete-coin-flight")).toBeNull();
  expect(chip()).toHaveTextContent("30");
});

test("LC-C5. 다시 하기(보상 0)면 엽전 카드가 없고 칩은 움직이지 않는다 — 등급 카드는 그대로", () => {
  stubRects(placed);
  render(screenWith({ reward: { coinAmount: 0, grade: "AMAZING" } }));

  expect(screen.queryByTestId("lesson-complete-screen-reward-coins")).toBeNull();
  expect(screen.getByTestId("lesson-complete-screen-reward-grade")).toBeInTheDocument();
  expect(chip()).toHaveTextContent("30");
  act(() => {
    vi.advanceTimersByTime(landingOf(9));
  });
  expect(screen.queryByTestId("lesson-complete-coin-flight")).toBeNull();
  expect(chip()).toHaveTextContent("30");
});

test("LC-C6. 미통과면 엽전 카드도 날기도 없고 칩은 보유량 그대로다", () => {
  stubRects(placed);
  render(screenWith({ verdict: "failed", results: ["incorrect"] }));

  expect(screen.queryByTestId("lesson-complete-screen-reward-coins")).toBeNull();
  act(() => {
    vi.advanceTimersByTime(landingOf(9));
  });
  expect(screen.queryByTestId("lesson-complete-coin-flight")).toBeNull();
  expect(chip()).toHaveTextContent("30");
});

test("LC-C7. 날던 중에 화면이 닫혀도 타이머를 하나씩 지운다 — Lynx clearTimeout은 인자가 꼭 하나다", () => {
  stubRects(placed);
  const original = globalThis.clearTimeout;
  vi.spyOn(globalThis, "clearTimeout").mockImplementation((...args: unknown[]) => {
    if (args.length !== 1) throw new TypeError("clear timeout arg count must be 1");
    original(args[0] as Parameters<typeof clearTimeout>[0]);
  });
  const { unmount } = render(screenWith());
  act(() => {
    vi.advanceTimersByTime(flightStart);
  });
  expect(flyingCoins()).toHaveLength(10);

  expect(() => unmount()).not.toThrow();
});
