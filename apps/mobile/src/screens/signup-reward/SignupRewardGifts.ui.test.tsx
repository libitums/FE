import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { UiCopyContext } from "../../lib/ui-copy";
import { uiCopyVi } from "../../lib/ui-copy-vi";
import type { WelcomeGiftEnd } from "../../lib/welcome-gift-time";
import { launchCoinLayerId } from "../launch/LaunchCoinFlight";
import { SignupRewardModal } from "./SignupRewardModal";
import { signupRewardCoinSourceId, signupRewardTestIds as ids } from "./signup-reward.contract";

// `ui` 계층(WG-UI1 ~ UI5): 가입 보상 창의 선물 두 줄(ADR-0186 개정 3, 시안 GiftA) — 첫날 무제한이 적용되면 엽전 줄 아래 무제한 줄을 더하고,
// 아니면 지금 창 그대로입니다.

const tomorrow: WelcomeGiftEnd = { day: "tomorrow", hours: 21, minutes: 41 };

type Rect = { top: number; height: number; left: number; width: number };
function stubRects(table: Record<string, Rect>): void {
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
              const rect = table[selector];
              if (options.method !== "boundingClientRect" || rect === undefined) {
                options.fail?.({ code: 5 });
              } else options.success?.(rect);
            },
          }),
        }),
      }) as unknown as ReturnType<typeof lynx.createSelectorQuery>,
  );
}

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

describe("선물 두 줄", () => {
  test("WG-UI1 첫날 무제한이면 엽전 줄 · 무제한 줄 두 줄 — 금액은 0에서 오르고, 줄마다 한 덩이로 읽힌다", () => {
    render(
      <SignupRewardModal
        amount={100}
        fromGuest={false}
        unlimitedUntil={tomorrow}
        coinTargetId="chip-icon"
        onDone={() => undefined}
      />,
    );
    const modal = screen.getByTestId(ids.modal);
    expect(modal.textContent).toContain("WELCOME GIFT");
    expect(modal.textContent).toContain("You're signed up!");
    // 처음부터 가입이면 제목 아래 보조문은 없고, 엽전 줄의 짧은 설명이 그 뜻을 맡습니다.
    expect(modal.textContent).not.toContain("Use Yeopjeon to chat with the friends you meet.");
    const coins = screen.getByTestId(ids.coinsRow);
    expect(screen.getByTestId(ids.amount).textContent).toBe("+0 Yeopjeon");
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(screen.getByTestId(ids.amount).textContent).toBe("+100 Yeopjeon");
    expect(coins.textContent).toContain("Chat with the friends you meet.");
    expect(coins.getAttribute("accessibility-element")).toBe("true");
    expect(coins.getAttribute("accessibility-label")).toBe(
      "+100 Yeopjeon. Chat with the friends you meet.",
    );
    const unlimited = screen.getByTestId(ids.unlimitedRow);
    expect(unlimited.textContent).toContain("Unlimited tickets · 24h");
    expect(unlimited.textContent).toContain("Every lesson is free until tomorrow, 9:41 PM.");
    expect(unlimited.getAttribute("accessibility-element")).toBe("true");
    expect(unlimited.getAttribute("accessibility-label")).toBe(
      "Unlimited tickets · 24h. Every lesson is free until tomorrow, 9:41 PM.",
    );
    // 두 줄이 무대(큰 주머니 · 금액 줄)를 대신합니다.
    expect(modal.querySelector(".signup-reward-stage")).toBeNull();
  });

  test("WG-UI2 첫날 무제한이 아니면 지금 창 그대로 — 무대 · 금액 줄 · 보조문, 두 줄 없음", () => {
    render(
      <SignupRewardModal
        amount={100}
        fromGuest={false}
        unlimitedUntil={null}
        coinTargetId="chip-icon"
        onDone={() => undefined}
      />,
    );
    const modal = screen.getByTestId(ids.modal);
    expect(screen.queryByTestId(ids.gifts)).toBeNull();
    expect(screen.queryByTestId(ids.unlimitedRow)).toBeNull();
    expect(modal.querySelector(".signup-reward-stage")).not.toBeNull();
    expect(screen.getByTestId(ids.amount).textContent).toBe("+0");
    expect(modal.textContent).toContain("Use Yeopjeon to chat with the friends you meet.");
  });

  test("WG-UI3 손님 기록을 이어받았으면 그 문장은 제목 아래 그대로, 두 줄을 더한다", () => {
    render(
      <SignupRewardModal
        amount={100}
        fromGuest
        unlimitedUntil={{ day: "today", hours: 9, minutes: 5 }}
        coinTargetId="chip-icon"
        onDone={() => undefined}
      />,
    );
    const modal = screen.getByTestId(ids.modal);
    expect(modal.textContent).toContain("Your guest progress is saved to your account.");
    expect(screen.getByTestId(ids.coinsRow).textContent).toContain(
      "Chat with the friends you meet.",
    );
    expect(screen.getByTestId(ids.unlimitedRow).textContent).toContain(
      "Every lesson is free until today, 9:05 AM.",
    );
  });

  test("WG-UI4 두 줄에서도 Got it이면 엽전 줄의 엽전에서 칩으로 여섯이 날고 마지막에 한 번 닫는다", () => {
    stubRects({
      [`#${launchCoinLayerId}`]: { top: 0, height: 0, left: 0, width: 0 },
      [`#${signupRewardCoinSourceId}`]: { top: 400, height: 56, left: 40, width: 56 },
      "#chip-icon": { top: 60, height: 24, left: 300, width: 24 },
    });
    const onDone = vi.fn<() => void>();
    render(
      <SignupRewardModal
        amount={100}
        fromGuest={false}
        unlimitedUntil={tomorrow}
        coinTargetId="chip-icon"
        onDone={onDone}
      />,
    );
    expect(
      within(screen.getByTestId(ids.coinsRow)).queryByTestId(ids.amount)?.textContent,
    ).toBeDefined();
    act(() => {
      fireEvent.tap(within(screen.getByTestId(ids.gotIt)).getByText(/./), {});
    });
    expect(screen.getAllByTestId("launch-flight-coin")).toHaveLength(6);
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test("WG-UI5 기기 언어 문구 — 베트남어 두 줄", () => {
    render(
      <UiCopyContext.Provider value={uiCopyVi}>
        <SignupRewardModal
          amount={100}
          fromGuest={false}
          unlimitedUntil={tomorrow}
          coinTargetId="chip-icon"
          onDone={() => undefined}
        />
      </UiCopyContext.Provider>,
    );
    expect(screen.getByTestId(ids.coinsRow).textContent).toContain(
      "Trò chuyện với những người bạn đã gặp.",
    );
    const unlimited = screen.getByTestId(ids.unlimitedRow);
    expect(unlimited.textContent).toContain("Vé không giới hạn · 24 giờ");
    expect(unlimited.textContent).toContain("Mọi bài học đều miễn phí đến 21:41 ngày mai.");
  });
});
