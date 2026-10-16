import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, render } from "@lynx-js/react/testing-library";

import type { ProgressLoadEvent } from "../lib/progress-load-event.contract";
import type { ProgressLoadPhase } from "./progress-load.contract";
import { useProgressLoadEvents } from "./use-progress-load-events";

// `ui` 계층: 상태가 바뀔 때 전이마다 측정 이벤트를 한 번만 내는지 봅니다. 전이 → 이벤트 표(49쌍)는
// unit이 지므로 여기서는 훅이 그 표를 렌더 수명에 맞게 부르는 횟수만 봅니다.

afterEach(() => {
  cleanup();
});

type Sink = ((event: ProgressLoadEvent) => void) | null;

function Probe({ phase, sink }: { phase: ProgressLoadPhase; sink: Sink }) {
  useProgressLoadEvents(phase, sink);
  return <view />;
}

describe("useProgressLoadEvents", () => {
  test("UE1. checking → loading → failed → retrying → loaded는 delayed · failed(first) · recovered(manual) 셋이다", () => {
    const sink = vi.fn<(event: ProgressLoadEvent) => void>();
    const { rerender } = render(<Probe phase="checking" sink={sink} />);

    for (const phase of ["loading", "failed", "retrying", "loaded"] as const) {
      rerender(<Probe phase={phase} sink={sink} />);
    }

    expect(sink.mock.calls.map(([event]) => event)).toEqual([
      { name: "progress_load_delayed" },
      { name: "progress_load_failed", attempt: "first" },
      { name: "progress_load_recovered", trigger: "manual" },
    ]);
  });

  test("UE2. 같은 phase로 다섯 번 리렌더해도 추가 호출이 없다", () => {
    const sink = vi.fn<(event: ProgressLoadEvent) => void>();
    const { rerender } = render(<Probe phase="checking" sink={sink} />);
    rerender(<Probe phase="loading" sink={sink} />);
    expect(sink).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 5; i += 1) {
      rerender(<Probe phase="loading" sink={sink} />);
    }

    expect(sink).toHaveBeenCalledTimes(1);
  });

  test("UE3. sink가 null이어도 던지지 않는다", () => {
    const { rerender } = render(<Probe phase="checking" sink={null} />);

    expect(() => rerender(<Probe phase="failed" sink={null} />)).not.toThrow();
  });

  test("UE3. sink가 던져도 렌더가 깨지지 않는다", () => {
    const sink = vi.fn<(event: ProgressLoadEvent) => void>(() => {
      throw new Error("sink down");
    });
    const { rerender } = render(<Probe phase="checking" sink={sink} />);

    expect(() => rerender(<Probe phase="failed" sink={sink} />)).not.toThrow();
    expect(sink).toHaveBeenCalledTimes(1);
  });

  test("UE4. idle → hydrated → loaded는 호출이 없다", () => {
    const sink = vi.fn<(event: ProgressLoadEvent) => void>();
    const { rerender } = render(<Probe phase="idle" sink={sink} />);

    rerender(<Probe phase="hydrated" sink={sink} />);
    rerender(<Probe phase="loaded" sink={sink} />);

    expect(sink).not.toHaveBeenCalled();
  });
});
