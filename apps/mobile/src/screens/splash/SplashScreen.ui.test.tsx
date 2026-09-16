import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@lynx-js/react/testing-library";

import { entrySplashDurationMs } from "../../lib/entry-flow";
import { SplashScreen } from "./SplashScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 타이머 전이·접근성 속성을 본다 (ADR-0006 D4).
// 스플래시는 나가는 수단이 없다 — 유일한 전이 채널은 `onTimeout` 콜백이다(계약 §4.2).
//
// 계약: .agent-harness/work/lib-261/spec.md §0.3 D-a(고정 시간) · §4.2~§4.5(구조·testid) ·
//       §4.4(접근성 — 서비스 이름은 `header`가 아니다, A2).
// 계획: .agent-harness/work/lib-261/test-plan.md ui § `SplashScreen.ui.test.tsx` SP1~SP5.
//
// 문구(서비스 이름 `Duru` · 보조 문구)는 §8이 정본이지만, 보조 문구는 자리표라 이 파일은
// 리터럴을 단언하지 않는다 — 존재와 접근성 속성만 본다.

describe("SplashScreen (LIB-261)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // SP1 — 부재 단언(스크롤 상자에 accessibility-*가 0건)이다. 상자 자체가 없어 질의가
  // 닿지 않는 쪽으로 참이 될 수 있으므로, 먼저 세 testid의 존재를 앵커로 건다
  // (getByTestId는 없으면 던진다 — TestingLibraryElementError).
  it("[SP1] 서비스 이름·보조 문구·스크롤 상자가 서고, 스크롤 상자에 accessibility-*가 0건이다", () => {
    render(<SplashScreen onTimeout={vi.fn()} />);

    const serviceName = screen.getByTestId("splash-screen-service-name");
    const tagline = screen.getByTestId("splash-screen-tagline");
    const scroll = screen.getByTestId("splash-screen-scroll");
    expect(serviceName).toBeInTheDocument();
    expect(tagline).toBeInTheDocument();
    expect(scroll).toBeInTheDocument();

    const accessibilityAttrs = Array.from(scroll.attributes).filter((attr) =>
      attr.name.startsWith("accessibility-"),
    );
    expect(accessibilityAttrs).toHaveLength(0);
  });

  // SP2
  it("[SP2] 고정 시간 전에는 onTimeout이 0회다", () => {
    const onTimeout = vi.fn();
    render(<SplashScreen onTimeout={onTimeout} />);

    act(() => {
      vi.advanceTimersByTime(entrySplashDurationMs - 1);
    });

    expect(onTimeout).not.toHaveBeenCalled();
  });

  // SP3
  it("[SP3] 고정 시간이 지나면 onTimeout이 정확히 1회다", () => {
    const onTimeout = vi.fn();
    render(<SplashScreen onTimeout={onTimeout} />);

    act(() => {
      vi.advanceTimersByTime(entrySplashDurationMs);
    });

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  // SP4
  it("[SP4] 언마운트하면 그 뒤로 onTimeout이 불리지 않는다(타이머 정리)", () => {
    const onTimeout = vi.fn();
    const { unmount } = render(<SplashScreen onTimeout={onTimeout} />);

    unmount();
    act(() => {
      vi.advanceTimersByTime(entrySplashDurationMs);
    });

    expect(onTimeout).not.toHaveBeenCalled();
  });

  // SP5 — 부재 단언(조작 단위 0건 · 서비스 이름에 header 없음)이다. 먼저 서비스 이름의
  // 존재를 앵커로 건다.
  it("[SP5] 화면에 조작 단위가 0건이고, 서비스 이름에 accessibility-traits='header'가 없다", () => {
    const { container } = render(<SplashScreen onTimeout={vi.fn()} />);

    const serviceName = screen.getByTestId("splash-screen-service-name");
    expect(serviceName).toBeInTheDocument();

    expect(container.querySelectorAll('[accessibility-element="true"]')).toHaveLength(0);
    expect(container.querySelectorAll("[bindtap]")).toHaveLength(0);
    expect(serviceName).not.toHaveAttribute("accessibility-traits", "header");
  });
});
