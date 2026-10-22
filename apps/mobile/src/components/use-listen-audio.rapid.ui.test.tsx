import { useState } from "@lynx-js/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import type { LessonAudio, ListenAudio } from "../lib/question-audio";
import type { ListenPace } from "../lib/listen-pace";
import { useListenAudio } from "./use-listen-audio";
import type { ListenAudioControl } from "./use-listen-audio";

// `ui` 계층: 「천천히」를 다시 그려지기 전에 연달아 눌러도 소리와 상태가 어긋나지 않는가. 부모가 pace를 쥐는
// 실제 모양(토글이 상태를 바꾸고 다음 그리기에서 새 값이 내려옴)으로 훅을 감싼다.
// 판정 기준(명세: 켜면 0.85로 처음부터, 끄면 재생을 건드리지 않고 다음 재생부터 1.0): 켜고 곧장 끄면 0.85 재생은
// 한 번뿐이고(끄는 탭이 다시 0.85를 시작하지 않는다), 그 뒤 다시 듣기는 1.0이다.

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void, rate?: number) => string>(),
  stopAudio: vi.fn<() => void>(),
  pauseAudio: vi.fn<() => void>(),
  resumeAudio: vi.fn<() => void>(),
}));
vi.mock("../lib/audio", () => audio);
vi.mock("../lib/sound-effects", () => ({ playSound: vi.fn<(id: string) => void>() }));
const { playAudio } = audio;

const listen: ListenAudio = {
  kind: "listen",
  source: "https://cdn/audio/u01-water/a.m4a",
  ref: { itemId: "S2-01", itemType: "LISTEN_SELECT" },
};

let control: ListenAudioControl | null = null;
let paceNow: ListenPace = "normal";
const onTogglePace = vi.fn<() => void>();

function Parent() {
  const [pace, setPace] = useState<ListenPace>("normal");
  paceNow = pace;
  const lesson: LessonAudio = {
    pace,
    slowPlayback: "supported",
    autoPlay: "off",
    onTogglePace: () => {
      onTogglePace();
      setPace((current) => (current === "normal" ? "slow" : "normal"));
    },
    onListenItemAnswered: () => {},
  };
  control = useListenAudio({ key: "q1", audio: listen }, lesson);
  return <view data-testid="probe" />;
}

function hook(): ListenAudioControl {
  if (control === null) throw new Error("훅이 아직 서지 않았습니다");
  return control;
}

const rates = (): (number | undefined)[] => playAudio.mock.calls.map((call) => call[2]);

beforeEach(() => {
  control = null;
  paceNow = "normal";
  onTogglePace.mockReset();
  playAudio.mockReset();
  playAudio.mockReturnValue("started");
  render(<Parent />);
});

afterEach(() => {
  cleanup();
});

test("LA5. 천천히를 그려지기 전에 두 번 누르면 토글은 두 번이고 0.85 재생은 한 번뿐이다", () => {
  act(() => {
    const press = hook().togglePace;
    press();
    press();
  });

  expect(onTogglePace).toHaveBeenCalledTimes(2);
  expect(paceNow).toBe("normal");
  expect(rates()).toEqual([0.85]);
});

test("LA5. 켰다 끈 뒤 다시 듣기는 1.0이다 — 상태와 다음 재생 속도가 일치한다", () => {
  act(() => {
    const press = hook().togglePace;
    press();
    press();
  });
  playAudio.mockClear();

  act(() => hook().replay());

  expect(rates()).toEqual([1]);
});

test("LA5. 한 번씩 그려진 뒤 켜고 끄는 보통의 순서는 켤 때만 0.85를 튼다", () => {
  act(() => hook().togglePace());
  act(() => hook().togglePace());

  expect(onTogglePace).toHaveBeenCalledTimes(2);
  expect(rates()).toEqual([0.85]);
});
