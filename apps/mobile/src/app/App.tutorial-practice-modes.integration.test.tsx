import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, screen, within } from "@lynx-js/react/testing-library";
import { App } from "./App";
import { productJourneySeed } from "./journey-progress";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

const tap = (id: string) => fireEvent.tap(screen.getByTestId(id), {});
const action = () => tap("learning-shell-action");
const button = (id: string) =>
  fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-button"), {});

afterEach(() => vi.unstubAllGlobals());

async function openPractice(mode: "listening" | "speaking" | "writing") {
  const completedStepCount = { listening: 5, speaking: 6, writing: 7 }[mode];
  await renderSignedInApp(
    <App
      completedEpisodeIntroIds={["tutorial-intro"]}
      journeySeed={{
        ...productJourneySeed,
        completedStepCount,
        completedMessengerUnitIds: ["appointment-confirmation"],
        completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
        visualNovelProgress: { status: "completed", beatIndex: 2 },
      }}
    />,
  );
  tap(`ui-lynx-learning-unit-tutorial-${mode}`);
  tap("step-sheet-start");
  expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent("Lesson 1 / 1");
}

test("듣기는 인사 음원을 다시 듣고 두 보기 중 고르며, 오답은 다음 유닛을 열지 않는다", async () => {
  const play = vi.fn<() => void>();
  vi.stubGlobal("NativeModules", { AudioPlaybackModule: { play, stop: vi.fn<() => void>() } });
  await openPractice("listening");
  expect(screen.getByTestId("listening-choice-0")).toHaveTextContent("Hello");
  expect(screen.getByTestId("listening-choice-1")).toHaveTextContent("Thank you");
  expect(screen.queryByTestId("listening-choice-2")).toBeNull();
  tap("listening-prompt-replay");
  expect(play).toHaveBeenCalledWith("phone-call-confirm-01", expect.any(Function));
  tap("listening-choice-1");
  tap("learning-shell-advance");
  action();
  expect(screen.getByTestId("lesson-complete-screen")).toBeInTheDocument();
  button("lesson-complete-screen-exit");
  expect(screen.getByTestId("ui-lynx-learning-unit-tutorial-listening")).toHaveAttribute(
    "data-status",
    "active",
  );
  expect(screen.getByTestId("ui-lynx-learning-unit-tutorial-speaking")).toHaveAttribute(
    "data-status",
    "default",
  );
});

function speechHost(granted: boolean) {
  const start = vi.fn<(_args: unknown, callback: (payload: unknown) => void) => void>(
    (_args, callback) => callback({ status: "recognized", text: "안녕하세요", isFinal: true }),
  );
  vi.stubGlobal("NativeModules", {
    SpeechRecognitionModule: {
      getStatus: vi.fn<() => void>(),
      requestPermissions: (callback: (payload: unknown) => void) =>
        callback({
          microphone: granted ? "granted" : "denied",
          speechRecognition: granted ? "granted" : "denied",
          recognizerAvailable: true,
        }),
      start,
      stop: vi.fn<() => void>(),
    },
  });
  return start;
}

test("말하기는 번역·발음 안내와 함께 인사를 인식하고 Perfect 결과를 낸다", async () => {
  const start = speechHost(true);
  await openPractice("speaking");
  expect(screen.getByTestId("speaking-screen-translation")).toHaveTextContent("Hello");
  expect(screen.getByTestId("speaking-screen-romanization")).toHaveTextContent("annyeonghaseyo");
  action();
  expect(start).toHaveBeenCalledOnce();
  tap("learning-shell-advance");
  action();
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
});

test("마이크 권한 거절 후 명시적으로 건너뛰면 일반 완료로 쓰기 유닛을 연다", async () => {
  const start = speechHost(false);
  await openPractice("speaking");
  action();
  expect(start).not.toHaveBeenCalled();
  expect(screen.getByTestId("learning-shell-action")).toHaveAttribute(
    "accessibility-label",
    "Skip",
  );
  action();
  action();
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("LESSON COMPLETE!");
  button("lesson-complete-screen-exit");
  expect(screen.getByTestId("ui-lynx-learning-unit-tutorial-writing")).toHaveAttribute(
    "data-status",
    "active",
  );
});

test("쓰기는 빈 캔버스를 제출할 수 없고 나 한 글자를 따라 쓰면 Perfect와 최종 복습이 열린다", async () => {
  const compare = vi.fn<(_args: unknown, callback: (payload: unknown) => void) => void>(
    (_args, callback) =>
      callback({
        status: "compared",
        coverage: "1",
        stay: "1",
        drawnArea: "10",
        guideArea: "10",
        font: "Stub",
        guideBox: "0,0,1,1",
      }),
  );
  vi.stubGlobal("NativeModules", {
    HandwritingTraceModule: {
      guide: (_args: unknown, callback: (payload: unknown) => void) =>
        callback({ status: "rendered", image: "aGVsbG8=", box: "0,0,1,1", font: "Stub" }),
      compare,
    },
  });
  await openPractice("writing");
  expect(screen.queryByTestId("learning-shell-action")).toBeNull();
  expect(screen.getByTestId("writing-canvas-guide")).toBeInTheDocument();
  expect(screen.getByTestId("writing-screen-translation")).toHaveTextContent("See you tomorrow.");
  const surface = screen.getByTestId("drawing-surface");
  fireEvent.touchstart(surface, { touches: [{ x: 100, y: 100 }] });
  fireEvent.touchmove(surface, { touches: [{ x: 150, y: 150 }] });
  fireEvent.touchend(surface, {});
  action();
  expect(compare).toHaveBeenCalledOnce();
  action();
  action();
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
  button("lesson-complete-screen-exit");
  expect(screen.getByTestId("ui-lynx-learning-unit-tutorial-final-test")).toHaveAttribute(
    "data-status",
    "available",
  );
});

test("필기 인식을 사용할 수 없으면 자동 통과하지 않고 Skip 뒤에만 일반 완료한다", async () => {
  await openPractice("writing");
  const surface = screen.getByTestId("drawing-surface");
  fireEvent.touchstart(surface, { touches: [{ x: 100, y: 100 }] });
  fireEvent.touchmove(surface, { touches: [{ x: 150, y: 150 }] });
  fireEvent.touchend(surface, {});
  action();
  expect(screen.getByTestId("writing-screen-content")).toHaveAttribute(
    "data-phase",
    "unmeasurable",
  );
  expect(screen.queryByTestId("lesson-complete-screen")).toBeNull();
  expect(screen.getByTestId("learning-shell-action")).toHaveAttribute(
    "accessibility-label",
    "Skip",
  );
  action();
  action();
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("LESSON COMPLETE!");
});
