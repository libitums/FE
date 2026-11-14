import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import { backHandlers } from "../../lib/back-handler";
import { launchCoinLayerId, launchCoinSourceId } from "./LaunchCoinFlight";
import { ChatIntroModal, LaunchCoinsModal } from "./LaunchModals";
import { launchTestIds as ids, type LaunchCastMember } from "./launch.contract";

// `ui` 계층(YL-UI1 ~ UI4): 엽전 출시 · 채팅 새 기능 모달(ADR-0140, 시안 5판).

const tapButton = (testId: string) =>
  act(() => {
    fireEvent.tap(within(screen.getByTestId(testId)).getByText(/./), {});
  });

type Rect = { top: number; height: number; left: number; width: number };

/** 자리 대역 — 결과 화면 엽전 날기 테스트와 같은 꼴(`LessonCompleteScreen.coins.ui.test.tsx`). */
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
  [`#${launchCoinLayerId}`]: { top: 0, height: 0, left: 0, width: 0 },
  [`#${launchCoinSourceId}`]: { top: 500, height: 20, left: 200, width: 20 },
  "#chip-icon": { top: 60, height: 24, left: 300, width: 24 },
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  while (backHandlers.runTop()) {
    /* 남은 등록 비움 */
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("엽전 모달", () => {
  test("YL-UI1 깬 에피소드 소급 · 출시 보너스 · 잔액이 차례로 오르고, 낭독은 한 줄로 최종 값", () => {
    render(
      <LaunchCoinsModal
        learning={370}
        bonus={100}
        balance={470}
        coinTargetId="chip-icon"
        onDone={() => undefined}
      />,
    );
    const modal = screen.getByTestId(ids.coins);
    expect(modal.textContent).toContain("From the episodes you've cleared");
    expect(modal.textContent).toContain("Launch bonus");
    expect(screen.getByTestId(ids.balance).textContent).toBe("0");
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(screen.getByTestId(ids.balance).textContent).toBe("470");
    expect(modal.textContent).toContain("+370");
    const list = modal.querySelector('[accessibility-element="true"]');
    expect(list?.getAttribute("accessibility-label")).toBe(
      "From the episodes you've cleared +370, Launch bonus +100, Your balance 470",
    );
  });

  test("YL-UI1 깬 게 없으면 보너스 줄만", () => {
    render(
      <LaunchCoinsModal
        learning={0}
        bonus={100}
        balance={100}
        coinTargetId="chip-icon"
        onDone={() => undefined}
      />,
    );
    expect(screen.getByTestId(ids.coins).textContent).not.toContain("From the episodes");
  });

  test("YL-UI2 Got it이면 잔액 엽전 자리에서 칩 자리로 여섯이 날고, 하나 닿을 때마다 알린 뒤 마지막에 닫는다", () => {
    stubRects(placed);
    const landed: number[] = [];
    const onDone = vi.fn<() => void>();
    render(
      <LaunchCoinsModal
        learning={0}
        bonus={100}
        balance={100}
        coinTargetId="chip-icon"
        onCoinLanded={(n, of) => landed.push(n / of)}
        onDone={onDone}
      />,
    );
    tapButton(ids.gotIt);
    expect(screen.getAllByTestId("launch-flight-coin")).toHaveLength(6);
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(landed).toEqual([1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1]);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(screen.queryAllByTestId("launch-flight-coin")).toHaveLength(0);
  });

  test("YL-UI2 자리를 못 재면 날지 않고 한꺼번에 닿아 닫는다", () => {
    stubRects(null);
    const onDone = vi.fn<() => void>();
    render(
      <LaunchCoinsModal
        learning={0}
        bonus={100}
        balance={100}
        coinTargetId="chip-icon"
        onDone={onDone}
      />,
    );
    tapButton(ids.gotIt);
    expect(screen.queryAllByTestId("launch-flight-coin")).toHaveLength(0);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test("YL-UI2 측정이 성공도 실패도 알리지 않아도(Android) 안전 타이머가 다 닿은 것으로 쳐 한 번만 닫는다", () => {
    vi.spyOn(lynx, "createSelectorQuery").mockImplementation(
      () =>
        ({
          select: () => ({ invoke: () => ({ exec: () => undefined }) }),
        }) as unknown as ReturnType<typeof lynx.createSelectorQuery>,
    );
    const onDone = vi.fn<() => void>();
    render(
      <LaunchCoinsModal
        learning={0}
        bonus={100}
        balance={100}
        coinTargetId="chip-icon"
        onDone={onDone}
      />,
    );
    tapButton(ids.gotIt);
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test("YL-UI2 움직임 줄이기면 처음부터 최종 값이고, Got it이면 날지 않고 곧바로 닫는다", () => {
    const reducedDone = vi.fn<() => void>();
    render(
      <MotionProvider motion="reduced">
        <LaunchCoinsModal
          learning={0}
          bonus={100}
          balance={100}
          coinTargetId="chip-icon"
          onDone={reducedDone}
        />
      </MotionProvider>,
    );
    expect(screen.getByTestId(ids.balance).textContent).toBe("100");
    tapButton(ids.gotIt);
    expect(screen.queryAllByTestId("launch-flight-coin")).toHaveLength(0);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(reducedDone).toHaveBeenCalledTimes(1);
  });
});

const cast: LaunchCastMember[] = [
  { name: "덕수쌤", avatarUrl: null, met: true, episode: null },
  { name: "정윤경", avatarUrl: null, met: true, episode: 2 },
  { name: "미나", avatarUrl: null, met: false, episode: 3 },
];

describe("채팅 모달", () => {
  test("YL-UI3 만난 · 못 만난 인물 줄과 「n of N friends met」, 못 만난 인물은 에피소드 번호", () => {
    render(<ChatIntroModal cast={cast} onLater={() => undefined} onStart={() => undefined} />);
    const modal = screen.getByTestId(ids.chat);
    expect(modal.textContent).toContain("2 of 3 friends met");
    expect(screen.getByTestId(ids.person(0)).getAttribute("data-met")).toBe("true");
    expect(screen.getByTestId(ids.person(2)).getAttribute("data-met")).toBe("false");
    expect(screen.getByTestId(ids.person(2)).textContent).toContain("Ep 3");
    expect(screen.getByTestId(ids.person(1)).textContent).toContain("Met");
  });

  test("YL-UI4 Start chatting · Later · 뒤로가기(= Later)", () => {
    const onLater = vi.fn<() => void>();
    const onStart = vi.fn<() => void>();
    render(<ChatIntroModal cast={cast} onLater={onLater} onStart={onStart} />);
    tapButton(ids.start);
    expect(onStart).toHaveBeenCalledTimes(1);
    tapButton(ids.later);
    expect(onLater).toHaveBeenCalledTimes(1);
    act(() => {
      backHandlers.runTop();
    });
    expect(onLater).toHaveBeenCalledTimes(2);
  });
});
