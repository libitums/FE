import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, screen, within } from "@lynx-js/react/testing-library";
import { App } from "./App";
import { productJourneySeed } from "./journey-progress";
import { episodePrologueFor } from "./episode-prologues";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import { journeySteps } from "../screens/journey-map/journey-map";
import { sentenceOrderQuestionsForStep } from "../screens/sentence-order/sentence-order";
import { messengerConversationFor } from "../screens/messenger/messenger";
import { sendMessengerReply } from "../screens/messenger/messenger.test-support";
import { getPhoneCallConversation } from "../screens/phone-call/phone-call";
import { episodeFinalTestFor } from "../screens/episode-final/episode-final-tests";
import { episodeFinalAdvanceDelayMs } from "../screens/episode-final/episode-final";

const tap = (id: string) => fireEvent.tap(screen.getByTestId(id), {});
const button = (id: string) =>
  fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-button"), {});
const unit = (id: string) => `ui-lynx-learning-unit-${id}`;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// 학습 데이터·배정·진행·채점은 실제 코드. 외부 인증과 네이티브 재생 완료만 대역합니다.
test("처음 여정부터 이야기·다섯 연습·스페셜·세 문항 복습을 거쳐 롤플레이를 연다", async () => {
  let finishAudio: (() => void) | undefined;
  const play = vi.fn((_source: string, done: () => void) => {
    finishAudio = done;
  });
  const recognize = vi.fn();
  vi.stubGlobal("NativeModules", {
    AudioPlaybackModule: { play, stop: vi.fn() },
    SpeechRecognitionModule: { start: recognize, stop: vi.fn() },
    HandwritingTraceModule: { evaluate: recognize },
  });
  await renderSignedInApp(<App journeySeed={{ ...productJourneySeed, completedStepCount: 0 }} />);
  expect(screen.getByTestId(unit("greeting"))).toHaveAttribute("data-status", "default");
  tap(unit("tutorial-intro"));
  button("episode-intro-screen-next");
  const prologue = episodePrologueFor("tutorial");
  if (prologue?.kind !== "sequence") throw new Error("Expected sequence");
  vi.useFakeTimers();
  for (const segment of prologue.segments) {
    if (segment.kind === "visual-novel") {
      for (const _beat of segment.narrative.beats) tap("episode-narrative-screen-advance");
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
      tap("prologue-call-screen-end");
      tap("prologue-call-screen-complete");
    }
  }
  button("lesson-complete-screen-exit");
  expect(screen.getByTestId(unit("tutorial-intro"))).toHaveAttribute("data-status", "clear");

  function completeStep(id: (typeof journeySteps)[number]["id"]) {
    expect(screen.getByTestId(unit(id))).toHaveAttribute("data-status", "active");
    tap(unit(id));
    tap("step-sheet-start");
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
  tap(unit("appointment-confirmation"));
  for (const message of messengerConversationFor("appointment-confirmation").messages) {
    if (message.sender !== "self") continue;
    expect(screen.queryByTestId("messenger-keyboard")).not.toBeInTheDocument();
    expect(screen.getByTestId("messenger-composer-hint")).toHaveTextContent(message.romanization!);
    sendMessengerReply(message.text);
  }
  tap("messenger-finish");
  button("lesson-complete-screen-exit");
  expect(screen.getByTestId(unit("appointment-confirmation"))).toHaveAttribute(
    "data-status",
    "clear",
  );

  tap(unit("appointment-confirmation-phone-call"));
  for (const turn of getPhoneCallConversation().turns) {
    expect(screen.getByTestId(`phone-call-transcript-jimin-${turn.id}`)).toHaveTextContent(
      turn.translation!,
    );
    tap("phone-call-audio-button");
    expect(play).toHaveBeenLastCalledWith(turn.audioSource, expect.any(Function));
    act(() => finishAudio?.());
    expect(screen.getByTestId(`phone-call-reply-${turn.reply.id}`)).toHaveTextContent(
      turn.reply.romanization!,
    );
    tap(`phone-call-reply-${turn.reply.id}`);
  }
  tap("phone-call-exit-button");
  expect(screen.getByTestId(unit("appointment-confirmation-phone-call"))).toHaveAttribute(
    "data-status",
    "clear",
  );
  tap(unit("cafe-arrival-visual-novel"));
  expect(screen.getByTestId("visual-novel-dialogue-arrive")).toHaveTextContent("annyeonghaseyo");
  tap("visual-novel-advance-button");
  tap("visual-novel-advance-button");
  tap("visual-novel-exit-button");
  expect(screen.getByTestId(unit("cafe-arrival-visual-novel"))).toHaveAttribute(
    "data-status",
    "clear",
  );
  completeStep("directions");
  expect(screen.getByTestId(unit("tutorial-final-test"))).toHaveAttribute(
    "data-status",
    "available",
  );
  tap(unit("tutorial-final-test"));
  const review = episodeFinalTestFor("tutorial-final-test");
  if (review.format !== "visual-novel") throw new Error("Expected visual novel");
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
