import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { SentenceReplayButton } from "./SentenceReplayButton";

// `ui` 계층: 다시 듣기 스피커(ADR-0188) — 소리가 있으면 누를 수 있고 누르면 그 소리를 처음부터, 없으면 회색 · 눌리지 않음.
// 소리 모듈만 대역입니다.

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void) => string>(() => "started"),
  stopAudio: vi.fn<() => void>(),
}));
vi.mock("../lib/audio", () => audio);

const SOURCE = "https://cdn/audio/u01-water/d-01.m4a";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const roundButton = () => within(screen.getByTestId("replay")).getByTestId("ui-lynx-round-button");

describe("SentenceReplayButton", () => {
  test("RB1. 소리가 있으면 「Play again」 단추 — 누르면 그 소리를 내고 측정 콜백을 한 번 부른다", () => {
    const onReplayed = vi.fn();
    render(
      <SentenceReplayButton
        testId="replay"
        size="l"
        replay={{ kind: "available", source: SOURCE }}
        onReplayed={onReplayed}
      />,
    );

    expect(screen.getByTestId("replay").getAttribute("data-state")).toBe("available");
    expect(roundButton().getAttribute("accessibility-label")).toBe("Play again");
    expect(roundButton().getAttribute("accessibility-traits")).toBe("button");

    fireEvent.tap(roundButton(), {});
    expect(audio.playAudio).toHaveBeenCalledTimes(1);
    expect(audio.playAudio.mock.calls[0]?.[0]).toBe(SOURCE);
    expect(onReplayed).toHaveBeenCalledTimes(1);

    fireEvent.tap(roundButton(), {});
    expect(audio.playAudio).toHaveBeenCalledTimes(2);
    expect(onReplayed).toHaveBeenCalledTimes(2);
  });

  test.each(["m", "l"] as const)(
    "RB2. 소리가 없으면 회색 — 「Audio not available yet」 · disabled · 눌러도 소리 · 콜백 없음 (size %s)",
    (size) => {
      const onReplayed = vi.fn();
      render(
        <SentenceReplayButton
          testId="replay"
          size={size}
          replay={{ kind: "unavailable" }}
          onReplayed={onReplayed}
        />,
      );
      const control = screen.getByTestId("replay");

      expect(control.getAttribute("data-state")).toBe("unavailable");
      expect(control.getAttribute("accessibility-traits")).toBe("disabled");
      expect(control.getAttribute("accessibility-label")).toBe("Audio not available yet");
      expect(within(control).queryByTestId("ui-lynx-round-button")).toBeNull();

      fireEvent.tap(control, {});
      expect(audio.playAudio).not.toHaveBeenCalled();
      expect(onReplayed).not.toHaveBeenCalled();
    },
  );

  test("RB3. 크기 — l은 이야기 컷, m은 레슨 판정 줄(클래스로 갈린다)", () => {
    render(
      <SentenceReplayButton
        testId="replay"
        size="m"
        replay={{ kind: "available", source: SOURCE }}
      />,
    );
    expect(screen.getByTestId("replay").getAttribute("class")).toContain("sentence-replay-m");
    expect(roundButton().getAttribute("class")).toContain("ui-lynx-round-button-m");
  });
});
