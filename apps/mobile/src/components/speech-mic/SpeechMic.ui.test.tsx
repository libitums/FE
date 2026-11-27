import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";

import { stubSpeechHost } from "../../lib/speech-host.test-support";
import { SpeechMic } from "./SpeechMic";
import type { SpeechMicState } from "./speech-mic";

// `ui` 계층: 공용 마이크(시안 S1 · R2) — 국면별 단추 · 막대 · 링 · 문구, 움직임 줄이기, 최대 시간 만료.

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mount(state: SpeechMicState, reduced = false) {
  const onTap = vi.fn<() => void>();
  const onExpire = vi.fn<() => void>();
  render(
    <MotionProvider motion={reduced ? "reduced" : "standard"}>
      <SpeechMic
        testId="mic"
        state={state}
        label="Speak"
        status={state === "listening" ? "Listening…" : null}
        hint={state === "listening" ? "Tap to stop when you're done" : null}
        onTap={onTap}
        onExpire={onExpire}
      />
    </MotionProvider>,
  );
  return { onTap, onExpire };
}

const id = (testId: string) => screen.getByTestId(testId);
const bars = () => Array.from(screen.queryByTestId("mic-bars")?.children ?? []);

test("SMU1. 대기는 누를 수 있는 단추(낭독 이름)이고 막대 · 링 · 문구가 없다", () => {
  stubSpeechHost();
  const { onTap } = mount("idle");

  expect(id("mic-button")).toHaveAttribute("accessibility-label", "Speak");
  expect(id("mic-button")).toHaveAttribute("accessibility-traits", "button");
  expect(bars()).toHaveLength(0);
  expect(screen.queryByTestId("mic-ring")).toBeNull();
  expect(screen.queryByTestId("mic-status")).toBeNull();
  fireEvent.tap(id("mic-button"), {});
  expect(onTap).toHaveBeenCalledTimes(1);
});

test("SMU2. 꺼짐 · 확인 중은 단추로 낭독되지 않고 누를 수 없다", () => {
  stubSpeechHost();
  for (const state of ["disabled", "checking"] as const) {
    const { onTap } = mount(state);
    expect(id("mic-button")).not.toHaveAttribute("accessibility-label");
    fireEvent.tap(id("mic-button"), {});
    expect(onTap).not.toHaveBeenCalled();
    cleanup();
  }
});

test("SMU3. 듣는 중은 막대 일곱 · 남은 시간 링 · Listening… 문구가 서고, 8초가 지나면 한 번 만료를 알린다", () => {
  vi.useFakeTimers();
  stubSpeechHost({ status: { listening: true, level: 0.05 } });
  const { onExpire } = mount("listening");

  expect(bars()).toHaveLength(7);
  expect(id("mic-ring")).toBeInTheDocument();
  expect(id("mic-status")).toHaveTextContent("Listening…");

  act(() => {
    vi.advanceTimersByTime(8200);
  });
  expect(onExpire).toHaveBeenCalledTimes(1);
});

test("SMU3b. 호스트가 아직 듣지 않으면(권한 창) 시계가 가지 않아 만료되지 않는다", () => {
  vi.useFakeTimers();
  stubSpeechHost({ status: { listening: false } });
  const { onExpire } = mount("listening");

  act(() => {
    vi.advanceTimersByTime(20000);
  });
  expect(onExpire).not.toHaveBeenCalled();
  expect(id("mic-ring").getAttribute("content")).toContain('stroke-dashoffset="0"');
});

test("SMU4. 움직임 줄이기면 막대가 고정 높이이고 링이 다 차 있다(움직이지 않음) — 만료는 그대로", () => {
  vi.useFakeTimers();
  stubSpeechHost({ status: { listening: true, level: 0.05 } });
  const { onExpire } = mount("listening", true);

  const before = bars().map((bar) => bar.getAttribute("style"));
  const ring = id("mic-ring").getAttribute("content");
  act(() => {
    vi.advanceTimersByTime(3000);
  });
  expect(bars().map((bar) => bar.getAttribute("style"))).toEqual(before);
  expect(id("mic-ring").getAttribute("content")).toBe(ring);
  expect(ring).toContain('stroke-dashoffset="0"');
  act(() => {
    vi.advanceTimersByTime(5200);
  });
  expect(onExpire).toHaveBeenCalledTimes(1);
});
