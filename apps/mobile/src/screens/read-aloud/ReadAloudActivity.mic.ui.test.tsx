import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import { clearLessonSpeakingSkip } from "../../lib/lesson-speaking-skip";
import type { MicPermissionEvent } from "../../lib/mic-permission-event.contract";
import { audioFailed, stubSpeechHost } from "../../lib/speech-host.test-support";
import type { SpeechHostOptions, SpeechHostResult } from "../../lib/speech-host.test-support";
import { ReadAloudActivity } from "./ReadAloudActivity";
import type { ReadAloudQuestion } from "./read-aloud.contract";

// `ui` 계층: 따라 읽기의 마이크 사전 안내 · 거부 시트 · 인식 실패(ADR-0206).

const card: ReadAloudQuestion = {
  sentence: "카드로 할게요.",
  romanization: null,
  translation: null,
};

type Finish = (results: readonly AnswerResult[], skippedCount: number) => void;

afterEach(() => {
  cleanup();
  clearLessonSpeakingSkip();
  vi.unstubAllGlobals();
});

function mount(host: SpeechHostOptions, results: readonly (SpeechHostResult | null)[] = []) {
  const speech = stubSpeechHost({
    answerStatus: true,
    storage: new Map<string, string>(),
    result: (attempt) => results[attempt] ?? null,
    ...host,
  });
  const onFinish = vi.fn<Finish>();
  const events: MicPermissionEvent[] = [];
  render(
    <ReadAloudActivity
      questions={[card, card, card]}
      onExit={() => {}}
      onFinish={onFinish}
      mic={{ lessonKey: "ep-01:L1", onEvent: (event) => events.push(event) }}
    />,
  );
  return { speech, onFinish, events };
}

const id = (testId: string) => screen.getByTestId(testId);
const maybe = (testId: string) => screen.queryByTestId(testId);
const tapSheet = (action: string) =>
  fireEvent.tap(
    within(id(`ui-lynx-bottom-sheet-action-${action}`)).getByTestId("ui-lynx-button"),
    {},
  );

test("URA-P1. 미요청 · 처음이면 사전 안내가 서고 노출 이벤트(surface read-aloud)를 낸다", () => {
  const { events } = mount({ microphone: "not-determined" });

  expect(id("mic-permission-sheet")).toHaveAttribute("data-sheet", "prime");
  expect(events).toEqual([
    { name: "mic_permission_sheet_shown", surface: "read-aloud", sheet: "prime" },
  ]);
});

test("URA-P2. Not now는 남은 문장 셋을 건너뛰어 결과를 한 번 올린다", () => {
  const { onFinish } = mount({ microphone: "not-determined" });

  tapSheet("not-now");

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith([], 3);
});

test("URA-P3. 문장 중 거부 → 거부 시트, 설정에서 켜고 돌아오면 잠금이 풀려 준비 국면이다", () => {
  const { speech } = mount({
    microphone: "not-determined",
    onAsk: "denied",
    storage: new Map([["libitum.mic-primer-seen", "1"]]),
  });

  fireEvent.tap(id("learning-shell-action"), {});
  expect(id("read-aloud-content")).toHaveAttribute("data-reason", "blocked");
  expect(id("mic-permission-sheet")).toHaveAttribute("data-sheet", "denied");

  speech.permissions.microphone = "granted";
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit("contentSyncOpportunity", []);
  });
  expect(maybe("mic-permission-sheet")).not.toBeInTheDocument();
  expect(id("read-aloud-content")).toHaveAttribute("data-phase", "ready");
});

test("URA-P4. 인식 실패는 거부와 다른 문구 · Try again(주) · Skip(보조)이다", () => {
  mount({}, [audioFailed]);

  fireEvent.tap(id("learning-shell-action"), {});

  expect(id("read-aloud-hint")).toHaveTextContent(
    "Something went wrong while listening. Try again.",
  );
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Try again");
  expect(id("read-aloud-secondary")).toHaveAttribute("data-control", "skip");
});
