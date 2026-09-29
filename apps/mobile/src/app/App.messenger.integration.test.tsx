import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { MessengerEventSink } from "../screens/messenger/messenger.contract";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import {
  answerMessengerReplies,
  typeMessengerReply,
} from "../screens/messenger/messenger.test-support";

// 서사 표지를 이미 본 채로 부팅합니다 — 이 파일이 보는 것은 표지 뒤의 흐름입니다. 표지
// 자체는 `App.episode-intro.integration.test.tsx`가 봅니다.
const seenIntros = ["tutorial"] as const;

// App · navigation · 여정 맵 · 메신저 화면의 실제 결선을 봅니다.

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function openJourneyMessenger(messengerEventSink?: MessengerEventSink) {
  await renderSignedInApp(
    <App seenEpisodeIntroIds={seenIntros} messengerEventSink={messengerEventSink} />,
  );
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});
}

function finishConversation() {
  answerMessengerReplies();
}

// 학습 완료 화면의 나가기(`맵으로` · `목록으로`)입니다. 버튼이 ui-lynx `Button`이라 안쪽을 누릅니다.
function tapLessonCompleteExit() {
  const button = screen
    .getByTestId("lesson-complete-screen-exit")
    .querySelector('[data-testid="ui-lynx-button"]');
  if (button === null) throw new Error("lesson-complete-screen-exit 안에 버튼이 없습니다");
  fireEvent.tap(button, {});
}

test("맵의 약속 확인 메시지를 열면 실제 messenger 화면이 push된다", async () => {
  await openJourneyMessenger();
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
  expect(screen.getByTestId("messenger-screen-title")).toHaveTextContent("약속 확인 메시지");
  expect(screen.queryByTestId("journey-map-screen")).not.toBeInTheDocument();
});

test("두 답장을 완료하면 마지막 메시지와 맵 완료 표식이 함께 나타난다", async () => {
  await openJourneyMessenger();
  finishConversation();
  expect(screen.getByTestId("messenger-message-jimin-goodbye")).toHaveTextContent(
    "그럼 토요일에 봬요!",
  );
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  // 완료 표식은 유닛 어휘(`clear`)이고, 「완료됨」은 화면 글자가 아니라 접근성
  // 이름에 실립니다 — `LearningUnit`이 체크 아이콘으로 그리기 때문입니다.
  expect(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation")).toHaveAttribute(
    "data-status",
    "clear",
  );
  expect(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation")).toHaveAttribute(
    "accessibility-label",
    "약속 확인 메시지, 완료됨, 이야기 연결",
  );
});

test("메신저 완료는 일반 completedStepCount와 directions 상태를 바꾸지 않는다", async () => {
  await renderSignedInApp(<App seenEpisodeIntroIds={seenIntros} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  // initialCompletedStepCount=2입니다: greeting/소개는 done, appointment/directions는 locked입니다.
  expect(screen.getByTestId("ui-lynx-learning-unit-greeting")).toHaveAttribute(
    "data-status",
    "clear",
  );
  expect(screen.getByTestId("ui-lynx-learning-unit-appointment")).toHaveAttribute(
    "data-status",
    "default",
  );
  expect(screen.getByTestId("ui-lynx-learning-unit-directions")).toHaveAttribute(
    "data-status",
    "default",
  );
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});
  finishConversation();
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  // 메신저 완료 전후 일반 스텝 상태는 동일한 계약 리터럴이어야 합니다.
  expect(screen.getByTestId("ui-lynx-learning-unit-greeting")).toHaveAttribute(
    "data-status",
    "clear",
  );
  expect(screen.getByTestId("ui-lynx-learning-unit-appointment")).toHaveAttribute(
    "data-status",
    "default",
  );
  expect(screen.getByTestId("ui-lynx-learning-unit-directions")).toHaveAttribute(
    "data-status",
    "default",
  );
});

test("미완료로 맵을 나갔다 재입장하면 첫 메시지부터 시작한다", async () => {
  await openJourneyMessenger();
  answerMessengerReplies(1);
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});
  expect(screen.getByTestId("messenger-message-list").children).toHaveLength(1);
});

test("대화를 끝내고 결과 보기를 누르면 학습 완료(PERFECT LESSON)가 서고, 나가면 맵에 완료 표식이 있다", async () => {
  await openJourneyMessenger();
  finishConversation();
  fireEvent.tap(screen.getByTestId("messenger-finish"), {});
  expect(screen.queryByTestId("messenger-screen")).toBeNull();
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
  tapLessonCompleteExit();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation")).toHaveAttribute(
    "data-status",
    "clear",
  );
});

test("한 번이라도 틀린 답장이 있으면 학습 완료는 LESSON COMPLETE다", async () => {
  await openJourneyMessenger();
  typeMessengerReply("조아요");
  fireEvent.tap(screen.getByTestId("messenger-try-again").querySelector("view")!, {});
  finishConversation();
  fireEvent.tap(screen.getByTestId("messenger-finish"), {});
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("LESSON COMPLETE!");
});

test("완료 재입장은 전체 대화와 결과 보기를 내고 완료 기록을 보존한다", async () => {
  await openJourneyMessenger();
  finishConversation();
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});
  expect(screen.getByTestId("messenger-message-list").children).toHaveLength(5);
  fireEvent.tap(screen.getByTestId("messenger-finish"), {});
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
  tapLessonCompleteExit();
  expect(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation")).toHaveAttribute(
    "data-status",
    "clear",
  );
});

// **뒤집힙니다**(ADR-0007 2026-09-27 개정). 메신저는 여정 탭 위에 쌓인 자리라 탭이
// 없습니다 — 나가야 맵 루트에서 다시 서고, 그때 탭 전환이 그대로 동작합니다.
test("메신저에는 탭이 없고, 나가면 탭 전환이 그대로 동작한다", async () => {
  await openJourneyMessenger();
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(0);

  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});
  expect(screen.getByTestId("settings-screen-title")).toHaveTextContent("설정");
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
});

test("sink는 열린 시점에 정확한 opened payload를 한 번 받는다", async () => {
  const sink = vi.fn();
  await openJourneyMessenger(sink);
  expect(sink).toHaveBeenCalledTimes(1);
  expect(sink).toHaveBeenNthCalledWith(1, {
    name: "messenger_unit_opened",
    unitId: "appointment-confirmation",
    entryStatus: "available",
    entrySource: "journey",
  });
});

test("sink는 incomplete exit과 완료 재입장을 정확한 순서·payload로 받는다", async () => {
  const sink = vi.fn();
  await openJourneyMessenger(sink);
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});
  finishConversation();
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});
  expect(sink.mock.calls.map(([event]) => event)).toEqual([
    {
      name: "messenger_unit_opened",
      unitId: "appointment-confirmation",
      entryStatus: "available",
      entrySource: "journey",
    },
    {
      name: "messenger_unit_exited_incomplete",
      unitId: "appointment-confirmation",
      entrySource: "journey",
    },
    {
      name: "messenger_unit_opened",
      unitId: "appointment-confirmation",
      entryStatus: "available",
      entrySource: "journey",
    },
    {
      name: "messenger_unit_completed",
      unitId: "appointment-confirmation",
      entrySource: "journey",
    },
    {
      name: "messenger_unit_opened",
      unitId: "appointment-confirmation",
      entryStatus: "completed",
      entrySource: "journey",
    },
  ]);
});

test("완료 재입장과 결과 보기는 completed 이벤트를 다시 내지 않는다", async () => {
  const sink = vi.fn();
  await openJourneyMessenger(sink);
  finishConversation();
  fireEvent.tap(screen.getByTestId("messenger-finish"), {});
  tapLessonCompleteExit();
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});
  fireEvent.tap(screen.getByTestId("messenger-finish"), {});
  expect(
    sink.mock.calls.filter(
      ([event]) => (event as { name: string }).name === "messenger_unit_completed",
    ),
  ).toHaveLength(1);
});

test("명시적 null sink와 기본 null은 기능을 안전하게 유지한다", async () => {
  await expect(
    renderSignedInApp(<App seenEpisodeIntroIds={seenIntros} messengerEventSink={null} />),
  ).resolves.toBeDefined();
  await expect(renderSignedInApp(<App seenEpisodeIntroIds={seenIntros} />)).resolves.toBeDefined();
});
