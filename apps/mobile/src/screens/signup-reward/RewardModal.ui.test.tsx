import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import { backHandlers } from "../../lib/back-handler";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { launchCoinLayerId } from "../launch/LaunchCoinFlight";
import { RewardModal } from "./SignupRewardModal";
import { signupRewardTestIds as ids } from "./signup-reward.contract";

// `ui` 계층(PR-UI1 · UI2): 푸시 캠페인 보상 모달(ADR-0175) — 가입 보상 모달 틀에 문구 · 보상만 바꿔 꽂습니다.

const copy = uiCopyEn.signupReward;
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

describe("푸시 보상 모달", () => {
  test("PR-UI1 엽전 — 위 알약 · 제목 · 보조문을 받은 대로 쓰고, 금액은 0에서 오르며 낭독은 최종 값", () => {
    render(
      <RewardModal
        tag={copy.pushTag}
        title={copy.pushTitle}
        body={copy.bodyNew}
        reward={{ kind: "coins", amount: 50 }}
        coinTargetId="chip-icon"
        onDone={() => undefined}
      />,
    );
    const modal = screen.getByTestId(ids.modal);
    expect(modal.textContent).toContain("GIFT");
    expect(modal.textContent).toContain("Your gift is here!");
    expect(modal.textContent).toContain("Use Yeopjeon to chat with the friends you meet.");
    expect(screen.getByTestId(ids.amount).textContent).toBe("+0");
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(screen.getByTestId(ids.amount).textContent).toBe("+50");
    expect(
      modal
        .querySelector('[accessibility-label="+50 Yeopjeon"]')
        ?.getAttribute("accessibility-element"),
    ).toBe("true");
    expect(screen.queryByTestId(ids.ticketStage)).toBeNull();
  });

  test("PR-UI2 무제한 티켓 — 티켓 무대 · 시간 · 낭독, Got it(또는 뒤로)이면 날지 않고 곧바로 닫힌다", () => {
    const onDone = vi.fn<() => void>();
    const onFlightStart = vi.fn<() => void>();
    render(
      <RewardModal
        tag={copy.pushTag}
        title={copy.pushTitle}
        body={uiCopyEn.tickets.unlimitedModal.activeMessage}
        reward={{ kind: "tickets", hours: 24 }}
        coinTargetId="chip-icon"
        onFlightStart={onFlightStart}
        onDone={onDone}
      />,
    );
    const modal = screen.getByTestId(ids.modal);
    expect(screen.getByTestId(ids.ticketStage)).toBeInTheDocument();
    expect(screen.getByTestId(ids.amount).textContent).toBe("24h");
    expect(
      modal
        .querySelector('[accessibility-label="Unlimited tickets, 24h"]')
        ?.getAttribute("accessibility-element"),
    ).toBe("true");
    expect(modal.textContent).toContain("Start any lesson without a ticket.");
    tapGotIt();
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onFlightStart).not.toHaveBeenCalled();
    expect(document.querySelector(`#${launchCoinLayerId}`)).toBeNull();
  });

  test("PR-UI3 무제한 티켓 · 움직임 줄이기 — 무대가 멈춘 판이고 Got it이면 닫힌다", () => {
    const onDone = vi.fn<() => void>();
    render(
      <MotionProvider motion="reduced">
        <RewardModal
          tag={copy.pushTag}
          title={copy.pushTitle}
          body="b"
          reward={{ kind: "tickets", hours: 1 }}
          coinTargetId="chip-icon"
          onDone={onDone}
        />
      </MotionProvider>,
    );
    expect(screen.getByTestId(ids.amount).textContent).toBe("1h");
    expect(
      screen.getByTestId(ids.modal).querySelector('[accessibility-label="Unlimited tickets, 1h"]'),
    ).not.toBeNull();
    tapGotIt();
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
