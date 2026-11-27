import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { ItemAnswerReport } from "../../lib/item-answer";
import { clearLessonSpeakingSkip } from "../../lib/lesson-speaking-skip";
import type { MicPermissionEvent } from "../../lib/mic-permission-event.contract";
import { audioFailed, stubSpeechHost } from "../../lib/speech-host.test-support";
import type { SpeechHostOptions, SpeechHostResult } from "../../lib/speech-host.test-support";
import { SpeakWordActivity } from "./SpeakWordActivity";
import type { SpeakWordQuestion } from "./speak-word.contract";

// `ui` 계층: 낱말 말하기의 마이크 사전 안내(P1) · 거부(P2) 시트 · 인식 실패(P3)(ADR-0206).

const cardQuestion: SpeakWordQuestion = {
  pictureUrl: "https://cdn/card.jpg",
  meaning: "card",
  answers: ["카드"],
  romanization: "kadeu",
  audio: { kind: "answer-echo", source: "https://cdn/card.mp3" },
};

const lessonKey = "ep-01:L2";

afterEach(() => {
  cleanup();
  clearLessonSpeakingSkip();
  vi.unstubAllGlobals();
});

function mount(
  host: SpeechHostOptions,
  results: readonly (SpeechHostResult | null)[] = [],
  lesson: string | null = lessonKey,
) {
  const storage = host.storage ?? new Map<string, string>();
  const speech = stubSpeechHost({
    answerStatus: true,
    storage,
    result: (attempt) => results[attempt] ?? null,
    ...host,
  });
  const onItemAnswered = vi.fn<(report: ItemAnswerReport) => void>();
  const onFinish = vi.fn();
  const events: MicPermissionEvent[] = [];
  render(
    <SpeakWordActivity
      questions={[cardQuestion, cardQuestion, cardQuestion]}
      onExit={() => {}}
      onFinish={onFinish}
      onItemAnswered={onItemAnswered}
      mic={{ lessonKey: lesson, onEvent: (event) => events.push(event) }}
    />,
  );
  fireEvent(screen.getByTestId("speak-word-picture-image"), new window.Event("bindEvent:load"));
  return { speech, storage, onItemAnswered, onFinish, events };
}

const id = (testId: string) => screen.getByTestId(testId);
const maybe = (testId: string) => screen.queryByTestId(testId);
const sheetText = () => id("mic-permission-sheet").textContent ?? "";
const tapSheet = (action: string) =>
  fireEvent.tap(
    within(id(`ui-lynx-bottom-sheet-action-${action}`)).getByTestId("ui-lynx-button"),
    {},
  );
const tapAction = () => fireEvent.tap(id("learning-shell-action"), {});
const foreground = () =>
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit("contentSyncOpportunity", []);
  });

test("USW-P1. 아직 묻지 않았고 처음이면 사전 안내가 서고, 본 것을 기기에 적고 노출 이벤트를 낸다", () => {
  const { storage, events } = mount({ microphone: "not-determined" });

  expect(id("mic-permission-sheet")).toHaveAttribute("data-sheet", "prime");
  expect(sheetText()).toContain("Time to speak Korean");
  expect(sheetText()).toContain("Your voice isn't saved.");
  expect(sheetText()).toContain("Allow microphone");
  expect(sheetText()).toContain("Not now — skip speaking");
  expect(storage.get("libitum.mic-primer-seen")).toBe("1");
  expect(events).toEqual([
    { name: "mic_permission_sheet_shown", surface: "speak-word", sheet: "prime" },
  ]);
});

test("USW-P2. Allow → 시스템 창 허용이면 시트가 닫히고 준비 국면, 허용 이벤트(prompt)", () => {
  const { speech, events } = mount({ microphone: "not-determined", onAsk: "granted" });

  tapSheet("allow");

  expect(speech.calls.request).toBe(1);
  expect(maybe("mic-permission-sheet")).not.toBeInTheDocument();
  expect(id("speak-word-content")).toHaveAttribute("data-phase", "ready");
  expect(events[1]).toEqual({
    name: "mic_permission_answered",
    surface: "speak-word",
    result: "allowed",
    source: "prompt",
  });
});

test("USW-P3. Allow → 시스템 창 거부면 거부 시트(Microphone is off · Open Settings)로 바뀐다", () => {
  const { events } = mount({ microphone: "not-determined", onAsk: "denied" });

  tapSheet("allow");

  expect(id("mic-permission-sheet")).toHaveAttribute("data-sheet", "denied");
  expect(sheetText()).toContain("Microphone is off");
  expect(sheetText()).toContain("Open Settings");
  expect(sheetText()).toContain("Continue without speaking");
  expect(events.map((event) => event.name)).toEqual([
    "mic_permission_sheet_shown",
    "mic_permission_answered",
    "mic_permission_sheet_shown",
  ]);
  expect(events[1]).toMatchObject({ result: "denied", source: "prompt" });
});

test("USW-P4. Not now는 이 활동의 남은 문항을 mic:not-now로 건너뛰고 결과를 한 번 올린다", () => {
  const { onItemAnswered, onFinish } = mount({ microphone: "not-determined" });

  tapSheet("not-now");

  expect(maybe("mic-permission-sheet")).not.toBeInTheDocument();
  expect(onItemAnswered.mock.calls.map(([report]) => report)).toEqual(
    [0, 1, 2].map((index) => ({
      questionIndex: index,
      outcome: "skipped",
      density: "regular",
      skipReason: "mic:not-now",
    })),
  );
  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith([], 3, [0, 1, 2]);
});

test("USW-P5. 사전 안내를 한 번 본 뒤에는 미요청이어도 시트가 없고, 마이크를 누르면 시스템 창이 바로 뜬다", () => {
  const storage = new Map([["libitum.mic-primer-seen", "1"]]);
  const { speech } = mount({ microphone: "not-determined", onAsk: "granted", storage });

  expect(maybe("mic-permission-sheet")).not.toBeInTheDocument();
  tapAction();
  expect(speech.calls.request).toBe(1);
  expect(id("speak-word-content")).toHaveAttribute("data-phase", "listening");
});

test("USW-P6. 이미 거부면 열 때 거부 시트 — Open Settings는 설정을 열고 시트는 남는다", () => {
  const { speech, events } = mount({ microphone: "denied" });

  expect(id("mic-permission-sheet")).toHaveAttribute("data-sheet", "denied");
  tapSheet("settings");

  expect(speech.calls.openSettings).toBe(1);
  expect(id("mic-permission-sheet")).toHaveAttribute("data-sheet", "denied");
  expect(events).toEqual([
    { name: "mic_permission_sheet_shown", surface: "speak-word", sheet: "denied" },
    { name: "mic_permission_settings_opened", surface: "speak-word" },
  ]);
});

test("USW-P7. 앱이 앞으로 돌아와 허용이면 시트가 닫히고(settings 허용 이벤트), 아직 거부면 그대로다", () => {
  const { speech, events } = mount({ microphone: "denied" });
  tapSheet("settings");

  foreground();
  expect(id("mic-permission-sheet")).toHaveAttribute("data-sheet", "denied");

  speech.permissions.microphone = "granted";
  foreground();
  expect(maybe("mic-permission-sheet")).not.toBeInTheDocument();
  expect(events[events.length - 1]).toEqual({
    name: "mic_permission_answered",
    surface: "speak-word",
    result: "allowed",
    source: "settings",
  });
});

test("USW-P8. Continue without speaking은 남은 문항을 unavailable:blocked로 건너뛰고, 같은 레슨의 다음 활동은 열자마자 건너뛴다", () => {
  const first = mount({ microphone: "denied" });
  tapSheet("continue");

  expect(first.onFinish).toHaveBeenCalledWith([], 3, [0, 1, 2]);
  expect(first.onItemAnswered.mock.calls[0]?.[0]).toMatchObject({
    skipReason: "unavailable:blocked",
  });

  cleanup();
  const next = mount({ microphone: "denied" });
  expect(maybe("mic-permission-sheet")).not.toBeInTheDocument();
  expect(next.onFinish).toHaveBeenCalledWith([], 3, [0, 1, 2]);
  expect(next.onItemAnswered.mock.calls[0]?.[0]).toMatchObject({
    skipReason: "unavailable:blocked",
  });
});

test("USW-P9. 문항 중 시스템 창에서 거부하면 거부 시트가 서고, 설정에서 켜고 돌아오면 잠금이 풀려 다시 말할 수 있다", () => {
  const storage = new Map([["libitum.mic-primer-seen", "1"]]);
  const { speech } = mount({ microphone: "not-determined", onAsk: "denied", storage });

  tapAction();
  expect(id("speak-word-content")).toHaveAttribute("data-reason", "blocked");
  expect(id("mic-permission-sheet")).toHaveAttribute("data-sheet", "denied");

  speech.permissions.microphone = "granted";
  foreground();
  expect(maybe("mic-permission-sheet")).not.toBeInTheDocument();
  expect(id("speak-word-content")).toHaveAttribute("data-phase", "ready");
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Speak");
});

test("USW-P10. 인식 실패는 거부와 다른 문구 · Try again(주) · Skip(보조)이고, 두 번 실패하면 Hear it이 선다", () => {
  mount({}, [audioFailed, audioFailed], null);

  tapAction();
  expect(id("speak-word-content")).toHaveAttribute("data-reason", "failed");
  expect(id("speak-word-hint")).toHaveTextContent(
    "Something went wrong while listening. Try again.",
  );
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Try again");
  expect(id("speak-word-secondary")).toHaveAttribute("data-control", "skip");
  expect(maybe("speak-word-hear-it")).not.toBeInTheDocument();

  tapAction();
  expect(id("speak-word-content")).toHaveAttribute("data-reason", "failed");
  expect(id("speak-word-hear-it")).toHaveTextContent("Hear it");
});

test("USW-P11. 레슨 맥락이 없으면(단독 활동) 열 때 확인은 하되 건너뜀 기억은 남기지 않는다", () => {
  const { onFinish } = mount({ microphone: "not-determined" }, [], null);

  tapSheet("not-now");
  expect(onFinish).toHaveBeenCalledTimes(1);

  cleanup();
  const again = mount({ microphone: "not-determined", storage: new Map() }, [], null);
  expect(again.onFinish).not.toHaveBeenCalled();
});
