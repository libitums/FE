import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { MessengerEventSink } from "../screens/messenger/messenger.contract";
import { authTokenStorageKey } from "../lib/auth-token";
import { entrySplashDurationMs } from "../lib/entry-flow";

// App · navigation · 여정 맵 · 메신저 화면의 실제 결선을 봅니다.

afterEach(() => {
  vi.unstubAllGlobals();
});

// 기존 `render` 직접 호출 자리를 대신하는 공용 헬퍼(`renderApp`)입니다. 토큰이 있는
// 상태를 스텁하고 가짜 타이머로 `entrySplashDurationMs`만큼 전진시켜 진입
// 스플래시를 건너뜁니다.
function renderApp(ui: Parameters<typeof render>[0]) {
  const previousNativeModules = (globalThis as { NativeModules?: unknown }).NativeModules;
  const tokenStore = new Map<string, string>();
  tokenStore.set(authTokenStorageKey, "existing-token");
  vi.stubGlobal("NativeModules", {
    ...(typeof previousNativeModules === "object" && previousNativeModules !== null
      ? previousNativeModules
      : {}),
    StorageModule: {
      get: (key: string) => tokenStore.get(key) ?? null,
      set: (key: string, value: string) => void tokenStore.set(key, value),
      remove: (key: string) => void tokenStore.delete(key),
    },
  });
  vi.useFakeTimers();
  const result = render(ui);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  vi.useRealTimers();
  return result;
}

function openJourneyMessenger(messengerEventSink?: MessengerEventSink) {
  renderApp(<App messengerEventSink={messengerEventSink} />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  fireEvent.tap(screen.getByTestId("journey-messenger-item-appointment-confirmation"), {});
}

function finishConversation() {
  fireEvent.tap(screen.getByTestId("messenger-reply-self-accept"), {});
  fireEvent.tap(screen.getByTestId("messenger-reply-self-thanks"), {});
}

test("맵의 약속 확인 메시지를 열면 실제 messenger 화면이 push된다", () => {
  openJourneyMessenger();
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
  expect(screen.getByTestId("messenger-screen-title")).toHaveTextContent("약속 확인 메시지");
  expect(screen.queryByTestId("journey-map-screen-title")).not.toBeInTheDocument();
});

test("두 답장을 완료하면 마지막 메시지와 맵 완료 표식이 함께 나타난다", () => {
  openJourneyMessenger();
  finishConversation();
  expect(screen.getByTestId("messenger-message-jimin-goodbye")).toHaveTextContent(
    "그럼 토요일에 봬요!",
  );
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  expect(screen.getByTestId("journey-messenger-item-appointment-confirmation")).toHaveAttribute(
    "data-status",
    "completed",
  );
  expect(screen.getByTestId("journey-messenger-item-appointment-confirmation")).toHaveTextContent(
    ", 완료됨",
  );
});

test("메신저 완료는 일반 completedStepCount와 directions 상태를 바꾸지 않는다", () => {
  renderApp(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  // initialCompletedStepCount=2입니다: greeting/소개는 done, appointment/directions는 locked입니다.
  expect(screen.getByTestId("journey-step-node-greeting")).toHaveAttribute("data-status", "done");
  expect(screen.getByTestId("journey-step-node-appointment")).toHaveAttribute(
    "data-status",
    "locked",
  );
  expect(screen.getByTestId("journey-step-node-directions")).toHaveAttribute(
    "data-status",
    "locked",
  );
  fireEvent.tap(screen.getByTestId("journey-messenger-item-appointment-confirmation"), {});
  finishConversation();
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  // 메신저 완료 전후 일반 스텝 상태는 동일한 계약 리터럴이어야 합니다.
  expect(screen.getByTestId("journey-step-node-greeting")).toHaveAttribute("data-status", "done");
  expect(screen.getByTestId("journey-step-node-appointment")).toHaveAttribute(
    "data-status",
    "locked",
  );
  expect(screen.getByTestId("journey-step-node-directions")).toHaveAttribute(
    "data-status",
    "locked",
  );
});

test("미완료로 맵을 나갔다 재입장하면 첫 메시지부터 시작한다", () => {
  openJourneyMessenger();
  fireEvent.tap(screen.getByTestId("messenger-reply-self-accept"), {});
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  fireEvent.tap(screen.getByTestId("journey-messenger-item-appointment-confirmation"), {});
  expect(screen.getByTestId("messenger-message-list").children).toHaveLength(1);
  expect(screen.getByTestId("messenger-screen-progress")).toHaveTextContent("대화 1 / 2");
});

test("완료 재입장은 전체 대화이며 replay 후에도 완료 기록을 보존한다", () => {
  openJourneyMessenger();
  finishConversation();
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  fireEvent.tap(screen.getByTestId("journey-messenger-item-appointment-confirmation"), {});
  expect(screen.getByTestId("messenger-message-list").children).toHaveLength(5);
  fireEvent.tap(screen.getByTestId("messenger-replay"), {});
  finishConversation();
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  expect(screen.getByTestId("journey-messenger-item-appointment-confirmation")).toHaveAttribute(
    "data-status",
    "completed",
  );
});

test("중복 완료는 완료 표식을 멱등적으로 유지한다", () => {
  openJourneyMessenger();
  finishConversation();
  fireEvent.tap(screen.getByTestId("messenger-replay"), {});
  finishConversation();
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  expect(screen.getByTestId("journey-messenger-item-appointment-confirmation")).toHaveAttribute(
    "data-status",
    "completed",
  );
});

test("다른 탭은 메신저와 공존하며 기존 탭 전환 동작을 유지한다", () => {
  openJourneyMessenger();
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-settings"), {});
  expect(screen.getByTestId("settings-screen-title")).toHaveTextContent("설정");
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  // 탭별 stack은 보존되므로 여정 탭으로 돌아오면 messenger가 다시 최상단입니다.
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
});

test("sink는 열린 시점에 정확한 opened payload를 한 번 받는다", () => {
  const sink = vi.fn();
  openJourneyMessenger(sink);
  expect(sink).toHaveBeenCalledTimes(1);
  expect(sink).toHaveBeenNthCalledWith(1, {
    name: "messenger_unit_opened",
    unitId: "appointment-confirmation",
    entryStatus: "available",
    entrySource: "journey",
  });
});

test("sink는 incomplete exit과 replay를 정확한 순서·payload로 받는다", () => {
  const sink = vi.fn();
  openJourneyMessenger(sink);
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  fireEvent.tap(screen.getByTestId("journey-messenger-item-appointment-confirmation"), {});
  finishConversation();
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  fireEvent.tap(screen.getByTestId("journey-messenger-item-appointment-confirmation"), {});
  fireEvent.tap(screen.getByTestId("messenger-replay"), {});
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
    {
      name: "messenger_unit_replay_started",
      unitId: "appointment-confirmation",
      entrySource: "journey",
    },
  ]);
});

test("완료 후 replay를 다시 완료해도 completed 이벤트는 중복되지 않는다", () => {
  const sink = vi.fn();
  openJourneyMessenger(sink);
  finishConversation();
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  fireEvent.tap(screen.getByTestId("journey-messenger-item-appointment-confirmation"), {});
  fireEvent.tap(screen.getByTestId("messenger-replay"), {});
  finishConversation();
  expect(
    sink.mock.calls.filter(
      ([event]) => (event as { name: string }).name === "messenger_unit_completed",
    ),
  ).toHaveLength(1);
});

test("명시적 null sink와 기본 null은 기능을 안전하게 유지한다", () => {
  expect(() => renderApp(<App messengerEventSink={null} />)).not.toThrow();
  expect(() => renderApp(<App />)).not.toThrow();
});
