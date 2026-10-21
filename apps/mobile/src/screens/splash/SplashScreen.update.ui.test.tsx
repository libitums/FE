import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { MotionProvider } from "@libitums/ui-lynx/motion";
import type { ReactNode } from "@lynx-js/react";

import { entrySplashDurationMs, splashUpdateWaitMs } from "../../lib/entry-flow";
import { SplashScreen } from "./SplashScreen";
import { plainSplashUpdate, SplashUpdateContext } from "./splash-update-context";
import type { SplashUpdatePort, SplashUpdateView } from "./splash.contract";

// `ui` 계층: 포트 대역을 Provider로 감싸 게이지 표시와 「로고 끝 + 대기」 규칙을 봅니다.
// 타이머는 모두 SplashScreen 안에 있고, 포트 함수는 vi.fn()으로 호출 횟수 · 순서만 봅니다.

function gauge(percent: number, hold: "wait" | "release"): SplashUpdateView {
  return { kind: "gauge", percent, hold };
}

function makePort(view: SplashUpdateView, calls: string[] = []) {
  const logoFinished = vi.fn(() => void calls.push("logoFinished"));
  const close = vi.fn(() => void calls.push("close"));
  const port: SplashUpdatePort = { view, logoFinished, close };
  return { port, logoFinished, close };
}

function withPort(port: SplashUpdatePort, node: ReactNode): ReactNode {
  return <SplashUpdateContext.Provider value={port}>{node}</SplashUpdateContext.Provider>;
}

function endLogo(): void {
  fireEvent(
    screen.getByTestId("splash-screen-logo"),
    new window.Event("bindEvent:finalloopcomplete"),
  );
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

let announced: string[] = [];

describe("SplashScreen 갱신 게이지", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    announced = [];
    vi.stubGlobal("NativeModules", {
      LynxAccessibilityModule: {
        accessibilityAnnounce: (args: { content: string }) => void announced.push(args.content),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("[SPU1] Provider가 없으면 게이지가 없고, 로고는 .splash-screen-mark 안이며, 로고 끝에 onTimeout이 1회다", () => {
    const onTimeout = vi.fn();
    render(<SplashScreen onTimeout={onTimeout} />);

    expect(screen.queryByTestId("splash-update")).toBeNull();
    expect(screen.getByTestId("splash-screen-logo").parentElement?.getAttribute("class")).toContain(
      "splash-screen-mark",
    );
    endLogo();
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("[SPU2] gauge(40, wait): 라벨 · 폭 · 접근성 속성이 서고, 0이면 채움이 없고, 조작 단위는 0건이다", () => {
    const { port } = makePort(gauge(40, "wait"));
    const { container, rerender } = render(withPort(port, <SplashScreen onTimeout={vi.fn()} />));

    const root = screen.getByTestId("splash-update");
    expect(root).toHaveAttribute("data-percent", "40");
    expect(root).toHaveAttribute("accessibility-element", "true");
    expect(root).toHaveAttribute("accessibility-label", "Updating episodes, 40%");
    expect(screen.getByTestId("splash-update-label")).toHaveTextContent("Updating episodes");
    expect(screen.getByTestId("splash-update-fill")).toHaveStyle({ width: "40%" });
    expect(container.querySelectorAll("[bindtap]")).toHaveLength(0);
    const logo = screen.getByTestId("splash-screen-logo");
    expect(logo).toHaveAttribute("loop-count", "1");
    expect(logo).toHaveAttribute("accessibility-label", "Duru");

    rerender(withPort(makePort(gauge(0, "wait")).port, <SplashScreen onTimeout={vi.fn()} />));
    expect(screen.getByTestId("splash-update")).toHaveAttribute("data-percent", "0");
    expect(screen.queryByTestId("splash-update-fill")).toBeNull();
  });

  it("[SPU3] wait에서 로고가 끝나면 logoFinished 1회, 대기 시간 직전까지 나가지 않고 그 시점에 close → onTimeout 순서로 나간다", () => {
    const calls: string[] = [];
    const onTimeout = vi.fn(() => void calls.push("onTimeout"));
    const { port, logoFinished, close } = makePort(gauge(40, "wait"), calls);
    render(withPort(port, <SplashScreen onTimeout={onTimeout} />));

    endLogo();
    expect(logoFinished).toHaveBeenCalledTimes(1);
    expect(onTimeout).not.toHaveBeenCalled();

    advance(splashUpdateWaitMs - 1);
    expect(close).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();

    advance(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["logoFinished", "close", "onTimeout"]);
  });

  it("[SPU4] wait에서 로고 끝 뒤 뷰가 release가 되면 즉시 1회 나가고, 대기 시간이 지나도 다시 부르지 않는다", () => {
    const onTimeout = vi.fn();
    const first = makePort(gauge(60, "wait"));
    const { rerender } = render(withPort(first.port, <SplashScreen onTimeout={onTimeout} />));

    endLogo();
    expect(onTimeout).not.toHaveBeenCalled();

    const next = makePort(gauge(100, "release"));
    rerender(withPort(next.port, <SplashScreen onTimeout={onTimeout} />));
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(next.close).toHaveBeenCalledTimes(1);

    advance(splashUpdateWaitMs + entrySplashDurationMs);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(next.close).toHaveBeenCalledTimes(1);
  });

  it("[SPU5] 로고 신호가 없으면 안전 타이머에 logoFinished, 거기서 대기 시간 뒤 나가며, 언마운트하면 그 뒤 0이다", () => {
    const onTimeout = vi.fn();
    const { port, logoFinished } = makePort(gauge(20, "wait"));
    const { unmount } = render(withPort(port, <SplashScreen onTimeout={onTimeout} />));

    advance(entrySplashDurationMs - 1);
    expect(logoFinished).not.toHaveBeenCalled();
    advance(1);
    expect(logoFinished).toHaveBeenCalledTimes(1);
    expect(onTimeout).not.toHaveBeenCalled();

    advance(splashUpdateWaitMs);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    unmount();

    const again = vi.fn();
    const second = makePort(gauge(20, "wait"));
    const view = render(withPort(second.port, <SplashScreen onTimeout={again} />));
    advance(entrySplashDurationMs);
    view.unmount();
    advance(splashUpdateWaitMs + entrySplashDurationMs);
    expect(again).not.toHaveBeenCalled();
    expect(second.close).not.toHaveBeenCalled();
  });

  it("[SPU6] plain 포트: 로고 끝에 logoFinished → close → onTimeout이 각 1회이고 안전 타이머가 다시 부르지 않는다", () => {
    const calls: string[] = [];
    const onTimeout = vi.fn(() => void calls.push("onTimeout"));
    const { port, logoFinished, close } = makePort(plainSplashUpdate.view, calls);
    render(withPort(port, <SplashScreen onTimeout={onTimeout} />));

    endLogo();
    expect(calls).toEqual(["logoFinished", "close", "onTimeout"]);

    advance(entrySplashDurationMs + splashUpdateWaitMs);
    expect(logoFinished).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("[SPU7] 동작 줄이기: data-motion · 클래스만 달라지고 라벨 · 폭은 standard와 같다", () => {
    const { port } = makePort(gauge(40, "wait"));
    const { unmount } = render(
      <MotionProvider motion="reduced">
        {withPort(port, <SplashScreen onTimeout={vi.fn()} />)}
      </MotionProvider>,
    );
    const reduced = screen.getByTestId("splash-update");
    expect(reduced).toHaveAttribute("data-motion", "reduced");
    expect(reduced.getAttribute("class")).toContain("splash-update-motion-reduced");
    expect(reduced).toHaveAttribute("accessibility-label", "Updating episodes, 40%");
    expect(screen.getByTestId("splash-update-fill")).toHaveStyle({ width: "40%" });
    unmount();

    render(
      <MotionProvider motion="standard">
        {withPort(port, <SplashScreen onTimeout={vi.fn()} />)}
      </MotionProvider>,
    );
    const standard = screen.getByTestId("splash-update");
    expect(standard).toHaveAttribute("data-motion", "standard");
    expect(standard.getAttribute("class")).not.toContain("splash-update-motion-reduced");
    expect(standard).toHaveAttribute("accessibility-label", "Updating episodes, 40%");
    expect(screen.getByTestId("splash-update-fill")).toHaveStyle({ width: "40%" });
  });

  it("[SPU8] 로고가 끝나기 전에 뷰가 release가 돼도 나가지 않고, 로고 끝에 즉시 1회 나간다", () => {
    const onTimeout = vi.fn();
    const first = makePort(gauge(50, "wait"));
    const { rerender } = render(withPort(first.port, <SplashScreen onTimeout={onTimeout} />));

    const next = makePort(gauge(100, "release"));
    rerender(withPort(next.port, <SplashScreen onTimeout={onTimeout} />));
    expect(onTimeout).not.toHaveBeenCalled();
    expect(next.close).not.toHaveBeenCalled();

    endLogo();
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(next.close).toHaveBeenCalledTimes(1);
  });

  it("[SPU9] 게이지가 처음 나타날 때 한 번만 알리고 퍼센트 변경 · release · 재등장에는 다시 알리지 않는다", () => {
    const onTimeout = vi.fn();
    const at = (view: SplashUpdateView): ReactNode =>
      withPort(makePort(view).port, <SplashScreen onTimeout={onTimeout} />);

    const { rerender } = render(at({ kind: "plain" }));
    expect(announced).toEqual([]);

    rerender(at(gauge(0, "wait")));
    expect(announced).toEqual(["Updating episodes"]);
    expect(screen.getByTestId("splash-update")).toHaveAttribute("accessibility-element", "true");
    expect(screen.getByTestId("splash-update")).toHaveAttribute(
      "accessibility-label",
      "Updating episodes, 0%",
    );

    rerender(at(gauge(40, "wait")));
    rerender(at(gauge(80, "wait")));
    rerender(at(gauge(100, "release")));
    expect(announced).toEqual(["Updating episodes"]);

    rerender(at({ kind: "plain" }));
    rerender(at(gauge(10, "wait")));
    expect(announced).toEqual(["Updating episodes"]);
  });

  it("[SPU9] 처음부터 게이지로 세워도 알림은 정확히 1회다", () => {
    const { rerender } = render(
      withPort(makePort(gauge(30, "wait")).port, <SplashScreen onTimeout={vi.fn()} />),
    );
    expect(announced).toEqual(["Updating episodes"]);

    rerender(withPort(makePort(gauge(60, "wait")).port, <SplashScreen onTimeout={vi.fn()} />));
    expect(announced).toEqual(["Updating episodes"]);
  });
});
