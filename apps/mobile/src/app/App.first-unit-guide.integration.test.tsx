import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";
import { App } from "./App";
import { productJourneySeed } from "./journey-progress";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import { FirstUnitGuideProvider } from "../components/first-unit-guide";
import { EpisodePrologueScreen } from "./EpisodePrologueScreen";
import { zeroSafeAreaInsets } from "../lib/safe-area";
import { revealNarrative } from "./test-helpers/narrative";

const tap = (id: string) => fireEvent.tap(screen.getByTestId(id), {});
const newLearner = {
  refreshedAccessToken: `e30.${btoa(JSON.stringify({ sub: "new-learner" }))}.sig`,
  loadProgress: async () => ({ status: 200, body: "null" }),
};
const dismiss = (kind: string) =>
  fireEvent.tap(screen.getByTestId(`first-unit-guide-${kind}`), { eventType: "catchEvent" });
const next = () =>
  fireEvent.tap(
    within(screen.getByTestId("episode-intro-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("first unit selection and story guides dismiss without skipping a line and stay dismissed on reentry", async () => {
  await renderSignedInApp(
    <App journeySeed={{ ...productJourneySeed, completedStepCount: 0 }} />,
    newLearner,
  );
  expect(screen.getByTestId("first-unit-guide-map")).toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen-scroll")).toHaveAttribute("enable-scroll", "false");
  tap("ui-lynx-learning-unit-tutorial-intro");
  next();
  const firstLine = screen.getByTestId("ui-lynx-visual-novel-dialog-line").textContent;
  dismiss("story");
  expect(screen.queryByTestId("first-unit-guide-story")).not.toBeInTheDocument();
  revealNarrative();
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-line").textContent).toBe(firstLine);
  fireEvent.tap(
    within(screen.getByTestId("episode-narrative-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );
  expect(screen.queryByTestId("first-unit-guide-map")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen-scroll")).not.toHaveAttribute("enable-scroll");
  tap("ui-lynx-learning-unit-tutorial-intro");
  next();
  expect(screen.queryByTestId("first-unit-guide-story")).not.toBeInTheDocument();
});

test("a new learner sees the first-unit guide", async () => {
  await renderSignedInApp(<App />, newLearner);
  expect(screen.getByTestId("first-unit-guide-map")).toBeInTheDocument();
});

test("a completed first unit never shows guides when replayed", async () => {
  await renderSignedInApp(<App completedEpisodeIntroIds={["tutorial-intro"]} />, newLearner);
  expect(screen.queryByTestId("first-unit-guide-map")).not.toBeInTheDocument();
  tap("ui-lynx-learning-unit-tutorial-intro");
  next();
  expect(screen.queryByTestId("first-unit-guide-story")).not.toBeInTheDocument();
});

test("chat waits for the guide before receiving messages", () => {
  vi.useFakeTimers();
  render(
    <FirstUnitGuideProvider enabled={true}>
      <EpisodePrologueScreen
        guided
        insets={zeroSafeAreaInsets}
        label="Tutorial"
        onComplete={vi.fn<() => void>()}
        onExit={vi.fn<() => void>()}
        prologue={{
          kind: "messenger",
          chat: {
            partnerName: "Minseo",
            messages: [
              { id: "hello", sender: "other", text: "안녕!", translation: "Hi!" },
              { id: "reply", sender: "self", text: "안녕!", translation: "Hi!" },
            ],
          },
        }}
      />
    </FirstUnitGuideProvider>,
  );
  act(() => {
    vi.advanceTimersByTime(10_000);
  });
  expect(screen.queryByTestId("prologue-chat-screen-message-hello")).not.toBeInTheDocument();
  dismiss("messenger");
  act(() => {
    vi.advanceTimersByTime(1500);
  });
  expect(screen.getByTestId("prologue-chat-screen-message-hello")).toBeInTheDocument();
  expect(screen.getByTestId("prologue-chat-screen-send")).toBeInTheDocument();
});

test("call audio and its clock wait for the guide, then start at the first line", () => {
  vi.useFakeTimers();
  const play = vi.fn<(source: string, onComplete: () => void) => void>();
  vi.stubGlobal("NativeModules", { AudioPlaybackModule: { play, stop: vi.fn<() => void>() } });
  render(
    <FirstUnitGuideProvider enabled={true}>
      <EpisodePrologueScreen
        guided
        insets={zeroSafeAreaInsets}
        label="Tutorial"
        onComplete={vi.fn<() => void>()}
        onExit={vi.fn<() => void>()}
        prologue={{
          kind: "call",
          call: {
            callerName: "Minseo",
            lines: [
              { text: "여보세요?", translation: "Hello?", audioSource: "tutorial-minseo-call-01" },
            ],
          },
        }}
      />
    </FirstUnitGuideProvider>,
  );
  act(() => {
    vi.advanceTimersByTime(60_000);
  });
  expect(play).not.toHaveBeenCalled();
  expect(screen.queryByTestId("prologue-call-screen-clock")).not.toBeInTheDocument();
  expect(screen.queryByTestId("prologue-call-screen-complete")).not.toBeInTheDocument();
  dismiss("call");
  expect(play).not.toHaveBeenCalled();
  tap("prologue-call-screen-accept");
  act(() => {
    vi.advanceTimersByTime(1000);
  });
  expect(play).toHaveBeenCalledWith("tutorial-minseo-call-01", expect.any(Function));
  expect(screen.getByTestId("prologue-call-screen-line-text")).toHaveTextContent("여보세요?");
});

test("other episode prologues do not opt into the guide", () => {
  render(
    <FirstUnitGuideProvider enabled={true}>
      <EpisodePrologueScreen
        insets={zeroSafeAreaInsets}
        label="Episode 1"
        onComplete={vi.fn<() => void>()}
        onExit={vi.fn<() => void>()}
        prologue={{
          kind: "visual-novel",
          narrative: {
            beats: [
              {
                speakerName: "Me",
                variant: "narration",
                line: "Hello",
                translation: "Hello",
              },
            ],
          },
        }}
      />
    </FirstUnitGuideProvider>,
  );
  expect(screen.queryByTestId("first-unit-guide-story")).not.toBeInTheDocument();
});
