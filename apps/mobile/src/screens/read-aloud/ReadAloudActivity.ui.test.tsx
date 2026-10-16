import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import {
  audioFailed,
  dictationOff,
  recognized,
  stubSpeechHost,
} from "../../lib/speech-host.test-support";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";
import type { LessonPosition } from "../learning/activity-finish";
import { ReadAloudActivity } from "./ReadAloudActivity";
import type { ReadAloudQuestion } from "./read-aloud.contract";

// `ui` 계층: 읽기 활동 — 카드 요소 · 부호가 붙은 조각 · 국면별 버튼 · 칠 · 안내 낭독 · 잠금 · 받아쓰기 꺼짐 ·
// 넘김 · 결과 한 번을 실제 컴포넌트로 본다. 문항은 손으로 세웠다(매핑은 unit이 진다).

const fine: ReadAloudQuestion = {
  sentence: "아니요, 괜찮아요.",
  romanization: "aniyo, gwaenchanayo.",
  translation: "No, I'm fine.",
};
const card: ReadAloudQuestion = {
  sentence: "카드로 할게요.",
  romanization: null,
  translation: null,
};

const recognitionUnavailableText =
  "Speech recognition isn't available right now. Tap Skip to continue.";

type Finish = (results: readonly AnswerResult[], skippedCount: number) => void;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount(questions: readonly ReadAloudQuestion[], lesson?: LessonPosition) {
  const onFinish = vi.fn<Finish>();
  render(
    <ReadAloudActivity
      questions={questions}
      gemCount={0}
      onExit={() => {}}
      onFinish={onFinish}
      lesson={lesson}
    />,
  );
  return { onFinish };
}

const id = (testId: string) => screen.getByTestId(testId);
const maybe = (testId: string) => screen.queryByTestId(testId);
const hintText = () => maybe("read-aloud-hint")?.textContent ?? "";

function tapAction(label: string): void {
  const action = id("learning-shell-action");
  expect(action).toHaveAttribute("accessibility-label", label);
  fireEvent.tap(action, {});
}

function tapSecondary(control: string, label: string): void {
  const slot = id("read-aloud-secondary");
  expect(slot).toHaveAttribute("data-control", control);
  expect(slot).toHaveTextContent(label);
  const button = slot.querySelector('[data-testid="ui-lynx-button"]');
  expect(button).not.toBeNull();
  fireEvent.tap(button as Element, {});
}

const chunk = (index: number) => id(`read-aloud-chunk-${index}`);

test("URA1. 첫 화면은 표식 · 부호가 붙은 조각 · 로마자 · 영어 · 대기 마이크 · Speak · 보조 Next를 보이고 배지는 없다", () => {
  mount([fine, card]);

  expect(id("read-aloud-badge")).toHaveTextContent("Practice");
  expect(chunk(0)).toHaveTextContent("아니요,");
  expect(chunk(1)).toHaveTextContent("괜찮아요.");
  expect(chunk(0)).toHaveAttribute("data-matched", "false");
  expect(chunk(1)).toHaveAttribute("data-matched", "false");
  expect(id("read-aloud-sentence")).toHaveAttribute("accessibility-label", "아니요, 괜찮아요.");
  expect(id("read-aloud-romanization")).toHaveAttribute(
    "accessibility-label",
    "Pronunciation: aniyo, gwaenchanayo.",
  );
  expect(id("read-aloud-translation")).toHaveTextContent("No, I'm fine.");
  expect(id("read-aloud-waves")).toHaveAttribute("data-state", "idle");
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Speak");
  expect(id("read-aloud-secondary")).toHaveAttribute("data-control", "next");
  expect(id("read-aloud-secondary")).toHaveTextContent("Next");
  expect(id("learning-shell-instruction")).toHaveTextContent("Read the sentence out loud.");
  expect(id("learning-shell-form")).toHaveTextContent("Speaking");
  expect(maybe("answer-verdict")).not.toBeInTheDocument();
  expect(id("read-aloud-content")).toHaveAttribute("data-phase", "ready");
});

test("URA2. 듣는 중에는 Stop speaking만 서고 낭독이 없으며, 결과가 오면 앞 낱말만 칠하고 맞은 수를 한 번 알린다", () => {
  const host = stubSpeechHost();
  mount([fine, card]);

  tapAction("Speak");

  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Stop speaking");
  expect(maybe("read-aloud-secondary")).not.toBeInTheDocument();
  expect(id("read-aloud-waves")).toHaveAttribute("data-state", "listening");
  expect(host.announced.builtin).toEqual([]);

  act(() => host.pending[0]?.({ status: "recognized", text: "아니요", isFinal: true }));

  expect(id("read-aloud-content")).toHaveAttribute("data-phase", "heard");
  expect(chunk(0)).toHaveAttribute("data-matched", "true");
  expect(chunk(1)).toHaveAttribute("data-matched", "false");
  expect(hintText()).toBe("You said the first 1 of 2 words.");
  expect(host.announced.builtin).toEqual(["You said the first 1 of 2 words."]);
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Next");
  expect(id("read-aloud-secondary")).toHaveAttribute("data-control", "retry");
  expect(id("read-aloud-secondary")).toHaveTextContent("Try again");
  expect(id("read-aloud-waves")).toHaveAttribute("data-state", "off");
  expect(maybe("answer-verdict")).not.toBeInTheDocument();
});

test("URA3. Try again은 다시 듣고 전부 맞히면 모든 조각을 칠한다 · 마이크 탭도 시작과 멈춤이다", () => {
  const host = stubSpeechHost();
  mount([fine, card]);

  tapAction("Speak");
  act(() => host.pending[0]?.({ status: "recognized", text: "아니요", isFinal: true }));
  tapSecondary("retry", "Try again");

  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Stop speaking");
  expect(host.calls.start).toBe(2);
  act(() => host.pending[1]?.({ status: "recognized", text: "아니요 괜찮아요", isFinal: true }));

  expect(chunk(0)).toHaveAttribute("data-matched", "true");
  expect(chunk(1)).toHaveAttribute("data-matched", "true");
  expect(hintText()).toBe("You said all 2 words.");

  tapSecondary("retry", "Try again");
  fireEvent.tap(id("read-aloud-waves"), {});
  expect(host.calls.stop).toBeGreaterThanOrEqual(1);
});

test("URA3b. 마이크를 누르면 Speak와 같이 듣기를 시작한다", () => {
  const host = stubSpeechHost();
  mount([fine]);

  fireEvent.tap(id("read-aloud-waves"), {});

  expect(host.calls.start).toBe(1);
  expect(id("read-aloud-waves")).toHaveAttribute("data-state", "listening");
  fireEvent.tap(id("read-aloud-waves"), {});
  expect(host.calls.stop).toBe(1);
});

test("URA4. 권한 거부는 안내 한 번과 Skip만 서고, 다음 문항은 곧장 불가로 서며, 끝에 건너뜀 수를 올린다", () => {
  const host = stubSpeechHost({ microphone: "denied", speechRecognition: "denied" });
  const { onFinish } = mount([fine, card]);

  tapAction("Speak");

  expect(hintText()).toBe(recognitionUnavailableText);
  expect(host.announced.builtin).toEqual([recognitionUnavailableText]);
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Skip");
  expect(maybe("read-aloud-secondary")).not.toBeInTheDocument();
  expect(id("read-aloud-content")).toHaveAttribute("data-reason", "blocked");

  tapAction("Skip");

  expect(id("read-aloud-content")).toHaveAttribute("data-questionIndex", "1");
  expect(id("read-aloud-content")).toHaveAttribute("data-phase", "unavailable");
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Skip");
  expect(host.calls.request).toBe(1);
  expect(onFinish).toHaveBeenCalledTimes(0);

  tapAction("Skip");

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith([], 2);
});

test("URA5. 받아쓰기 꺼짐은 지시문이 바뀌고 Skip과 Try again이 서며 안내 줄은 없다 · Try again은 다시 듣는다", () => {
  const host = stubSpeechHost({ result: () => dictationOff });
  mount([fine]);

  tapAction("Speak");

  expect(id("learning-shell-instruction")).toHaveTextContent("Siri or Dictation is off");
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Skip");
  expect(id("read-aloud-secondary")).toHaveAttribute("data-control", "retry");
  expect(id("read-aloud-secondary")).toHaveTextContent("Try again");
  expect(hintText()).toBe("");

  tapSecondary("retry", "Try again");

  expect(host.calls.start).toBe(2);
});

test("URA6a. 레슨 없이 마지막 문항이면 넘김 버튼이 See results이고 결과를 한 번만 올린다", () => {
  stubSpeechHost();
  const { onFinish } = mount([card]);

  expect(id("read-aloud-secondary")).toHaveTextContent("See results");
  tapSecondary("next", "See results");
  tapSecondary("next", "See results");

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith([], 0);
});

test("URA6b. 레슨 중간 활동의 마지막 문항은 Next이고 완료 카드 없이 결과를 올리며 카운터가 오프셋을 더한다", () => {
  stubSpeechHost();
  const { onFinish } = mount([card], { offset: 4, total: 9, last: false });

  expect(id("learning-shell-chapter")).toHaveTextContent("Lesson 5 / 9");
  tapSecondary("next", "Next");

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith([], 0);
  expect(id("learning-shell").textContent).not.toContain("All questions done");
});

test("URA6c. 레슨의 마지막 활동의 마지막 문항은 See results다", () => {
  stubSpeechHost();
  mount([card], { offset: 6, total: 9, last: true });

  expect(id("read-aloud-secondary")).toHaveTextContent("See results");
});

test("URA7. 로마자 · 영어가 없는 문항은 그 줄을 그리지 않고 문장은 선다", () => {
  mount([card]);

  expect(chunk(0)).toHaveTextContent("카드로");
  expect(chunk(1)).toHaveTextContent("할게요.");
  expect(maybe("read-aloud-romanization")).not.toBeInTheDocument();
  expect(maybe("read-aloud-translation")).not.toBeInTheDocument();
});

test("URA8. 준비 국면의 Next로 넘긴 문항은 건너뜀이 아니다", () => {
  mount([fine, card]);

  tapSecondary("next", "Next");

  expect(id("read-aloud-content")).toHaveAttribute("data-questionIndex", "1");
  expect(id("read-aloud-content")).toHaveAttribute("data-phase", "ready");
});

test("URA8b. 두 문항을 Next만으로 넘기면 건너뜀 0으로 끝난다", () => {
  const { onFinish } = mount([fine, card]);

  tapSecondary("next", "Next");
  tapSecondary("next", "See results");

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith([], 0);
});

test("URA9. 빈 글자가 인식되면 0 of n을 알리고 아무것도 칠하지 않는다", () => {
  const host = stubSpeechHost({ result: () => recognized("") });
  mount([fine]);

  tapAction("Speak");

  expect(hintText()).toBe("You said 0 of 2 words.");
  expect(host.announced.builtin).toEqual(["You said 0 of 2 words."]);
  expect(chunk(0)).toHaveAttribute("data-matched", "false");
});

test("URA10. 일반 인식 실패는 안내와 Skip만 서고 잠기지 않아 다음 문항은 준비 국면이다", () => {
  const host = stubSpeechHost({ result: () => audioFailed });
  const { onFinish } = mount([fine, card]);

  tapAction("Speak");

  expect(id("read-aloud-content")).toHaveAttribute("data-reason", "failed");
  expect(hintText()).toBe(recognitionUnavailableText);
  expect(host.announced.builtin).toEqual([recognitionUnavailableText]);
  tapAction("Skip");

  expect(id("read-aloud-content")).toHaveAttribute("data-phase", "ready");
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Speak");
  tapSecondary("next", "See results");
  expect(onFinish).toHaveBeenCalledWith([], 1);
});

test("URA11. 문구는 모두 문구표에서 온다", () => {
  stubSpeechHost({ result: () => recognized("아니요") });
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <ReadAloudActivity questions={[fine]} gemCount={0} onExit={() => {}} onFinish={() => {}} />
    </UiCopyContext.Provider>,
  );

  expect(id("read-aloud-badge")).toHaveTextContent("⟦readAloud.badge⟧");
  expect(id("learning-shell-instruction")).toHaveTextContent("⟦speaking.instruction⟧");
  expect(id("read-aloud-romanization")).toHaveAttribute(
    "accessibility-label",
    "⟦readAloud.pronunciation⟧(aniyo, gwaenchanayo.)",
  );
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "⟦speaking.speak⟧");

  fireEvent.tap(id("learning-shell-action"), {});

  expect(hintText()).toBe("⟦readAloud.matched⟧(1, 2)");
  expect(id("read-aloud-secondary")).toHaveTextContent("⟦speaking.tryAgain⟧");
});
