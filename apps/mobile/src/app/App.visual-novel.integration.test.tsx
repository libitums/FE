import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { VisualNovelEventSink } from "../screens/visual-novel/visual-novel.contract";
import type { MessengerEventSink } from "../screens/messenger/messenger.contract";

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void) => unknown>(),
  stopAudio: vi.fn<() => void>(),
}));
vi.mock("../lib/audio", () => audio);

const unitTestId = "journey-map-visual-novel-cafe-arrival-visual-novel";

type AnnouncementCall = { content: string };

function stubCompletionAnnouncementHost(): AnnouncementCall[] {
  const calls: AnnouncementCall[] = [];
  vi.stubGlobal("NativeModules", {
    CompletionAnnouncementModule: {
      announce: (args: { content: string }, callback: (result: unknown) => void) => {
        calls.push({ content: args.content });
        callback("announced");
      },
    },
  });
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function openJourneyVisualNovel(visualNovelEventSink?: VisualNovelEventSink): void {
  render(<App visualNovelEventSink={visualNovelEventSink} />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  fireEvent.tap(screen.getByTestId(unitTestId), {});
}

function advanceToFinal(): void {
  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
}

function journeyStateSnapshot(): readonly (string | null)[] {
  return [
    "journey-step-node-greeting",
    "journey-step-node-introduction",
    "journey-step-node-ordering",
    "journey-step-node-appointment",
    "journey-messenger-item-appointment-confirmation",
    "journey-map-phone-call-appointment-confirmation-phone-call",
    "journey-step-node-directions",
  ].map((testId) => screen.getByTestId(testId).getAttribute("data-status"));
}

test("맵에서 전화 뒤이자 directions 앞의 비주얼 노벨을 열면 첫 장면이 push된다", () => {
  render(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});

  const items = screen
    .getAllByTestId(/^journey-(?:map-phone-call|map-visual-novel|step-node-directions)/)
    .map((node) => node.getAttribute("data-testid"));
  expect(items).toEqual([
    "journey-map-phone-call-appointment-confirmation-phone-call",
    unitTestId,
    "journey-step-node-directions",
  ]);

  fireEvent.tap(screen.getByTestId(unitTestId), {});
  expect(screen.getByTestId("visual-novel-screen")).toBeInTheDocument();
  expect(screen.getByTestId("visual-novel-scene-arrive")).toBeInTheDocument();
  expect(screen.queryByTestId("journey-map-screen-title")).not.toBeInTheDocument();
});

test("미완료 이탈은 마지막 도달 장면을 보존하고 기존 여정 상태를 바꾸지 않는다", () => {
  render(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  const before = journeyStateSnapshot();
  fireEvent.tap(screen.getByTestId(unitTestId), {});
  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
  expect(screen.getByTestId("visual-novel-scene-find")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});
  expect(journeyStateSnapshot()).toEqual(before);
  fireEvent.tap(screen.getByTestId(unitTestId), {});
  expect(screen.getByTestId("visual-novel-scene-find")).toBeInTheDocument();
});

test("마지막 장면 진입에서만 완료되고 완료 재진입은 final 상태다", () => {
  openJourneyVisualNovel();
  expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent("장면 1 / 3");
  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
  expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent("장면 2 / 3");
  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
  expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent("이야기 완료");

  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});
  expect(screen.getByTestId(unitTestId)).toHaveAttribute("data-status", "completed");
  fireEvent.tap(screen.getByTestId(unitTestId), {});
  expect(screen.getByTestId("visual-novel-scene-enter")).toBeInTheDocument();
  expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent("이야기 완료");
});

test("replay는 화면만 처음으로 돌리고 이탈 후 재진입하면 완료 final로 복원한다", () => {
  openJourneyVisualNovel();
  advanceToFinal();
  fireEvent.tap(screen.getByTestId("visual-novel-replay-button"), {});
  expect(screen.getByTestId("visual-novel-scene-arrive")).toHaveAttribute("data-replaying", "true");

  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});
  expect(screen.getByTestId(unitTestId)).toHaveAttribute("data-status", "completed");
  fireEvent.tap(screen.getByTestId(unitTestId), {});
  expect(screen.getByTestId("visual-novel-scene-enter")).toBeInTheDocument();
});

test("replay에서 다시 끝까지 진행해도 완료·발화·이벤트는 단조롭고 재진입은 final이다", () => {
  const announcements = stubCompletionAnnouncementHost();
  const sink = vi.fn<NonNullable<VisualNovelEventSink>>();
  openJourneyVisualNovel(sink);
  advanceToFinal();
  fireEvent.tap(screen.getByTestId("visual-novel-replay-button"), {});
  advanceToFinal();
  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});

  expect(screen.getByTestId(unitTestId)).toHaveAttribute("data-status", "completed");
  fireEvent.tap(screen.getByTestId(unitTestId), {});
  expect(screen.getByTestId("visual-novel-scene-enter")).toBeInTheDocument();
  expect(announcements).toEqual([{ content: "이야기 완료" }]);
  expect(
    sink.mock.calls.filter(
      ([event]) => (event as { name: string }).name === "visual_novel_unit_completed",
    ),
  ).toHaveLength(1);
  expect(
    sink.mock.calls.filter(
      ([event]) => (event as { name: string }).name === "visual_novel_unit_exited_incomplete",
    ),
  ).toHaveLength(0);
});

test("sink는 opened, incomplete exit, completion, completed re-entry, replay를 정확히 기록한다", () => {
  const sink = vi.fn<NonNullable<VisualNovelEventSink>>();
  openJourneyVisualNovel(sink);
  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});
  fireEvent.tap(screen.getByTestId(unitTestId), {});
  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});
  fireEvent.tap(screen.getByTestId(unitTestId), {});
  fireEvent.tap(screen.getByTestId("visual-novel-replay-button"), {});

  expect(sink.mock.calls.map(([event]) => event)).toEqual([
    {
      name: "visual_novel_unit_opened",
      unitId: "cafe-arrival-visual-novel",
      entryStatus: "available",
      entryBeatId: "arrive",
    },
    {
      name: "visual_novel_unit_exited_incomplete",
      unitId: "cafe-arrival-visual-novel",
      beatId: "find",
    },
    {
      name: "visual_novel_unit_opened",
      unitId: "cafe-arrival-visual-novel",
      entryStatus: "available",
      entryBeatId: "find",
    },
    { name: "visual_novel_unit_completed", unitId: "cafe-arrival-visual-novel" },
    {
      name: "visual_novel_unit_opened",
      unitId: "cafe-arrival-visual-novel",
      entryStatus: "completed",
      entryBeatId: "enter",
    },
    { name: "visual_novel_unit_replay_started", unitId: "cafe-arrival-visual-novel" },
  ]);
});

test("null sink에서도 완료와 재진입 동작은 같다", () => {
  render(<App visualNovelEventSink={null} />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  fireEvent.tap(screen.getByTestId(unitTestId), {});
  advanceToFinal();
  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});
  expect(screen.getByTestId(unitTestId)).toHaveAttribute("data-status", "completed");
  fireEvent.tap(screen.getByTestId(unitTestId), {});
  expect(screen.getByTestId("visual-novel-scene-enter")).toBeInTheDocument();
});

test("visual novel 완료는 messenger 상태·이벤트와 phone audio를 바꾸지 않는다", () => {
  const messengerEventSink = vi.fn<NonNullable<MessengerEventSink>>();
  render(<App messengerEventSink={messengerEventSink} />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});

  fireEvent.tap(screen.getByTestId("journey-messenger-item-appointment-confirmation"), {});
  fireEvent.tap(screen.getByTestId("messenger-reply-self-accept"), {});
  fireEvent.tap(screen.getByTestId("messenger-reply-self-thanks"), {});
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  const messengerEventsBefore = messengerEventSink.mock.calls.map(([event]) => event);

  fireEvent.tap(screen.getByTestId(unitTestId), {});
  advanceToFinal();
  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});

  expect(screen.getByTestId("journey-messenger-item-appointment-confirmation")).toHaveAttribute(
    "data-status",
    "completed",
  );
  expect(
    screen.getByTestId("journey-map-phone-call-appointment-confirmation-phone-call"),
  ).toHaveAttribute("data-status", "available");
  expect(messengerEventSink.mock.calls.map(([event]) => event)).toEqual(messengerEventsBefore);
  expect(audio.playAudio).not.toHaveBeenCalled();
  expect(audio.stopAudio).not.toHaveBeenCalled();

  fireEvent.tap(screen.getByTestId("journey-messenger-item-appointment-confirmation"), {});
  expect(screen.getByTestId("messenger-message-list").children).toHaveLength(5);
});

test("첫 find→enter 완료만 이야기 완료를 한 번 알리고 이후 완료 여정은 재알리지 않는다", () => {
  const announcements = stubCompletionAnnouncementHost();
  openJourneyVisualNovel();

  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
  expect(screen.getByTestId("visual-novel-scene-find")).toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});

  expect(announcements).toEqual([{ content: "이야기 완료" }]);
  expect(screen.getByTestId("visual-novel-screen")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});
  fireEvent.tap(screen.getByTestId(unitTestId), {});
  expect(screen.getByTestId("visual-novel-scene-enter")).toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("visual-novel-replay-button"), {});
  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});
  fireEvent.tap(screen.getByTestId(unitTestId), {});
  fireEvent.tap(screen.getByTestId("visual-novel-replay-button"), {});

  expect(announcements).toEqual([{ content: "이야기 완료" }]);
});
