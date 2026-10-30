import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { StoryCallScreen } from "./StoryCallScreen";
import { storyCallTestIds as ids, type StoryCallView } from "./story-call.contract";

// `ui` 계층: 전화 대사의 소리 — 소리가 있는 줄은 설 때 재생하고 그 줄의 시간(소리 길이 기반)만큼 머문 뒤 넘어가며,
// 소리 없는 줄은 조용하고, 끊기거나 나가면 멈춥니다. 소리 모듈만 대역이고 시간 계산은 unit이 집니다.

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void) => string>(),
  stopAudio: vi.fn<() => void>(),
}));
vi.mock("../../lib/audio", () => audio);
const { playAudio, stopAudio } = audio;

const voiced = "https://cdn/audio/u09-subway/int-01.m4a";
const call: StoryCallView = {
  counterpart: "사장님",
  counterpartAvatarUrl: null,
  backgroundUrl: null,
  lines: [
    {
      kind: "caller",
      label: "사장님",
      text: { ko: "어디예요?", en: "Where are you?" },
      audioSource: voiced,
      holdMs: 5200,
    },
    {
      kind: "self",
      label: "",
      text: { ko: "역이에요.", en: "At the station." },
      audioSource: null,
      holdMs: 2800,
    },
  ],
  end: null,
};

beforeEach(() => {
  vi.useFakeTimers();
  playAudio.mockReset();
  stopAudio.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const kind = () => screen.getByTestId(ids.line).getAttribute("data-kind");

function mount() {
  const onExit = vi.fn<() => void>();
  render(
    <StoryCallScreen
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      call={call}
      onComplete={vi.fn<() => void>()}
      onExit={onExit}
    />,
  );
  fireEvent.tap(screen.getByTestId(ids.answer), {});
  wait(1200);
  return { onExit };
}

test("SCA1. 소리 줄은 설 때 한 번 재생하고 그 줄의 시간 내내 머문 뒤 넘어간다 — 다음 줄이 소리 없으면 조용하다", () => {
  mount();
  expect(playAudio).toHaveBeenCalledTimes(1);
  expect(playAudio.mock.calls[0]?.[0]).toBe(voiced);
  wait(5100);
  expect(kind()).toBe("caller");
  wait(100);
  expect(kind()).toBe("self");
  expect(stopAudio).toHaveBeenCalled();
  expect(playAudio).toHaveBeenCalledTimes(1);
});

test("SCA2. 소리 중에 머리 뒤로 나가면 소리를 멈춘다", () => {
  const { onExit } = mount();
  fireEvent.tap(within(screen.getByTestId(ids.back)).getByTestId("ui-lynx-round-button"), {});
  expect(onExit).toHaveBeenCalledTimes(1);
  cleanup();
  expect(stopAudio).toHaveBeenCalled();
});
