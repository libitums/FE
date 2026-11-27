import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { ItemAnswerReport } from "../../lib/item-answer";
import { stubSpeechHost } from "../../lib/speech-host.test-support";
import type { SpeechHostResult } from "../../lib/speech-host.test-support";
import { tapSpeakWordPrimary } from "./speak-word-controls.test-support";
import { SpeakWordActivity } from "./SpeakWordActivity";
import type { SpeakWordQuestion } from "./speak-word.contract";

// `ui` 계층: 낱말 말하기의 판정 · 건너뜀 보고가 인식 진단(오류 코드 · 네트워크로 되돌아감 · 한국어 팩)을 싣는지
// 실제 컴포넌트로 본다. Android 호스트가 싣는 키는 대역이 그대로 흉내 낸다.

const cardQuestion: SpeakWordQuestion = {
  pictureUrl: "https://cdn/card.jpg",
  meaning: "card",
  answers: ["카드"],
  romanization: "kadeu",
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount(): ReturnType<typeof vi.fn<(report: ItemAnswerReport) => void>> {
  const onItemAnswered = vi.fn<(report: ItemAnswerReport) => void>();
  render(
    <SpeakWordActivity
      questions={[cardQuestion, cardQuestion]}
      onExit={() => {}}
      onFinish={() => {}}
      onItemAnswered={onItemAnswered}
    />,
  );
  fireEvent(screen.getByTestId("speak-word-picture-image"), new window.Event("bindEvent:load"));
  return onItemAnswered;
}

const languageUnavailable: SpeechHostResult = {
  status: "recognition-failed",
  text: "",
  errorDomain: "android.speech.SpeechRecognizer",
  errorCode: 13,
  koreanPack: "available",
  fallback: "none",
};

test("USD1. 인식 실패 뒤 Skip은 unavailable:failed와 함께 오류 코드 · 되돌아감 · 한국어 팩을 보고한다", () => {
  stubSpeechHost({ result: () => languageUnavailable });
  const onItemAnswered = mount();

  tapSpeakWordPrimary();
  tapSpeakWordPrimary();

  expect(onItemAnswered).toHaveBeenCalledTimes(1);
  expect(onItemAnswered).toHaveBeenCalledWith({
    questionIndex: 0,
    outcome: "skipped",
    density: "regular",
    skipReason: "unavailable:failed",
    speech: { errorCode: 13, fallback: "none", koreanPack: "available" },
  });
});

test("USD2. 네트워크로 되돌아가 들은 판정도 진단을 싣는다", () => {
  stubSpeechHost({
    result: () => ({
      status: "recognized",
      text: "카드",
      koreanPack: "available",
      fallback: "pack-missing",
    }),
  });
  const onItemAnswered = mount();

  tapSpeakWordPrimary();

  expect(onItemAnswered).toHaveBeenCalledWith({
    questionIndex: 0,
    outcome: "correct",
    density: "regular",
    grade: "perfect",
    speech: { errorCode: 0, fallback: "pack-missing", koreanPack: "available" },
  });
});

test("USD3. 인식기가 결과를 올리지 않은 건너뜀(말하기 전 Skip)에는 speech 키가 없다", () => {
  stubSpeechHost();
  const onItemAnswered = mount();

  fireEvent.tap(
    screen.getByTestId("speak-word-secondary").querySelector('[data-testid="ui-lynx-button"]')!,
    {},
  );

  expect(onItemAnswered).toHaveBeenCalledTimes(1);
  expect(onItemAnswered.mock.calls[0]?.[0]).not.toHaveProperty("speech");
});
