import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import { backHandlers } from "../../lib/back-handler";
import { ChatIntroModal, LaunchCoinsModal } from "./LaunchModals";
import { launchTestIds as ids, type LaunchCastMember } from "./launch.contract";

// `ui` 계층(YL-UI1 ~ UI4): 엽전 출시 · 채팅 새 기능 모달(ADR-0140, 시안 5판).

const tapButton = (testId: string) =>
  act(() => {
    fireEvent.tap(within(screen.getByTestId(testId)).getByText(/./), {});
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
});

describe("엽전 모달", () => {
  test("YL-UI1 깬 에피소드 소급 · 출시 보너스 · 잔액이 차례로 오르고, 낭독은 한 줄로 최종 값", () => {
    render(<LaunchCoinsModal learning={370} bonus={100} balance={470} onDone={() => undefined} />);
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
    render(<LaunchCoinsModal learning={0} bonus={100} balance={100} onDone={() => undefined} />);
    expect(screen.getByTestId(ids.coins).textContent).not.toContain("From the episodes");
  });

  test("YL-UI2 Got it이면 엽전이 날아간 뒤 닫힘을 알리고, 움직임 줄이기면 곧바로 · 처음부터 최종 값", () => {
    const onDone = vi.fn<() => void>();
    render(<LaunchCoinsModal learning={0} bonus={100} balance={100} onDone={onDone} />);
    tapButton(ids.gotIt);
    expect(document.querySelectorAll(".launch-fly")).toHaveLength(6);
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    cleanup();
    const reducedDone = vi.fn<() => void>();
    render(
      <MotionProvider motion="reduced">
        <LaunchCoinsModal learning={0} bonus={100} balance={100} onDone={reducedDone} />
      </MotionProvider>,
    );
    expect(screen.getByTestId(ids.balance).textContent).toBe("100");
    tapButton(ids.gotIt);
    expect(document.querySelectorAll(".launch-fly")).toHaveLength(0);
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
