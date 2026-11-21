import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import { backHandlers } from "../../lib/back-handler";
import { launchCoinLayerId } from "../launch/LaunchCoinFlight";
import { SignupRewardCard } from "./SignupRewardCard";
import { SignupRewardModal } from "./SignupRewardModal";
import { signupRewardCoinSourceId, signupRewardTestIds as ids } from "./signup-reward.contract";

// `ui` 계층(SR-UI1 ~ UI6): 가입 권유 카드 · 가입 보상 모달(ADR-0174, 시안 Main · Reward · Wallet).

type Rect = { top: number; height: number; left: number; width: number };

/** 자리 대역 — 엽전 출시 모달 테스트와 같은 꼴(`LaunchModals.ui.test.tsx`). */
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
  [`#${signupRewardCoinSourceId}`]: { top: 420, height: 32, left: 150, width: 32 },
  "#chip-icon": { top: 60, height: 24, left: 300, width: 24 },
};

const tapGotIt = () =>
  act(() => {
    fireEvent.tap(within(screen.getByTestId(ids.gotIt)).getByText(/./), {});
  });

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

describe("가입 권유 카드", () => {
  test("SR-UI1 제목 · 보조문 · Sign up이 한 단추로 읽히고, 누르면 가입으로 간다", () => {
    const onSignUp = vi.fn<() => void>();
    render(<SignupRewardCard amount={100} bottom={80} onSignUp={onSignUp} />);
    const card = screen.getByTestId(ids.card);
    expect(card.textContent).toContain("Get 100 Yeopjeon free");
    expect(card.textContent).toContain("Sign up — your progress comes with you.");
    expect(card.getAttribute("accessibility-element")).toBe("true");
    expect(card.getAttribute("accessibility-traits")).toBe("button");
    expect(card.getAttribute("flatten")).toBe("false");
    expect(card.getAttribute("accessibility-label")).toBe(
      "Get 100 Yeopjeon free. Sign up — your progress comes with you.",
    );
    expect(card.getAttribute("style")).toContain("bottom: 80px");
    act(() => {
      fireEvent.tap(card, {});
    });
    expect(onSignUp).toHaveBeenCalledTimes(1);
  });

  test("SR-UI2 주머니는 가끔 튀고, 움직임 줄이기면 멈춘다", () => {
    render(<SignupRewardCard amount={100} bottom={80} onSignUp={() => undefined} />);
    expect(screen.getByTestId(ids.card).getAttribute("class")).not.toContain("signup-still");
    cleanup();
    render(
      <MotionProvider motion="reduced">
        <SignupRewardCard amount={100} bottom={80} onSignUp={() => undefined} />
      </MotionProvider>,
    );
    expect(screen.getByTestId(ids.card).getAttribute("class")).toContain("signup-still");
  });
});

describe("가입 보상 모달", () => {
  test("SR-UI3 금액이 0에서 100으로 오르고, 낭독은 최종 값 · 손님에서 왔으면 진행 저장 문구", () => {
    render(
      <SignupRewardModal
        amount={100}
        fromGuest
        coinTargetId="chip-icon"
        onDone={() => undefined}
      />,
    );
    const modal = screen.getByTestId(ids.modal);
    expect(modal.textContent).toContain("WELCOME GIFT");
    expect(modal.textContent).toContain("You're signed up!");
    expect(modal.textContent).toContain("Your guest progress is saved to your account.");
    expect(screen.getByTestId(ids.amount).textContent).toBe("+0");
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(screen.getByTestId(ids.amount).textContent).toBe("+100");
    const line = modal.querySelector('[accessibility-label="+100 Yeopjeon"]');
    expect(line).not.toBeNull();
    cleanup();
    render(
      <SignupRewardModal
        amount={100}
        fromGuest={false}
        coinTargetId="chip-icon"
        onDone={() => undefined}
      />,
    );
    expect(screen.getByTestId(ids.modal).textContent).toContain(
      "Use Yeopjeon to chat with the friends you meet.",
    );
  });

  test("SR-UI4 Got it이면 금액 엽전 자리에서 칩 자리로 여섯이 날고, 닿을 때마다 알린 뒤 마지막에 한 번 닫는다", () => {
    stubRects(placed);
    const landed: number[] = [];
    const onFlightStart = vi.fn<() => void>();
    const onDone = vi.fn<() => void>();
    render(
      <SignupRewardModal
        amount={100}
        fromGuest
        coinTargetId="chip-icon"
        onCoinLanded={(n, of) => landed.push(n / of)}
        onFlightStart={onFlightStart}
        onDone={onDone}
      />,
    );
    tapGotIt();
    expect(onFlightStart).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId("launch-flight-coin")).toHaveLength(6);
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(landed).toEqual([1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1]);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test("SR-UI5 움직임 줄이기면 처음부터 +100, Got it이면 날지 않고 곧바로 닫는다", () => {
    const onFlightStart = vi.fn<() => void>();
    const onDone = vi.fn<() => void>();
    render(
      <MotionProvider motion="reduced">
        <SignupRewardModal
          amount={100}
          fromGuest
          coinTargetId="chip-icon"
          onFlightStart={onFlightStart}
          onDone={onDone}
        />
      </MotionProvider>,
    );
    expect(screen.getByTestId(ids.amount).textContent).toBe("+100");
    tapGotIt();
    expect(screen.queryAllByTestId("launch-flight-coin")).toHaveLength(0);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(onFlightStart).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test("SR-UI6 시스템 뒤로가기는 Got it과 같다", () => {
    stubRects(null);
    const onDone = vi.fn<() => void>();
    render(<SignupRewardModal amount={100} fromGuest coinTargetId="chip-icon" onDone={onDone} />);
    act(() => {
      backHandlers.runTop();
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
