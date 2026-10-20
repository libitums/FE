import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, screen, within } from "@lynx-js/react/testing-library";
import { readFinalStory } from "./test-helpers/final-story";
import { advanceNarrative, revealNarrative } from "./test-helpers/narrative";
import { App } from "./App";
import { episodePrologueFor } from "./episode-prologues";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import { journeySteps } from "../screens/journey-map/journey-map";
import { sentenceOrderQuestionsForStep } from "../screens/sentence-order/sentence-order";
import { messengerConversationFor } from "../screens/messenger/messenger";
import { sendMessengerReply } from "../screens/messenger/messenger.test-support";
import { getPhoneCallConversation } from "../screens/phone-call/phone-call";
import { episodeFinalTestFor } from "../screens/episode-final/episode-final-tests";
import { episodeFinalAdvanceDelayMs } from "../screens/episode-final/episode-final";
import { mapUnitTestId } from "./test-helpers/map-unit-testid";
import { ticketRefillMs } from "../lib/learning-tickets";

const tap = (id: string) => fireEvent.tap(screen.getByTestId(id), {});
const button = (id: string) =>
  fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-button"), {});
const unit = (id: string) => mapUnitTestId(id);
// 새 레슨마다 학습 티켓을 한 장 씁니다(최대 3장 · 1시간에 1장). 이 여정은 레슨을 셋보다 많이 이어 가므로 시작
// 직전에 시계를 세 시간 넘겨 티켓을 가득 채웁니다 — 티켓 규칙 자체는 `App.learning-tickets`가 봅니다.
const startStep = () => {
  vi.setSystemTime(Date.now() + 3 * ticketRefillMs);
  tap("step-sheet-start");
};

function dismissFirstUnitGuide(): void {
  for (const kind of ["story", "messenger", "call"]) {
    const guide = screen.queryByTestId(`first-unit-guide-${kind}`);
    if (guide !== null) fireEvent.tap(guide, { eventType: "catchEvent" });
  }
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// 학습 데이터·배정·진행·채점은 실제 코드. 외부 인증과 네이티브 재생 완료만 대역합니다.
test("처음 여정부터 이야기·여덟 연습·스페셜·세 문항 복습을 거쳐 롤플레이를 연다", async () => {
  let finishAudio: (() => void) | undefined;
  const play = vi.fn((_source: string, done: () => void) => {
    finishAudio = done;
  });
  const recognize = vi.fn();
  vi.stubGlobal("NativeModules", {
    AudioPlaybackModule: { play, stop: vi.fn() },
    SpeechRecognitionModule: { start: recognize, stop: vi.fn() },
    // 쓰기는 호스트의 픽셀 유사도로 판정합니다 — 따라 쓴 획이 안내와 겹친 것으로 답합니다.
    HandwritingTraceModule: {
      guide: (_args: unknown, callback: (payload: unknown) => void) =>
        callback({ status: "rendered", image: "aGVsbG8=", box: "0,0,1,1", font: "Stub" }),
      compare: (_args: unknown, callback: (payload: unknown) => void) =>
        callback({
          status: "compared",
          coverage: "1",
          stay: "1",
          drawnArea: "10",
          guideArea: "10",
          font: "Stub",
          guideBox: "0,0,1,1",
        }),
    },
  });
  await renderSignedInApp(<App />);
  expect(screen.getByTestId(unit("greeting"))).toHaveAttribute("data-status", "default");
  tap(unit("tutorial-intro"));
  button("episode-intro-screen-next");
  const prologue = episodePrologueFor("tutorial");
  if (prologue?.kind !== "sequence") throw new Error("Expected sequence");
  vi.useFakeTimers();
  for (const segment of prologue.segments) {
    dismissFirstUnitGuide();
    if (segment.kind === "visual-novel") {
      for (const beat of segment.narrative.beats) {
        revealNarrative();
        if (beat.speakerName === "Cabin crew") {
          expect(play).toHaveBeenLastCalledWith(
            "tutorial-cabin-announcement",
            expect.any(Function),
          );
          expect(screen.getByTestId("ui-lynx-visual-novel-dialog-line")).toHaveTextContent(
            "잠시 후 인천국제공항에 도착하겠습니다.",
          );
          expect(screen.getByTestId("narrative-background")).toHaveAttribute(
            "data-transition",
            "reality",
          );
          expect(screen.getByTestId("narrative-background").querySelectorAll("image")).toHaveLength(
            2,
          );
          expect(screen.getByTestId("narrative-background").querySelector("image")).toHaveAttribute(
            "src",
            beat.transitionFrom,
          );
          const cabin = screen.getByTestId("narrative-background-image");
          expect(cabin).toHaveAttribute("src", beat.background);
          fireEvent(cabin, new window.Event("bindEvent:load"));
          fireEvent.animationend(screen.getByTestId("narrative-reality-veil"), {
            params: {
              animation_type: "keyframe-animation",
              animation_name: "narrative-reality-veil",
            },
          });
          expect(screen.getByTestId("narrative-background").querySelectorAll("image")).toHaveLength(
            1,
          );
          expect(screen.getByTestId("ui-lynx-visual-novel-dialog-line")).toHaveTextContent(
            beat.line,
          );
        }
        advanceNarrative();
      }
    } else if (segment.kind === "messenger") {
      for (const message of segment.chat.messages) {
        if (message.sender === "other")
          act(() => {
            vi.advanceTimersByTime(1500);
          });
        else tap("prologue-chat-screen-send");
      }
      tap("prologue-chat-screen-complete");
    } else {
      tap("prologue-call-screen-accept");
      for (const line of segment.call.lines) {
        expect(play).toHaveBeenLastCalledWith(line.audioSource, expect.any(Function));
        act(() => {
          vi.advanceTimersByTime(1500);
        });
        expect(screen.getByTestId("prologue-call-screen-line-text")).toHaveTextContent(line.text);
        act(() => finishAudio?.());
      }
      expect(screen.getByTestId("prologue-call-screen-complete")).toBeInTheDocument();
      tap("prologue-call-screen-complete");
    }
  }
  button("lesson-complete-screen-exit");
  expect(screen.getByTestId(unit("tutorial-intro"))).toHaveAttribute("data-status", "clear");

  function completeStep(id: (typeof journeySteps)[number]["id"]) {
    expect(screen.getByTestId(unit(id))).toHaveAttribute("data-status", "active");
    tap(unit(id));
    startStep();
    const question = sentenceOrderQuestionsForStep(id)[0]!;
    for (const index of question.answerOrder) tap(`sentence-order-chip-${index}`);
    tap("learning-shell-action");
    tap("learning-shell-action");
    tap("learning-shell-action");
    expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
    button("lesson-complete-screen-exit");
    expect(screen.getByTestId(unit(id))).toHaveAttribute("data-status", "clear");
  }
  for (const step of journeySteps.slice(0, 4)) completeStep(step.id);
  expect(screen.getByTestId(unit("appointment-confirmation"))).toHaveAttribute(
    "data-status",
    "available",
  );
  expect(screen.getByTestId(unit("appointment-confirmation-phone-call"))).toHaveAttribute(
    "data-status",
    "default",
  );
  expect(screen.getByTestId(unit("directions"))).toHaveAttribute("data-status", "default");
  tap(unit("appointment-confirmation"));
  expect(screen.getByTestId("messenger-screen-title")).toHaveTextContent("Minseo");
  expect(screen.getByTestId("messenger-story-introduction")).toHaveTextContent(
    "Imagine a chat with Minseo.",
  );
  for (const message of messengerConversationFor("appointment-confirmation").messages) {
    if (message.sender !== "self") continue;
    expect(screen.queryByTestId("messenger-keyboard")).not.toBeInTheDocument();
    expect(screen.getByTestId("messenger-composer-hint")).toHaveTextContent(message.romanization!);
    sendMessengerReply(message.text);
  }
  expect(screen.getByTestId("messenger-story-completion")).toHaveTextContent(
    "You’re meeting at a café tomorrow.",
  );
  tap("messenger-finish");
  button("lesson-complete-screen-exit");
  expect(screen.getByTestId(unit("appointment-confirmation"))).toHaveAttribute(
    "data-status",
    "clear",
  );

  expect(screen.getByTestId(unit("appointment-confirmation-phone-call"))).toHaveAttribute(
    "data-status",
    "available",
  );
  expect(screen.getByTestId(unit("cafe-arrival-visual-novel"))).toHaveAttribute(
    "data-status",
    "default",
  );
  tap(unit("appointment-confirmation-phone-call"));
  expect(screen.getByTestId("phone-call-contact-name")).toHaveTextContent("Minseo");
  expect(screen.queryByTestId("phone-call-story-introduction")).toBeNull();
  tap("phone-call-audio-button");
  for (const turn of getPhoneCallConversation().turns) {
    expect(play).toHaveBeenLastCalledWith(turn.audioSource, expect.any(Function));
    act(() => finishAudio?.());
    expect(screen.getByTestId(`phone-call-transcript-jimin-${turn.id}`)).toHaveTextContent(
      turn.translation!,
    );
    expect(screen.getByTestId(`phone-call-reply-${turn.reply.id}`)).toHaveTextContent(
      turn.reply.romanization!,
    );
    tap(`phone-call-reply-${turn.reply.id}`);
  }
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
  button("lesson-complete-screen-exit");
  expect(screen.getByTestId(unit("appointment-confirmation-phone-call"))).toHaveAttribute(
    "data-status",
    "clear",
  );
  expect(screen.getByTestId(unit("cafe-arrival-visual-novel"))).toHaveAttribute(
    "data-status",
    "available",
  );
  expect(screen.getByTestId(unit("directions"))).toHaveAttribute("data-status", "default");
  tap(unit("cafe-arrival-visual-novel"));
  expect(screen.getByTestId("visual-novel-dialogue-arrive")).toHaveTextContent("annyeonghaseyo");
  for (let i = 0; i < 5; i++) tap("visual-novel-advance-button");
  expect(screen.getByTestId("visual-novel-context")).toHaveTextContent("listen, speak, and trace");
  tap("visual-novel-finish-button");
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
  button("lesson-complete-screen-exit");
  expect(screen.getByTestId(unit("cafe-arrival-visual-novel"))).toHaveAttribute(
    "data-status",
    "clear",
  );
  completeStep("directions");
  expect(screen.getByTestId(unit("tutorial-final-test"))).toHaveAttribute("data-status", "default");
  tap(unit("tutorial-listening"));
  startStep();
  tap("listening-choice-0");
  tap("learning-shell-advance");
  tap("learning-shell-action");
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
  button("lesson-complete-screen-exit");
  // 말하기는 `Skip`으로 넘긴다. ⟨2026-10-19⟩ 쓰기에는 `Skip`이 없다 — 따라 쓰고 `Check`로 판정받는다(정답).
  for (const id of ["tutorial-speaking", "tutorial-writing"]) {
    tap(unit(id));
    startStep();
    if (id === "tutorial-speaking") {
      button("speaking-screen-skip");
    } else {
      drawStroke();
      tap("learning-shell-action"); // Check
      tap("learning-shell-action"); // Next
    }
    tap("learning-shell-action");
    expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent(
      id === "tutorial-speaking" ? "LESSON COMPLETE!" : "PERFECT LESSON!",
    );
    button("lesson-complete-screen-exit");
    expect(screen.getByTestId(unit(id))).toHaveAttribute("data-status", "clear");
  }

  expect(screen.getByTestId(unit("tutorial-final-test"))).toHaveAttribute(
    "data-status",
    "available",
  );
  tap(unit("tutorial-final-test"));
  const review = episodeFinalTestFor("tutorial-final-test");
  if (review.format !== "visual-novel") throw new Error("Expected visual novel");
  readFinalStory("introduction");
  expect(review.questions).toHaveLength(3);
  for (const question of review.questions) {
    if (question.kind !== "word-choice") throw new Error("Beginner review must use choices");
    expect(
      screen.getByTestId(`episode-final-screen-option-${question.answerIndex}`),
    ).toHaveTextContent(question.romanizations![question.answerIndex]);
    tap(`episode-final-screen-option-${question.answerIndex}`);
    act(() => {
      vi.advanceTimersByTime(episodeFinalAdvanceDelayMs);
    });
  }
  expect(screen.queryByTestId("lesson-complete-screen-title")).toBeNull();
  readFinalStory("ending");
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
  button("lesson-complete-screen-exit");
  expect(screen.getByTestId(unit("tutorial-final-test"))).toHaveAttribute("data-status", "clear");
  tap("ui-lynx-bottom-navigator-item-roleplay");
  expect(screen.getByTestId("roleplay-list-section-tutorial")).toHaveAttribute(
    "data-unlocked",
    "true",
  );
  expect(recognize).not.toHaveBeenCalled();
});

function drawStroke(): void {
  const surface = screen.getByTestId("drawing-surface");
  fireEvent.touchstart(surface, { touches: [{ x: 100, y: 100 }] });
  fireEvent.touchmove(surface, { touches: [{ x: 150, y: 150 }] });
  fireEvent.touchend(surface, {});
}
