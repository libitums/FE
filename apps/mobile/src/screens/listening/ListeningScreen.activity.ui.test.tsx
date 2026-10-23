import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import { listenAudioOf } from "../../lib/question-audio.test-support";
import { initialSessionOptions } from "../../lib/session-options";
import type { SessionOptions } from "../../lib/session-options";
import { ListeningActivity } from "./ListeningScreen";
import type { ListeningQuestion } from "./listening-questions";

// `ui` 계층: 데이터 활동 `ListeningActivity` — 오디오가 없는 카탈로그 문항(소리 없는 프롬프트)과
// 오디오가 있는 문항이 한 활동 안에서 갈리는 것을 봅니다. 문항은 계획 모듈이 내는 꼴로 손으로
// 세웠습니다 — 매핑 계산은 unit이 지고, 여기서는 받은 문항을 그리는지만 봅니다.

const silentQuestions: readonly [ListeningQuestion, ListeningQuestion] = [
  {
    prompt: "일주일 묵어요.",
    romanization: "iljuil mugeoyo.",
    audio: null,
    choices: ["I'm leaving today.", "I'm lost.", "I'd like a map.", "I'm staying a week."],
    answerIndex: 3,
    instruction: "What did you hear?",
  },
  {
    prompt: "여권 여기 있어요.",
    romanization: "yeogwon yeogi isseoyo.",
    audio: null,
    choices: ["Here's my passport.", "Where is the exit?", "It's cold.", "Thank you."],
    answerIndex: 0,
    instruction: "What did you hear?",
  },
];

const audioQuestion: ListeningQuestion = {
  prompt: "안녕하세요",
  romanization: "annyeonghaseyo",
  audio: listenAudioOf("LISTEN_SELECT", "tutorial-listening-fixture", "tutorial-listening-fixture"),
  choices: ["Hello", "Thank you"],
  answerIndex: 0,
};

const transcriptOff: SessionOptions = { "auto-play-audio": true, "show-transcript": false };

// 호스트 경계 하나만 대역으로 세웁니다 — `lib/audio.ts`를 mock하지 않습니다.
function stubHost() {
  const play = vi.fn<(source: string, done: (result: unknown) => void) => void>();
  const stop = vi.fn<() => void>();
  vi.stubGlobal("NativeModules", {
    AudioPlaybackModule: { play, stop },
    LynxAccessibilityModule: {
      accessibilityAnnounce: (_args: { content: string }, callback: (result: unknown) => void) =>
        callback("announced"),
    },
  });
  return { play, stop };
}

function mount(
  questions: readonly ListeningQuestion[],
  options: {
    readonly sessionOptions?: SessionOptions;
    readonly onFinish?: (results: readonly AnswerResult[], skippedCount: number) => void;
  } = {},
) {
  return render(
    <ListeningActivity
      questions={questions}
      onExit={() => {}}
      onFinish={options.onFinish ?? (() => {})}
      sessionOptions={options.sessionOptions ?? initialSessionOptions}
      gemCount={0}
    />,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("UL1. 오디오가 없는 문항은 대본을 늘 보이고 일반 재생 프롬프트를 세우지 않는다", () => {
  stubHost();
  mount(silentQuestions, { sessionOptions: transcriptOff });

  expect(screen.getByTestId("listening-silent-prompt-text")).toHaveTextContent("일주일 묵어요.");
  expect(screen.getByTestId("listening-silent-prompt-romanization")).toHaveTextContent(
    "iljuil mugeoyo.",
  );
  expect(screen.queryByTestId("listening-prompt-playback")).not.toBeInTheDocument();
});

test("UL2. 소리 없는 재생 조작은 꺼진 채 서고 마운트 · 탭 어느 쪽에서도 재생하지 않는다", () => {
  const { play } = stubHost();
  mount(silentQuestions);

  const control = screen.getByTestId("listening-silent-prompt-audio");
  expect(control).toHaveAttribute("accessibility-traits", "disabled");
  expect(control).toHaveAttribute("data-state", "unavailable");
  expect(control).toHaveAttribute("accessibility-label", "Audio not available yet");
  expect(play).toHaveBeenCalledTimes(0);

  fireEvent.tap(control, {});

  expect(play).toHaveBeenCalledTimes(0);
});

test("UL3. 정답 · 오답으로 풀고 결과를 보면 판정 배열과 건너뜀 0이 한 번 올라가고 지시문은 문항의 것이다", () => {
  stubHost();
  const onFinish = vi.fn<(results: readonly AnswerResult[], skippedCount: number) => void>();
  mount(silentQuestions, { onFinish });

  expect(screen.getByTestId("learning-shell-instruction")).toHaveTextContent("What did you hear?");

  const [first, second] = silentQuestions;
  fireEvent.tap(screen.getByTestId(`ui-lynx-option-selector-item-choice-${first.answerIndex}`), {});
  fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});
  // 둘째 문항에서 정답이 아닌 보기를 고릅니다.
  fireEvent.tap(
    screen.getByTestId(`ui-lynx-option-selector-item-choice-${second.answerIndex === 0 ? 1 : 0}`),
    {},
  );
  fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});

  expect(onFinish).toHaveBeenCalledTimes(0);
  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith(["correct", "incorrect"], 0);
});

test("UL4. 오디오 문자열이 있는 문항은 지금 화면과 같이 재생 프롬프트가 서고 자동 재생이 한 번 난다", () => {
  const { play } = stubHost();
  mount([audioQuestion]);

  expect(screen.getByTestId("listening-prompt-playback")).toBeInTheDocument();
  expect(screen.queryByTestId("listening-silent-prompt")).not.toBeInTheDocument();
  expect(play).toHaveBeenCalledTimes(1);
  expect(play.mock.calls[0]?.[0]).toBe("tutorial-listening-fixture");
});
