import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import type { ListenItemReport, LessonAudio, ListenAudio } from "../lib/question-audio";
import { listenCueOf } from "../lib/question-audio";
import type { ListenCue } from "../lib/question-audio";
import { useListenAudio } from "./use-listen-audio";
import type { ListenAudioControl } from "./use-listen-audio";

// `ui` 계층: 듣기 문항 재생 훅이 자동 재생 · 다시 듣기 · 「천천히」 · 문항 보고를 문항 키로 관리하는가.
// 훅은 실물이고 재생 접점(`lib/audio`)과 효과음만 대역입니다.

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void, rate?: number) => string>(),
  stopAudio: vi.fn<() => void>(),
  pauseAudio: vi.fn<() => void>(),
  resumeAudio: vi.fn<() => void>(),
}));
vi.mock("../lib/audio", () => audio);
vi.mock("../lib/sound-effects", () => ({ playSound: vi.fn<(id: string) => void>() }));
const { playAudio, stopAudio, pauseAudio, resumeAudio } = audio;

const listen: ListenAudio = {
  kind: "listen",
  source: "https://cdn/audio/u01-water/a.m4a",
  ref: { itemId: "S2-01", itemType: "LISTEN_SELECT" },
};

function lessonOf(overrides: Partial<LessonAudio> = {}) {
  const onTogglePace = vi.fn<() => void>();
  const onListenItemAnswered = vi.fn<(report: ListenItemReport) => void>();
  const lesson: LessonAudio = {
    pace: "normal",
    slowPlayback: "supported",
    autoPlay: "on",
    onTogglePace,
    onListenItemAnswered,
    ...overrides,
  };
  return { lesson, onTogglePace, onListenItemAnswered };
}

let control: ListenAudioControl | null = null;

function Probe(props: { readonly cue: ListenCue | null; readonly lesson: LessonAudio }) {
  const current = useListenAudio(props.cue, props.lesson);
  control = current;
  return <view data-testid="probe" data-playback={current.playback} />;
}

function hook(): ListenAudioControl {
  if (control === null) throw new Error("훅이 아직 서지 않았습니다");
  return control;
}

const playbackText = (): string | null => screen.getByTestId("probe").getAttribute("data-playback");
const cueOf = (key: string, source = listen.source): ListenCue => ({
  key,
  audio: { ...listen, source },
});

beforeEach(() => {
  control = null;
  playAudio.mockReset();
  stopAudio.mockReset();
  pauseAudio.mockReset();
  resumeAudio.mockReset();
  playAudio.mockReturnValue("started");
});

afterEach(() => {
  cleanup();
});

describe("자동 재생", () => {
  test("LA1. cue가 서고 자동 재생이 켜지면 지금 속도 1로 한 번 재생하고 playing이다", () => {
    const { lesson } = lessonOf();

    render(<Probe cue={cueOf("q1")} lesson={lesson} />);

    expect(playAudio).toHaveBeenCalledTimes(1);
    expect(playAudio).toHaveBeenCalledWith(listen.source, expect.any(Function), 1);
    expect(playbackText()).toBe("playing");
  });

  test("LA1. 재생이 끝나면 idle로 돌아간다", () => {
    const { lesson } = lessonOf();
    render(<Probe cue={cueOf("q1")} lesson={lesson} />);
    const done = playAudio.mock.calls[0]?.[1];

    act(() => done?.());

    expect(playbackText()).toBe("idle");
  });

  test("LA2. 레슨 속도가 slow이면 새 cue의 자동 재생은 0.85다", () => {
    const { lesson } = lessonOf({ pace: "slow" });

    render(<Probe cue={cueOf("q1")} lesson={lesson} />);

    expect(playAudio).toHaveBeenCalledWith(listen.source, expect.any(Function), 0.85);
  });

  test("LA3. 자동 재생이 꺼지면 자동으로는 0회이고 replay()로 한 번 난다", () => {
    const { lesson } = lessonOf({ autoPlay: "off" });
    render(<Probe cue={cueOf("q1")} lesson={lesson} />);
    expect(playAudio).toHaveBeenCalledTimes(0);
    expect(playbackText()).toBe("idle");

    act(() => hook().replay());

    expect(playAudio).toHaveBeenCalledTimes(1);
    expect(playAudio).toHaveBeenCalledWith(listen.source, expect.any(Function), 1);
  });

  test("LA6. 같은 source라도 key가 다르면 앞 소리를 멈추고 다시 한 번 자동 재생한다", () => {
    const { lesson } = lessonOf();
    const view = render(<Probe cue={cueOf("q1")} lesson={lesson} />);
    expect(playAudio).toHaveBeenCalledTimes(1);

    view.rerender(<Probe cue={cueOf("q2")} lesson={lesson} />);

    expect(stopAudio).toHaveBeenCalledTimes(1);
    expect(playAudio).toHaveBeenCalledTimes(2);
    const stopOrder = stopAudio.mock.invocationCallOrder[0] ?? 0;
    const secondPlay = playAudio.mock.invocationCallOrder[1] ?? 0;
    expect(stopOrder).toBeLessThan(secondPlay);
  });

  test("LA6. 같은 key로 다시 그려도 다시 재생하지 않는다", () => {
    const { lesson } = lessonOf();
    const view = render(<Probe cue={cueOf("q1")} lesson={lesson} />);

    view.rerender(<Probe cue={cueOf("q1")} lesson={{ ...lesson }} />);

    expect(playAudio).toHaveBeenCalledTimes(1);
    expect(stopAudio).toHaveBeenCalledTimes(0);
  });

  test("LA7. 언마운트하면 멈춘다", () => {
    const { lesson } = lessonOf();
    const view = render(<Probe cue={cueOf("q1")} lesson={lesson} />);
    expect(stopAudio).toHaveBeenCalledTimes(0);

    view.unmount();

    expect(stopAudio).toHaveBeenCalledTimes(1);
  });

  test("LA8. 재생이 unavailable이면 playback은 idle이다", () => {
    playAudio.mockReturnValue("unavailable");
    const { lesson } = lessonOf();

    render(<Probe cue={cueOf("q1")} lesson={lesson} />);

    expect(playbackText()).toBe("idle");
  });
});

describe("다시 듣기 · 「천천히」 · 재생/일시정지", () => {
  test("LA4. 다시 듣기는 지금 속도로 처음부터 부르고 속도별로 센다", () => {
    const { lesson, onListenItemAnswered } = lessonOf({ autoPlay: "off" });
    const cue = cueOf("q1");
    const view = render(<Probe cue={cue} lesson={lesson} />);

    act(() => hook().replay());
    act(() => hook().replay());
    expect(playAudio).toHaveBeenLastCalledWith(listen.source, expect.any(Function), 1);

    const slow = { ...lesson, pace: "slow" as const };
    view.rerender(<Probe cue={cue} lesson={slow} />);
    act(() => hook().replay());
    expect(playAudio).toHaveBeenLastCalledWith(listen.source, expect.any(Function), 0.85);

    act(() => hook().answered("correct"));

    expect(onListenItemAnswered).toHaveBeenCalledTimes(1);
    expect(onListenItemAnswered).toHaveBeenCalledWith({
      ref: listen.ref,
      result: "correct",
      pace: "slow",
      slowTurnedOn: false,
      replayCount: 2,
      slowReplayCount: 1,
    });
  });

  test("LA5. normal에서 togglePace는 onTogglePace 한 번과 즉시 0.85 재생이다", () => {
    const { lesson, onTogglePace } = lessonOf({ autoPlay: "off" });
    render(<Probe cue={cueOf("q1")} lesson={lesson} />);

    act(() => hook().togglePace());

    expect(onTogglePace).toHaveBeenCalledTimes(1);
    expect(playAudio).toHaveBeenCalledTimes(1);
    expect(playAudio).toHaveBeenCalledWith(listen.source, expect.any(Function), 0.85);
  });

  test("LA5. slow에서 togglePace는 onTogglePace 한 번이고 재생을 건드리지 않는다", () => {
    const { lesson, onTogglePace } = lessonOf({ pace: "slow", autoPlay: "off" });
    render(<Probe cue={cueOf("q1")} lesson={lesson} />);

    act(() => hook().togglePace());

    expect(onTogglePace).toHaveBeenCalledTimes(1);
    expect(playAudio).toHaveBeenCalledTimes(0);
    expect(stopAudio).toHaveBeenCalledTimes(0);
  });

  test("LA5. 「천천히」를 켠 문항은 보고의 slowTurnedOn이 true다", () => {
    const { lesson, onListenItemAnswered } = lessonOf({ autoPlay: "off" });
    const cue = cueOf("q1");
    const view = render(<Probe cue={cue} lesson={lesson} />);

    act(() => hook().togglePace());
    view.rerender(<Probe cue={cue} lesson={{ ...lesson, pace: "slow" }} />);
    act(() => hook().answered("incorrect"));

    expect(onListenItemAnswered).toHaveBeenCalledWith(
      expect.objectContaining({
        result: "incorrect",
        pace: "slow",
        slowTurnedOn: true,
        replayCount: 0,
        slowReplayCount: 0,
      }),
    );
  });

  test("LA5. 켤 때의 다시 재생 · 재생/일시정지는 다시 듣기 수에 세지 않는다", () => {
    const { lesson, onListenItemAnswered } = lessonOf({ autoPlay: "off" });
    render(<Probe cue={cueOf("q1")} lesson={lesson} />);

    act(() => hook().togglePace());
    act(() => hook().toggle());
    act(() => hook().answered("correct"));

    expect(onListenItemAnswered).toHaveBeenCalledWith(
      expect.objectContaining({ replayCount: 0, slowReplayCount: 0 }),
    );
  });

  test("LA11. toggle은 playing이면 pause, paused면 resume, idle이면 지금 속도로 처음부터 튼다", () => {
    const { lesson } = lessonOf({ autoPlay: "off", pace: "slow" });
    render(<Probe cue={cueOf("q1")} lesson={lesson} />);
    expect(playbackText()).toBe("idle");

    act(() => hook().toggle());
    expect(playAudio).toHaveBeenCalledWith(listen.source, expect.any(Function), 0.85);
    expect(playbackText()).toBe("playing");

    act(() => hook().toggle());
    expect(pauseAudio).toHaveBeenCalledTimes(1);
    expect(playbackText()).toBe("paused");

    act(() => hook().toggle());
    expect(resumeAudio).toHaveBeenCalledTimes(1);
    expect(playbackText()).toBe("playing");
    expect(playAudio).toHaveBeenCalledTimes(1);
  });
});

describe("문항 보고", () => {
  test("LA9. answered는 문항당 처음 한 번만 보고하고 보고 모양이 정확하다", () => {
    const { lesson, onListenItemAnswered } = lessonOf();
    render(<Probe cue={cueOf("q1")} lesson={lesson} />);

    act(() => hook().answered("correct"));
    act(() => hook().answered("incorrect"));

    expect(onListenItemAnswered).toHaveBeenCalledTimes(1);
    expect(onListenItemAnswered).toHaveBeenCalledWith({
      ref: listen.ref,
      result: "correct",
      pace: "normal",
      slowTurnedOn: false,
      replayCount: 0,
      slowReplayCount: 0,
    });
  });

  test("LA9. key가 바뀌면 셈과 보고 여부를 새로 시작한다", () => {
    const { lesson, onListenItemAnswered } = lessonOf({ autoPlay: "off" });
    const view = render(<Probe cue={cueOf("q1")} lesson={lesson} />);
    act(() => hook().replay());
    act(() => hook().answered("correct"));

    view.rerender(<Probe cue={cueOf("q2")} lesson={lesson} />);
    act(() => hook().answered("incorrect"));

    expect(onListenItemAnswered).toHaveBeenCalledTimes(2);
    expect(onListenItemAnswered).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ result: "correct", replayCount: 1 }),
    );
    expect(onListenItemAnswered).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ result: "incorrect", replayCount: 0 }),
    );
  });

  test("LA9. 보고의 ref는 cue의 문항 참조다", () => {
    const { lesson, onListenItemAnswered } = lessonOf();
    const other = listenCueOf("q9", {
      kind: "listen",
      source: "https://cdn/audio/u01-water/b.m4a",
      ref: { itemId: "S5-03", itemType: "SHADOW" },
    });
    render(<Probe cue={other} lesson={lesson} />);

    act(() => hook().answered("practiced"));

    expect(onListenItemAnswered).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: { itemId: "S5-03", itemType: "SHADOW" },
        result: "practiced",
      }),
    );
  });
});

describe("cue 없음", () => {
  test("LA10. cue가 null이면 모든 동작이 무동작이고 playback은 idle이다", () => {
    const { lesson, onTogglePace, onListenItemAnswered } = lessonOf();
    render(<Probe cue={null} lesson={lesson} />);

    act(() => {
      hook().replay();
      hook().toggle();
      hook().togglePace();
      hook().answered("correct");
    });

    expect(playAudio).toHaveBeenCalledTimes(0);
    expect(pauseAudio).toHaveBeenCalledTimes(0);
    expect(resumeAudio).toHaveBeenCalledTimes(0);
    expect(onTogglePace).toHaveBeenCalledTimes(0);
    expect(onListenItemAnswered).toHaveBeenCalledTimes(0);
    expect(playbackText()).toBe("idle");
  });

  test("LA10. 훅이 내는 pace · slowPlayback은 레슨 값 그대로다", () => {
    const { lesson } = lessonOf({ pace: "slow", slowPlayback: "unsupported" });
    render(<Probe cue={null} lesson={lesson} />);

    expect(hook().pace).toBe("slow");
    expect(hook().slowPlayback).toBe("unsupported");
  });
});
