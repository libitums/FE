import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { useAudioCue } from "./use-audio-cue";
import type { AudioCue, AudioCueControl } from "./use-audio-cue";

// `ui` 계층: 훅이 「지금 나야 할 소리」 값을 받아 재생 · 정지를 맡는다.
// 훅은 실물이고 소리 모듈만 대역입니다. 최소 시험 컴포넌트가 훅을 쓰고, 돌려받은 `stop`은 바깥으로 꺼냅니다.

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void) => string>(),
  stopAudio: vi.fn<() => void>(),
}));
vi.mock("./audio", () => audio);
const { playAudio, stopAudio } = audio;

let control: AudioCueControl | null = null;
const onRender = vi.fn<() => void>();

function Probe(props: { readonly cue: AudioCue | null }) {
  control = useAudioCue(props.cue);
  onRender();
  return <view data-testid="probe" />;
}

beforeEach(() => {
  control = null;
  onRender.mockReset();
  playAudio.mockReset();
  stopAudio.mockReset();
  playAudio.mockReturnValue("started");
});

afterEach(() => {
  cleanup();
});

function stopOf(): () => void {
  if (control === null) {
    throw new Error("훅이 아직 서지 않았습니다");
  }
  return control.stop;
}

describe("useAudioCue", () => {
  test("UA1. cue가 null이면 마운트 · 다시 그림 · 언마운트 · stop() 어디서도 소리를 부르지 않는다", () => {
    const { rerender, unmount } = render(<Probe cue={null} />);
    rerender(<Probe cue={null} />);
    stopOf()();
    unmount();

    expect(playAudio).toHaveBeenCalledTimes(0);
    expect(stopAudio).toHaveBeenCalledTimes(0);
  });

  test("UA2. cue가 서면 한 번 재생하고 같은 key로 다시 그려도(새 객체) 다시 재생하지 않는다", () => {
    const { rerender } = render(<Probe cue={{ key: "a", source: "s1" }} />);

    expect(playAudio).toHaveBeenCalledTimes(1);
    expect(playAudio).toHaveBeenCalledWith("s1", expect.any(Function));

    rerender(<Probe cue={{ key: "a", source: "s1" }} />);

    expect(playAudio).toHaveBeenCalledTimes(1);
    expect(stopAudio).toHaveBeenCalledTimes(0);
  });

  test("UA3. key가 바뀌면 앞 소리를 멈춘 다음 새 소리를 재생한다", () => {
    const { rerender } = render(<Probe cue={{ key: "a", source: "s1" }} />);
    rerender(<Probe cue={{ key: "b", source: "s2" }} />);

    expect(stopAudio).toHaveBeenCalledTimes(1);
    expect(playAudio).toHaveBeenCalledTimes(2);
    expect(playAudio).toHaveBeenLastCalledWith("s2", expect.any(Function));
    const stopOrder = stopAudio.mock.invocationCallOrder[0] ?? 0;
    const secondPlayOrder = playAudio.mock.invocationCallOrder[1] ?? 0;
    expect(stopOrder).toBeGreaterThan(0);
    expect(stopOrder).toBeLessThan(secondPlayOrder);
  });

  test("UA4. cue가 null이 되면 멈추기만 하고 재생하지 않는다", () => {
    const { rerender } = render(<Probe cue={{ key: "a", source: "s1" }} />);
    rerender(<Probe cue={null} />);

    expect(stopAudio).toHaveBeenCalledTimes(1);
    expect(playAudio).toHaveBeenCalledTimes(1);
  });

  test("UA5. cue가 있는 채 언마운트하면 멈춘다", () => {
    const { unmount } = render(<Probe cue={{ key: "a", source: "s1" }} />);
    expect(stopAudio).toHaveBeenCalledTimes(0);

    unmount();

    expect(stopAudio).toHaveBeenCalledTimes(1);
  });

  test("UA6. 완료 콜백을 불러도 화면 · 소리에 변화가 없고, 재생이 불가능해도 던지지 않는다", () => {
    render(<Probe cue={{ key: "a", source: "s1" }} />);
    const rendersBefore = onRender.mock.calls.length;
    const playsBefore = playAudio.mock.calls.length;
    const onFinished = playAudio.mock.calls[0]?.[1];

    if (typeof onFinished === "function") {
      onFinished();
    }

    expect(onRender).toHaveBeenCalledTimes(rendersBefore);
    expect(screen.getByTestId("probe")).toBeInTheDocument();
    expect(playAudio).toHaveBeenCalledTimes(playsBefore);
    expect(stopAudio).toHaveBeenCalledTimes(0);

    cleanup();
    playAudio.mockReturnValue("unavailable");
    expect(() => render(<Probe cue={{ key: "b", source: "s2" }} />)).not.toThrow();
  });

  test("UA7. 반환 stop()은 멈추기만 하고, 이어진 언마운트는 한 번 더 멈춘다", () => {
    const { unmount } = render(<Probe cue={{ key: "a", source: "s1" }} />);

    stopOf()();

    expect(stopAudio).toHaveBeenCalledTimes(1);
    expect(playAudio).toHaveBeenCalledTimes(1);

    unmount();

    expect(stopAudio).toHaveBeenCalledTimes(2);
  });

  test("UA-D1. delayMs가 있으면 그 시간이 지나야 한 번 재생한다", () => {
    vi.useFakeTimers();
    try {
      render(<Probe cue={{ key: "a", source: "s1", delayMs: 800 }} />);
      expect(playAudio).toHaveBeenCalledTimes(0);

      vi.advanceTimersByTime(799);
      expect(playAudio).toHaveBeenCalledTimes(0);

      vi.advanceTimersByTime(1);
      expect(playAudio).toHaveBeenCalledTimes(1);
      expect(playAudio).toHaveBeenCalledWith("s1", expect.any(Function));
    } finally {
      vi.useRealTimers();
    }
  });

  test("UA-D2. 기다리는 중에 cue가 사라지거나 key가 바뀌면 재생 · 정지를 부르지 않는다", () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(<Probe cue={{ key: "a", source: "s1", delayMs: 800 }} />);
      rerender(<Probe cue={null} />);
      vi.advanceTimersByTime(2000);

      expect(playAudio).toHaveBeenCalledTimes(0);
      expect(stopAudio).toHaveBeenCalledTimes(0);

      rerender(<Probe cue={{ key: "b", source: "s2", delayMs: 800 }} />);
      rerender(<Probe cue={{ key: "c", source: "s3", delayMs: 800 }} />);
      vi.advanceTimersByTime(800);

      expect(playAudio).toHaveBeenCalledTimes(1);
      expect(playAudio).toHaveBeenCalledWith("s3", expect.any(Function));
      expect(stopAudio).toHaveBeenCalledTimes(0);
    } finally {
      vi.useRealTimers();
    }
  });

  test("UA-D3. 기다리는 중에 언마운트하면 재생하지 않고, 재생이 시작된 뒤 언마운트하면 멈춘다", () => {
    vi.useFakeTimers();
    try {
      const first = render(<Probe cue={{ key: "a", source: "s1", delayMs: 800 }} />);
      first.unmount();
      vi.advanceTimersByTime(2000);
      expect(playAudio).toHaveBeenCalledTimes(0);
      expect(stopAudio).toHaveBeenCalledTimes(0);

      const second = render(<Probe cue={{ key: "b", source: "s2", delayMs: 800 }} />);
      vi.advanceTimersByTime(800);
      second.unmount();
      expect(playAudio).toHaveBeenCalledTimes(1);
      expect(stopAudio).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  test("UA-D4. 기다리는 중에 stop()을 부르면 그 소리는 나중에도 나지 않고, 나지 않은 소리라 정지도 부르지 않는다", () => {
    vi.useFakeTimers();
    try {
      render(<Probe cue={{ key: "a", source: "s1", delayMs: 800 }} />);

      stopOf()();
      vi.advanceTimersByTime(2000);

      expect(playAudio).toHaveBeenCalledTimes(0);
      expect(stopAudio).toHaveBeenCalledTimes(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
