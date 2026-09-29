import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { VisualNovelEventSink } from "../screens/visual-novel/visual-novel.contract";
import type { MessengerEventSink } from "../screens/messenger/messenger.contract";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import { answerMessengerReplies } from "../screens/messenger/messenger.test-support";

// 서사 표지를 이미 본 채로 부팅합니다 — 이 파일이 보는 것은 표지 뒤의 흐름입니다. 표지
// 자체는 `App.episode-intro.integration.test.tsx`가 봅니다.
const seenIntros = ["tutorial"] as const;

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void) => unknown>(),
  stopAudio: vi.fn<() => void>(),
}));
vi.mock("../lib/audio", () => audio);

const unitTestId = "ui-lynx-learning-unit-cafe-arrival-visual-novel";

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
  vi.unstubAllEnvs();
});

async function openJourneyVisualNovel(visualNovelEventSink?: VisualNovelEventSink): Promise<void> {
  await renderSignedInApp(
    <App seenEpisodeIntroIds={seenIntros} visualNovelEventSink={visualNovelEventSink} />,
  );
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  fireEvent.tap(screen.getByTestId(unitTestId), {});
}

function advanceToFinal(): void {
  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
}

function journeyStateSnapshot(): readonly (string | null)[] {
  return [
    "ui-lynx-learning-unit-greeting",
    "ui-lynx-learning-unit-introduction",
    "ui-lynx-learning-unit-ordering",
    "ui-lynx-learning-unit-appointment",
    "ui-lynx-learning-unit-appointment-confirmation",
    "ui-lynx-learning-unit-appointment-confirmation-phone-call",
    "ui-lynx-learning-unit-directions",
  ].map((testId) => screen.getByTestId(testId).getAttribute("data-status"));
}

test("맵에서 전화 뒤이자 directions 앞의 비주얼 노벨을 열면 첫 장면이 push된다", async () => {
  await renderSignedInApp(<App seenEpisodeIntroIds={seenIntros} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});

  const items = screen
    .getAllByTestId(
      // 유닛 하위 testid(-ring · -icon · -badge)가 아니라 유닛 자체만 셉니다.
      /^(?:ui-lynx-learning-unit-appointment-confirmation-phone-call|ui-lynx-learning-unit-cafe-arrival-visual-novel|ui-lynx-learning-unit-directions)$/,
    )
    .map((node) => node.getAttribute("data-testid"));
  expect(items).toEqual([
    "ui-lynx-learning-unit-appointment-confirmation-phone-call",
    unitTestId,
    "ui-lynx-learning-unit-directions",
  ]);

  fireEvent.tap(screen.getByTestId(unitTestId), {});
  expect(screen.getByTestId("visual-novel-screen")).toBeInTheDocument();
  expect(screen.getByTestId("visual-novel-scene-arrive")).toBeInTheDocument();
  expect(screen.queryByTestId("journey-map-screen")).not.toBeInTheDocument();
});

test("미완료 이탈은 마지막 도달 장면을 보존하고 기존 여정 상태를 바꾸지 않는다", async () => {
  await renderSignedInApp(<App seenEpisodeIntroIds={seenIntros} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  const before = journeyStateSnapshot();
  fireEvent.tap(screen.getByTestId(unitTestId), {});
  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
  expect(screen.getByTestId("visual-novel-scene-find")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});
  expect(journeyStateSnapshot()).toEqual(before);
  fireEvent.tap(screen.getByTestId(unitTestId), {});
  expect(screen.getByTestId("visual-novel-scene-find")).toBeInTheDocument();
});

test("마지막 장면 진입에서만 완료되고 완료 재진입은 final 상태다", async () => {
  await openJourneyVisualNovel();
  expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent("장면 1 / 3");
  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
  expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent("장면 2 / 3");
  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
  expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent("이야기 완료");

  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});
  expect(screen.getByTestId(unitTestId)).toHaveAttribute("data-status", "clear");
  fireEvent.tap(screen.getByTestId(unitTestId), {});
  expect(screen.getByTestId("visual-novel-scene-enter")).toBeInTheDocument();
  expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent("이야기 완료");
});

test("replay는 화면만 처음으로 돌리고 이탈 후 재진입하면 완료 final로 복원한다", async () => {
  await openJourneyVisualNovel();
  advanceToFinal();
  fireEvent.tap(screen.getByTestId("visual-novel-replay-button"), {});
  expect(screen.getByTestId("visual-novel-scene-arrive")).toHaveAttribute("data-replaying", "true");

  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});
  expect(screen.getByTestId(unitTestId)).toHaveAttribute("data-status", "clear");
  fireEvent.tap(screen.getByTestId(unitTestId), {});
  expect(screen.getByTestId("visual-novel-scene-enter")).toBeInTheDocument();
});

test("replay에서 다시 끝까지 진행해도 완료·발화·이벤트는 단조롭고 재진입은 final이다", async () => {
  const announcements = stubCompletionAnnouncementHost();
  const sink = vi.fn<NonNullable<VisualNovelEventSink>>();
  await openJourneyVisualNovel(sink);
  advanceToFinal();
  fireEvent.tap(screen.getByTestId("visual-novel-replay-button"), {});
  advanceToFinal();
  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});

  expect(screen.getByTestId(unitTestId)).toHaveAttribute("data-status", "clear");
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

test("sink는 opened, incomplete exit, completion, completed re-entry, replay를 정확히 기록한다", async () => {
  const sink = vi.fn<NonNullable<VisualNovelEventSink>>();
  await openJourneyVisualNovel(sink);
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
      entrySource: "journey",
    },
    {
      name: "visual_novel_unit_exited_incomplete",
      unitId: "cafe-arrival-visual-novel",
      beatId: "find",
      entrySource: "journey",
    },
    {
      name: "visual_novel_unit_opened",
      unitId: "cafe-arrival-visual-novel",
      entryStatus: "available",
      entryBeatId: "find",
      entrySource: "journey",
    },
    {
      name: "visual_novel_unit_completed",
      unitId: "cafe-arrival-visual-novel",
      entrySource: "journey",
    },
    {
      name: "visual_novel_unit_opened",
      unitId: "cafe-arrival-visual-novel",
      entryStatus: "completed",
      entryBeatId: "enter",
      entrySource: "journey",
    },
    {
      name: "visual_novel_unit_replay_started",
      unitId: "cafe-arrival-visual-novel",
      entrySource: "journey",
    },
  ]);
});

test("null sink에서도 완료와 재진입 동작은 같다", async () => {
  await renderSignedInApp(<App seenEpisodeIntroIds={seenIntros} visualNovelEventSink={null} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  fireEvent.tap(screen.getByTestId(unitTestId), {});
  advanceToFinal();
  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});
  expect(screen.getByTestId(unitTestId)).toHaveAttribute("data-status", "clear");
  fireEvent.tap(screen.getByTestId(unitTestId), {});
  expect(screen.getByTestId("visual-novel-scene-enter")).toBeInTheDocument();
});

test("visual novel 완료는 messenger 상태·이벤트와 phone audio를 바꾸지 않는다", async () => {
  const messengerEventSink = vi.fn<NonNullable<MessengerEventSink>>();
  await renderSignedInApp(
    <App seenEpisodeIntroIds={seenIntros} messengerEventSink={messengerEventSink} />,
  );
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});
  answerMessengerReplies();
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  const messengerEventsBefore = messengerEventSink.mock.calls.map(([event]) => event);

  fireEvent.tap(screen.getByTestId(unitTestId), {});
  advanceToFinal();
  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});

  expect(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation")).toHaveAttribute(
    "data-status",
    "clear",
  );
  expect(
    screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation-phone-call"),
  ).toHaveAttribute("data-status", "available");
  expect(messengerEventSink.mock.calls.map(([event]) => event)).toEqual(messengerEventsBefore);
  expect(audio.playAudio).not.toHaveBeenCalled();
  expect(audio.stopAudio).not.toHaveBeenCalled();

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});
  expect(screen.getByTestId("messenger-message-list").children).toHaveLength(5);
});

test("첫 find→enter 완료만 이야기 완료를 한 번 알리고 이후 완료 여정은 재알리지 않는다", async () => {
  const announcements = stubCompletionAnnouncementHost();
  await openJourneyVisualNovel();

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
