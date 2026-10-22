import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { lessonAudioStub, listenAudioOf, withAudio } from "../../lib/question-audio.test-support";
import type { SessionOptions } from "../../lib/session-options";
import { ListeningActivity } from "./ListeningScreen";
import type { ListeningQuestion } from "./listening-questions";

// `ui` 계층(V3-2 / BA2): 듣기 화면 판정 순간, 대본 표시가 꺼져 있으면 정오 + 대본(한국어 · 로마자)이
// 낭독 공지(LynxAccessibilityModule.accessibilityAnnounce)로 한 번 나간다. 켜져 있으면 공지는 지금 그대로(없음).
// 3열 줄의 재생 단추는 재생 중에도 Stop이 되지 않는다(V3-1 가드).

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void, rate?: number) => string>(),
  stopAudio: vi.fn<() => void>(),
  pauseAudio: vi.fn<() => void>(),
  resumeAudio: vi.fn<() => void>(),
  isAudioAvailable: vi.fn<() => boolean>(),
  slowPlaybackSupport: vi.fn<() => string>(),
}));
vi.mock("../../lib/audio", () => audio);

const question: ListeningQuestion = withAudio(
  {
    prompt: "안녕하세요",
    romanization: "annyeonghaseyo",
    choices: ["Hello", "Thank you"],
    answerIndex: 0,
  } as unknown as ListeningQuestion,
  listenAudioOf("LISTEN_SELECT", "S2-01"),
);
const second: ListeningQuestion = withAudio(
  {
    prompt: "감사합니다",
    romanization: "gamsahamnida",
    choices: ["Hello", "Thank you"],
    answerIndex: 1,
  } as unknown as ListeningQuestion,
  listenAudioOf("LISTEN_SELECT", "S2-02"),
);

const transcriptOff: SessionOptions = { "auto-play-audio": true, "show-transcript": false };
const transcriptOn: SessionOptions = { "auto-play-audio": true, "show-transcript": true };

const announceFn =
  vi.fn<(args: { content: string }, callback: (result: unknown) => void) => void>();
const spoken = (): string[] => announceFn.mock.calls.map((call) => call[0].content);

function mount(sessionOptions: SessionOptions, questions = [question]) {
  const { lesson } = lessonAudioStub();
  return render(
    <ListeningActivity
      questions={questions}
      onExit={() => {}}
      onFinish={() => {}}
      sessionOptions={sessionOptions}
      gemCount={0}
      lessonAudio={lesson}
    />,
  );
}
const tapChoice = (index: number): void =>
  void fireEvent.tap(screen.getByTestId(`listening-choice-${index}`), {});

beforeEach(() => {
  announceFn.mockReset();
  audio.playAudio.mockReset();
  audio.playAudio.mockReturnValue("started");
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: { accessibilityAnnounce: announceFn },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("AN1. 대본이 꺼져 있고 정답을 고르면 공지가 한 번 나가고 정오 · 한국어 · 로마자를 담는다", () => {
  mount(transcriptOff);

  tapChoice(0);

  expect(spoken()).toHaveLength(1);
  expect(spoken()[0]).toContain("Correct");
  expect(spoken()[0]).toContain("안녕하세요");
  expect(spoken()[0]).toContain("annyeonghaseyo");
});

test("AN2. 오답이면 같은 모양으로 Incorrect와 대본이 한 번 나간다", () => {
  mount(transcriptOff);

  tapChoice(1);

  expect(spoken()).toHaveLength(1);
  expect(spoken()[0]).toContain("Incorrect");
  expect(spoken()[0]).toContain("안녕하세요");
  expect(spoken()[0]).toContain("annyeonghaseyo");
});

test("AN3. 같은 문항에서 보기를 다시 눌러도 공지는 두 번 나지 않는다", () => {
  mount(transcriptOff);

  tapChoice(0);
  tapChoice(1);
  tapChoice(0);

  expect(spoken()).toHaveLength(1);
});

test("AN4. 판정 전(마운트만)에는 대본 공지가 없다", () => {
  mount(transcriptOff);

  expect(spoken()).toHaveLength(0);
});

test("AN5. 대본 표시가 켜져 있으면 판정 때 대본 공지를 더하지 않는다", () => {
  mount(transcriptOn);

  tapChoice(0);

  expect(spoken().filter((line) => line.includes("annyeonghaseyo"))).toHaveLength(0);
  expect(spoken().filter((line) => line.includes("안녕하세요"))).toHaveLength(0);
});

test("AN6. 3열 줄의 재생 단추는 재생 중에도 Stop 이름이 되지 않는다(가드)", () => {
  mount(transcriptOff, [question, second]);

  const label = screen.getByTestId("listening-prompt-playback").getAttribute("accessibility-label");
  expect(label).not.toBe("Stop");
  expect(screen.queryByTestId("listening-listen")).not.toBeInTheDocument();
});
