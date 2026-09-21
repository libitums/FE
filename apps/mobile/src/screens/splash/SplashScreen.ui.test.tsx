import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { entrySplashDurationMs } from "../../lib/entry-flow";
import { SplashScreen } from "./SplashScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 전이·접근성 속성을 본다 (ADR-0006 D4).
// 스플래시는 나가는 수단이 없다 — 유일한 전이 채널은 `onTimeout` 콜백이다(계약 §4.2).
//
// 계약: .agent-harness/work/lib-261/spec.md §4.2~§4.5, 2026-09-21 디자인 반영으로 전이
// 계기가 「로고 애니메이션 종료」가 되고 `entrySplashDurationMs`는 최대 체류 시간이 됐다
// (splash.contract.ts).
//
// 테스트 환경에서는 애니메이션이 재생되지 않으므로 종료 신호는 `bindEvent:finalloopcomplete`를
// 직접 쏴서 만든다.

describe("SplashScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("[SP1] 로고가 한 번만 재생되도록 서고, 스크린리더에 서비스 이름으로 읽힌다", () => {
    render(<SplashScreen onTimeout={vi.fn()} />);

    const logo = screen.getByTestId("splash-screen-logo");
    expect(logo).toHaveAttribute("loop-count", "1");
    expect(logo).toHaveAttribute("accessibility-element", "true");
    expect(logo).toHaveAttribute("accessibility-label", "Duru");
    expect(logo).toHaveAttribute("accessibility-traits", "image");
  });

  it("[SP2] 애니메이션이 끝나면 onTimeout이 정확히 1회이고, 안전 타이머가 다시 부르지 않는다", () => {
    const onTimeout = vi.fn();
    render(<SplashScreen onTimeout={onTimeout} />);

    fireEvent(
      screen.getByTestId("splash-screen-logo"),
      new window.Event("bindEvent:finalloopcomplete"),
    );
    expect(onTimeout).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(entrySplashDurationMs);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("[SP3] 로고를 불러오지 못하면 기다리지 않고 onTimeout이 정확히 1회다", () => {
    const onTimeout = vi.fn();
    render(<SplashScreen onTimeout={onTimeout} />);

    fireEvent(screen.getByTestId("splash-screen-logo"), new window.Event("bindEvent:error"));
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("[SP4] 종료 신호가 없으면 최대 체류 시간 직전까지 0회, 그 시점에 정확히 1회다", () => {
    const onTimeout = vi.fn();
    render(<SplashScreen onTimeout={onTimeout} />);

    act(() => {
      vi.advanceTimersByTime(entrySplashDurationMs - 1);
    });
    expect(onTimeout).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("[SP5] 언마운트하면 그 뒤로 onTimeout이 불리지 않는다(타이머 정리)", () => {
    const onTimeout = vi.fn();
    const { unmount } = render(<SplashScreen onTimeout={onTimeout} />);

    unmount();
    act(() => {
      vi.advanceTimersByTime(entrySplashDurationMs);
    });

    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("[SP7] 부모가 다시 그려져 onTimeout이 새 함수로 바뀌어도 안전 타이머는 처음부터 다시 세지 않는다", () => {
    const first = vi.fn();
    const latest = vi.fn();
    const { rerender } = render(<SplashScreen onTimeout={first} />);

    act(() => {
      vi.advanceTimersByTime(entrySplashDurationMs - 1000);
    });
    rerender(<SplashScreen onTimeout={latest} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledTimes(1);
  });

  it("[SP6] 화면에 조작 단위가 0건이고, 로고에 accessibility-traits='header'가 없다", () => {
    const { container } = render(<SplashScreen onTimeout={vi.fn()} />);

    const logo = screen.getByTestId("splash-screen-logo");
    expect(container.querySelectorAll("[bindtap]")).toHaveLength(0);
    expect(logo).not.toHaveAttribute("accessibility-traits", "header");
  });
});
