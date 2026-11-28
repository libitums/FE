import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { ItemAnswerReport } from "../../lib/item-answer";
import { echoAudioOf, ECHO_SOURCE, withAudio } from "../../lib/question-audio.test-support";
import { recognized, stubSpeechHost } from "../../lib/speech-host.test-support";
import { tapSpeakWordPrimary } from "./speak-word-controls.test-support";
import { SpeakWordActivity } from "./SpeakWordActivity";
import type { SpeakWordQuestion } from "./speak-word.contract";

// `ui` 계층: 낱말 말하기의 힌트(사용자 결정 2026-11-23, 안 C). 판정 전 카드는 그림뿐이고, 「Hint」 → 시트에서 「정답 보기」를
// 고르면 정답 로마자 줄이, 「정답 듣기」를 고르면 정답 소리가 한 번 납니다. 조립 문항 힌트(ADR-0153)와 같은 부품 · 같은
// 기록(`hintUsed`)입니다. 재생 접점(`lib/audio`)만 대역이고 말하기 호스트는 `stubSpeechHost`입니다.

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void, rate?: number) => string>(),
  stopAudio: vi.fn<() => void>(),
  pauseAudio: vi.fn<() => void>(),
  resumeAudio: vi.fn<() => void>(),
  isAudioAvailable: vi.fn<() => boolean>(),
  slowPlaybackSupport: vi.fn<() => string>(),
}));
vi.mock("../../lib/audio", () => audio);
const { playAudio } = audio;

const cardBase: SpeakWordQuestion = {
  pictureUrl: "https://cdn/card.jpg",
  meaning: "card",
  answers: ["카드"],
  romanization: "kadeu",
};
const card: SpeakWordQuestion = withAudio(cardBase, echoAudioOf());
const bare: SpeakWordQuestion = { ...cardBase, romanization: null };

beforeEach(() => {
  playAudio.mockReset();
  playAudio.mockReturnValue("started");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount(questions: readonly SpeakWordQuestion[]) {
  const onItemAnswered = vi.fn<(report: ItemAnswerReport) => void>();
  render(
    <SpeakWordActivity
      questions={questions}
      onExit={() => {}}
      onFinish={() => {}}
      onItemAnswered={onItemAnswered}
    />,
  );
  fireEvent(screen.getByTestId("speak-word-picture-image"), new window.Event("bindEvent:load"));
  return onItemAnswered;
}

const maybe = (testId: string) => screen.queryByTestId(testId);

function pickHint(action: "listen" | "show"): void {
  fireEvent.tap(screen.getByTestId("assembled-hint-button"), {});
  fireEvent.tap(
    within(screen.getByTestId(`ui-lynx-bottom-sheet-action-${action}`)).getByTestId(
      "ui-lynx-button",
    ),
    {},
  );
}

test("SWHN1. 판정 전에는 로마자 없이 Hint 버튼이 서고, 정답 보기를 고르면 로마자 줄이 선다", () => {
  stubSpeechHost();
  mount([card]);

  expect(maybe("speak-word-romanization")).toBeNull();
  expect(screen.getByTestId("assembled-hint-button")).toBeInTheDocument();

  pickHint("show");

  expect(screen.getByTestId("speak-word-romanization")).toHaveTextContent("kadeu");
  expect(maybe("assembled-hint-sheet")).toBeNull();
});

test("SWHN2. 정답 보기를 쓴 판정은 hintUsed show로 보고되고, 판정 뒤에는 Hint 버튼이 없다", () => {
  stubSpeechHost({ result: () => recognized("카드") });
  const onItemAnswered = mount([card]);

  pickHint("show");
  tapSpeakWordPrimary();

  expect(onItemAnswered).toHaveBeenCalledWith(
    expect.objectContaining({ outcome: "correct", hintUsed: "show" }),
  );
  expect(maybe("assembled-hint-button")).toBeNull();
});

test("SWHN3. 정답 듣기는 정답 소리를 한 번 내고 hintUsed listen으로 보고된다 — 로마자 줄은 서지 않는다", () => {
  stubSpeechHost({ result: () => recognized("카드") });
  const onItemAnswered = mount([card]);

  pickHint("listen");

  expect(playAudio).toHaveBeenCalledWith(ECHO_SOURCE, expect.any(Function));
  expect(maybe("speak-word-romanization")).toBeNull();

  tapSpeakWordPrimary();
  expect(onItemAnswered).toHaveBeenCalledWith(
    expect.objectContaining({ outcome: "correct", hintUsed: "listen" }),
  );
});

test("SWHN4. 힌트를 쓰지 않은 판정에는 hintUsed가 없다", () => {
  stubSpeechHost({ result: () => recognized("카드") });
  const onItemAnswered = mount([card]);

  tapSpeakWordPrimary();

  const [report] = onItemAnswered.mock.calls[0] ?? [];
  expect(report).toBeDefined();
  expect(report).not.toHaveProperty("hintUsed");
});

test("SWHN5. 힌트를 쓰고 건너뛰면 건너뜀 보고에도 hintUsed가 실린다", () => {
  stubSpeechHost();
  const onItemAnswered = mount([card, card]);

  pickHint("show");
  const skip = screen
    .getByTestId("speak-word-secondary")
    .querySelector('[data-testid="ui-lynx-button"]');
  fireEvent.tap(skip as Element, {});

  expect(onItemAnswered).toHaveBeenCalledWith(
    expect.objectContaining({ outcome: "skipped", hintUsed: "show" }),
  );
  // 다음 문항은 힌트 기록 없이 시작합니다.
  expect(maybe("speak-word-romanization")).toBeNull();
});

test("SWHN6. 로마자도 정답 소리도 없는 문항에는 Hint 버튼이 없다", () => {
  stubSpeechHost();
  mount([bare]);

  expect(maybe("assembled-hint-button")).toBeNull();
});
