import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, screen } from "@lynx-js/react/testing-library";
import { App } from "./App";
import { journeySeedBefore } from "./test-helpers/journey-seed";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import type { VisualNovelEventSink } from "../screens/visual-novel/visual-novel.contract";

const unitId = "cafe-arrival-visual-novel";
const tap = (id: string) => fireEvent.tap(screen.getByTestId(id), {});
const openUnit = () => tap(`ui-lynx-learning-unit-${unitId}`);
const next = () => tap("visual-novel-advance-button");
const nextScene = () => {
  next();
  next();
};
const check = () => fireEvent.tap(screen.getByText("Check →"), {});
function finish() {
  for (let i = 0; i < 5 && screen.queryByTestId("visual-novel-advance-button"); i++) next();
  tap("visual-novel-finish-button");
}
async function openStory(sink: VisualNovelEventSink = null) {
  await renderSignedInApp(
    <App
      completedEpisodeIntroIds={["tutorial-intro"]}
      journeySeed={journeySeedBefore(unitId)}
      visualNovelEventSink={sink}
    />,
  );
  openUnit();
}
afterEach(() => vi.unstubAllGlobals());

test("each scene includes the learner's reply before moving to the next scene", async () => {
  await openStory();
  for (const [scene, reply] of [
    ["arrive", "안녕하세요!"],
    ["find", "물 좀 주세요."],
    ["enter", "고마워요!"],
  ]) {
    expect(screen.getByTestId(`visual-novel-scene-${scene}`)).toBeInTheDocument();
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-speaker")).toHaveTextContent("Minseo");
    expect(screen.getByTestId(`visual-novel-dialogue-${scene}`)).toHaveAttribute(
      "data-speaker",
      "partner",
    );
    next();
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-speaker")).toHaveTextContent("Me");
    expect(screen.getByTestId(`visual-novel-dialogue-${scene}`)).toHaveAttribute(
      "data-speaker",
      "self",
    );
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog")).toHaveAttribute(
      "data-surface",
      "opaque",
    );
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-line")).toHaveTextContent(reply);
    expect(screen.queryByTestId("lesson-complete-screen")).toBeNull();
    if (scene !== "enter") next();
  }
  tap("visual-novel-finish-button");
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
  expect(screen.queryByText("Start over")).toBeNull();
  check();
  expect(screen.getByTestId(`ui-lynx-learning-unit-${unitId}`)).toHaveAttribute(
    "data-status",
    "clear",
  );
  expect(screen.getByTestId("ui-lynx-learning-unit-directions")).toHaveAttribute(
    "data-status",
    "active",
  );
});

test("an unfinished exit resumes the reached scene without unlocking the next unit", async () => {
  const sink = vi.fn<NonNullable<VisualNovelEventSink>>();
  await openStory(sink);
  nextScene();
  tap("visual-novel-exit-button");
  expect(screen.getByTestId("ui-lynx-learning-unit-directions")).toHaveAttribute(
    "data-status",
    "default",
  );
  openUnit();
  expect(screen.getByTestId("visual-novel-scene-find")).toBeInTheDocument();
  expect(sink).toHaveBeenCalledWith({
    name: "visual_novel_unit_exited_incomplete",
    unitId,
    beatId: "find",
    entrySource: "journey",
  });
});

test("reaching the last scene does not complete the unit before its final response", async () => {
  const sink = vi.fn<NonNullable<VisualNovelEventSink>>();
  await openStory(sink);
  nextScene();
  nextScene();
  expect(screen.getByTestId("visual-novel-scene-enter")).toBeInTheDocument();
  expect(
    sink.mock.calls.filter(([event]) => event.name === "visual_novel_unit_completed"),
  ).toHaveLength(0);
  tap("visual-novel-exit-button");
  expect(screen.getByTestId("ui-lynx-learning-unit-directions")).toHaveAttribute(
    "data-status",
    "default",
  );
});

test("completed reentry starts over automatically and preserves completion on an early exit", async () => {
  await openStory();
  finish();
  check();
  openUnit();
  expect(screen.getByTestId("visual-novel-scene-arrive")).toBeInTheDocument();
  expect(screen.queryByText("Start over")).toBeNull();
  tap("visual-novel-exit-button");
  expect(screen.getByTestId(`ui-lynx-learning-unit-${unitId}`)).toHaveAttribute(
    "data-status",
    "clear",
  );
  openUnit();
  expect(screen.getByTestId("visual-novel-scene-arrive")).toBeInTheDocument();
});

test("a second completed run reaches Perfect lesson without duplicate journey completion events", async () => {
  const sink = vi.fn<NonNullable<VisualNovelEventSink>>();
  const announce = vi.fn();
  vi.stubGlobal("NativeModules", { CompletionAnnouncementModule: { announce } });
  await openStory(sink);
  for (let run = 0; run < 2; run++) {
    finish();
    expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
    check();
    openUnit();
  }
  expect(
    sink.mock.calls.filter(([event]) => event.name === "visual_novel_unit_completed"),
  ).toHaveLength(1);
  expect(sink).toHaveBeenLastCalledWith({
    name: "visual_novel_unit_opened",
    unitId,
    entrySource: "journey",
    entryStatus: "completed",
    entryBeatId: "arrive",
  });
  expect(announce.mock.calls.filter(([args]) => args.content === "Story complete")).toHaveLength(1);
});

test("completion with a null sink preserves the completed messenger and phone units", async () => {
  await openStory();
  finish();
  check();
  for (const id of ["appointment-confirmation", "appointment-confirmation-phone-call"])
    expect(screen.getByTestId(`ui-lynx-learning-unit-${id}`)).toHaveAttribute(
      "data-status",
      "clear",
    );
  tap("ui-lynx-learning-unit-appointment-confirmation");
  expect(screen.getByTestId("messenger-message-list").children).toHaveLength(1);
});
