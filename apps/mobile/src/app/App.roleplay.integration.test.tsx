import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { MessengerEventSink } from "../screens/messenger/messenger.contract";
import type { PhoneCallEventSink } from "../screens/phone-call/phone-call.contract";
import type { VisualNovelEventSink } from "../screens/visual-novel/visual-novel.contract";

// LIB-255 integration 계층(ADR-0006 D4): App · navReducer · BottomNavigator ·
// RoleplayListScreen · RoleplayListItem · 세 특별 유닛 화면 · 여정 맵의 실제 결선.
// 계획 정본: .agent-harness/work/lib-255/test-plan.md integration §
// `App.roleplay.integration.test.tsx`(I1~I7). 케이스 ID는 spec.md §10의 수용 기준
// 매핑과 같다.
//
// 기대 red(test-plan.md 「integration red 기대」): App이 아직 `roleplay-list`에
// `items={[]}` · `onSelectItem={() => undefined}`를 넘기고, `roleplay-messenger` ·
// `roleplay-phone-call` · `roleplay-visual-novel` case가 `null`을 반환한다
// (ui-scaffold 상태, App.tsx의 LIB-255 주석). 그래서 이 파일의 모든 케이스가
// `getByTestId`에서 빨갛다 — import·수집 실패가 아니라 요소 부재로 인한 단언 실패다.

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void) => unknown>(),
  stopAudio: vi.fn<() => void>(),
}));
vi.mock("../lib/audio", () => audio);

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
  vi.clearAllMocks();
});

const messengerUnitId = "appointment-confirmation";
const phoneCallUnitId = "appointment-confirmation-phone-call";
const visualNovelUnitId = "cafe-arrival-visual-novel";

// I5가 「여덟 항목」이라 부르는 여정 맵 데이터-status 축. 일반 스텝 다섯 + 특별 유닛 셋.
const journeyStateTestIds = [
  "journey-step-node-greeting",
  "journey-step-node-introduction",
  "journey-step-node-ordering",
  "journey-step-node-appointment",
  "journey-step-node-directions",
  `journey-messenger-item-${messengerUnitId}`,
  `journey-map-phone-call-${phoneCallUnitId}`,
  `journey-map-visual-novel-${visualNovelUnitId}`,
] as const;

function journeyStateSnapshot(): readonly (string | null)[] {
  return journeyStateTestIds.map((testId) =>
    screen.getByTestId(testId).getAttribute("data-status"),
  );
}

type Sinks = {
  messengerEventSink?: MessengerEventSink;
  phoneCallEventSink?: PhoneCallEventSink;
  visualNovelEventSink?: VisualNovelEventSink;
};

function openRoleplayTab(sinks: Sinks = {}) {
  render(<App {...sinks} />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-roleplay"), {});
}

function openRoleplayItem(unitId: string) {
  fireEvent.tap(screen.getByTestId(`roleplay-list-item-${unitId}`), {});
}

function finishMessengerConversation() {
  fireEvent.tap(screen.getByTestId("messenger-reply-self-accept"), {});
  fireEvent.tap(screen.getByTestId("messenger-reply-self-thanks"), {});
}

function playPhoneCallTurn(replyTestId: string) {
  let finish: (() => void) | undefined;
  audio.playAudio.mockImplementation((_source: string, done: () => void) => {
    finish = done;
    return "started";
  });
  fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
  act(() => finish?.());
  fireEvent.tap(screen.getByTestId(replyTestId), {});
}

function finishPhoneCall() {
  playPhoneCallTurn("phone-call-reply-confirm-time-reply");
  playPhoneCallTurn("phone-call-reply-confirm-place-reply");
  playPhoneCallTurn("phone-call-reply-goodbye-reply");
}

function advanceVisualNovelOnce() {
  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
}

// -------------------------------------------------------------- I1 · I1b (AC1)

test("[I1] 실제 데이터로 선 목록 — 항목 셋이 여정 순서로 서고 완료·잠김 표식이 없다", () => {
  openRoleplayTab();

  const list = screen.getByTestId("roleplay-list-screen-list");
  const itemTestIds = Array.from(list.children).map((el) => el.getAttribute("data-testid"));
  expect(itemTestIds).toEqual([
    `roleplay-list-item-${messengerUnitId}`,
    `roleplay-list-item-${phoneCallUnitId}`,
    `roleplay-list-item-${visualNovelUnitId}`,
  ]);

  expect(screen.getByTestId(`roleplay-list-item-title-${messengerUnitId}`)).toHaveTextContent(
    "약속 확인 메시지",
  );
  expect(screen.getByTestId(`roleplay-list-item-form-${messengerUnitId}`)).toHaveTextContent(
    "메신저",
  );
  expect(screen.getByTestId(`roleplay-list-item-${messengerUnitId}`)).toHaveAttribute(
    "accessibility-label",
    "약속 확인 메시지, 메신저",
  );

  expect(screen.getByTestId(`roleplay-list-item-title-${phoneCallUnitId}`)).toHaveTextContent(
    "약속 확인 전화",
  );
  expect(screen.getByTestId(`roleplay-list-item-form-${phoneCallUnitId}`)).toHaveTextContent(
    "전화",
  );
  expect(screen.getByTestId(`roleplay-list-item-${phoneCallUnitId}`)).toHaveAttribute(
    "accessibility-label",
    "약속 확인 전화, 전화",
  );

  expect(screen.getByTestId(`roleplay-list-item-title-${visualNovelUnitId}`)).toHaveTextContent(
    "카페에 도착한 지민",
  );
  expect(screen.getByTestId(`roleplay-list-item-form-${visualNovelUnitId}`)).toHaveTextContent(
    "비주얼 노벨",
  );
  expect(screen.getByTestId(`roleplay-list-item-${visualNovelUnitId}`)).toHaveAttribute(
    "accessibility-label",
    "카페에 도착한 지민, 비주얼 노벨",
  );

  expect(list).not.toHaveTextContent("완료됨");
  expect(list).not.toHaveTextContent("잠김");
  expect(list.querySelectorAll("[data-status]")).toHaveLength(0);
});

test("[I1b] 여정에서 메신저를 완료해도 롤플레이 목록은 새지 않는다", () => {
  render(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  fireEvent.tap(screen.getByTestId(`journey-messenger-item-${messengerUnitId}`), {});
  finishMessengerConversation();
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-roleplay"), {});

  const list = screen.getByTestId("roleplay-list-screen-list");
  const itemTestIds = Array.from(list.children).map((el) => el.getAttribute("data-testid"));
  expect(itemTestIds).toEqual([
    `roleplay-list-item-${messengerUnitId}`,
    `roleplay-list-item-${phoneCallUnitId}`,
    `roleplay-list-item-${visualNovelUnitId}`,
  ]);
  expect(list).not.toHaveTextContent("완료됨");
  expect(list.querySelectorAll("[data-status]")).toHaveLength(0);
});

// -------------------------------------------------------------- I2 (AC2)

test("[I2] 메신저 항목을 열면 롤플레이 스택에 push되고 여정 스택은 불변이다", () => {
  openRoleplayTab();
  openRoleplayItem(messengerUnitId);
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toHaveAttribute(
    "accessibility-label",
    "롤플레이, 선택됨",
  );

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("messenger-screen")).not.toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-roleplay"), {});
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
});

test("[I2] 전화 항목을 열면 롤플레이 스택에 push되고 여정 스택은 불변이다", () => {
  openRoleplayTab();
  openRoleplayItem(phoneCallUnitId);
  expect(screen.getByTestId("phone-call-screen")).toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toHaveAttribute(
    "accessibility-label",
    "롤플레이, 선택됨",
  );

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("phone-call-screen")).not.toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-roleplay"), {});
  expect(screen.getByTestId("phone-call-screen")).toBeInTheDocument();
});

test("[I2] 비주얼 노벨 항목을 열면 롤플레이 스택에 push되고 여정 스택은 불변이다", () => {
  openRoleplayTab();
  openRoleplayItem(visualNovelUnitId);
  expect(screen.getByTestId("visual-novel-screen")).toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toHaveAttribute(
    "accessibility-label",
    "롤플레이, 선택됨",
  );

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("visual-novel-screen")).not.toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-roleplay"), {});
  expect(screen.getByTestId("visual-novel-screen")).toBeInTheDocument();
});

// -------------------------------------------------------------- I3 (AC3)

test("[I3] 여정 진행과 무관하게 롤플레이는 항상 처음부터 선다", () => {
  render(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});

  // 여정에서 메신저 완료
  fireEvent.tap(screen.getByTestId(`journey-messenger-item-${messengerUnitId}`), {});
  finishMessengerConversation();
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});

  // 여정에서 전화 완료
  fireEvent.tap(screen.getByTestId(`journey-map-phone-call-${phoneCallUnitId}`), {});
  finishPhoneCall();
  fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});

  // 여정에서 비주얼 노벨을 find까지 진행하고 미완료로 나간다
  fireEvent.tap(screen.getByTestId(`journey-map-visual-novel-${visualNovelUnitId}`), {});
  advanceVisualNovelOnce();
  expect(screen.getByTestId("visual-novel-scene-find")).toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-roleplay"), {});

  openRoleplayItem(messengerUnitId);
  expect(screen.getByTestId("messenger-screen-progress")).toHaveTextContent("대화 1 / 2");
  expect(screen.getByTestId("messenger-message-list").children).toHaveLength(1);
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});

  openRoleplayItem(phoneCallUnitId);
  expect(screen.getByTestId("phone-call-status")).toHaveTextContent("통화 준비");
  expect(screen.getByTestId("phone-call-audio-button")).toHaveAttribute(
    "accessibility-label",
    "통화 시작",
  );
  expect(
    screen
      .queryAllByTestId(/^phone-call-transcript-/)
      .map((node) => node.getAttribute("data-testid")),
  ).toHaveLength(1);
  fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});

  openRoleplayItem(visualNovelUnitId);
  expect(screen.getByTestId("visual-novel-scene-arrive")).toBeInTheDocument();
  expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent("장면 1 / 3");
});

test("[I3] 여정에서 비주얼 노벨을 완료한 뒤에도 롤플레이는 arrive에서 시작한다", () => {
  render(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  fireEvent.tap(screen.getByTestId(`journey-map-visual-novel-${visualNovelUnitId}`), {});
  advanceVisualNovelOnce();
  advanceVisualNovelOnce();
  expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent("이야기 완료");
  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-roleplay"), {});
  openRoleplayItem(visualNovelUnitId);
  expect(screen.getByTestId("visual-novel-scene-arrive")).toBeInTheDocument();
  expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent("장면 1 / 3");
});

// -------------------------------------------------------------- I4 (AC4)

test("[I4] 롤플레이에서 연 메신저의 나가기는 목록으로이고 목록으로 돌아간 뒤 여정 탭은 맵 루트다", () => {
  openRoleplayTab();
  openRoleplayItem(messengerUnitId);
  expect(screen.getByTestId("messenger-screen-exit")).toHaveTextContent("목록으로");
  expect(screen.getByTestId("messenger-screen-exit")).toHaveAttribute(
    "accessibility-label",
    "목록으로",
  );
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();
});

test("[I4] 롤플레이에서 연 전화의 나가기는 목록으로이고 목록으로 돌아간다", () => {
  openRoleplayTab();
  openRoleplayItem(phoneCallUnitId);
  expect(screen.getByTestId("phone-call-exit-button")).toHaveTextContent("목록으로");
  expect(screen.getByTestId("phone-call-exit-button")).toHaveAttribute(
    "accessibility-label",
    "목록으로",
  );
  fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();
});

test("[I4] 롤플레이에서 연 비주얼 노벨의 나가기는 목록으로이고 목록으로 돌아간다", () => {
  openRoleplayTab();
  openRoleplayItem(visualNovelUnitId);
  expect(screen.getByTestId("visual-novel-exit-button")).toHaveTextContent("목록으로");
  expect(screen.getByTestId("visual-novel-exit-button")).toHaveAttribute(
    "accessibility-label",
    "목록으로",
  );
  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();
});

test("[I4] 여정에서 연 화면 셋의 나가기 라벨은 맵으로 그대로다(회귀)", () => {
  render(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});

  fireEvent.tap(screen.getByTestId(`journey-messenger-item-${messengerUnitId}`), {});
  expect(screen.getByTestId("messenger-screen-exit")).toHaveTextContent("맵으로");
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});

  fireEvent.tap(screen.getByTestId(`journey-map-phone-call-${phoneCallUnitId}`), {});
  expect(screen.getByTestId("phone-call-exit-button")).toHaveTextContent("맵으로");
  fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});

  fireEvent.tap(screen.getByTestId(`journey-map-visual-novel-${visualNovelUnitId}`), {});
  expect(screen.getByTestId("visual-novel-exit-button")).toHaveTextContent("맵으로");
});

// -------------------------------------------------------------- I5 (AC5) — §6 ③겹의 유일한 판정자

test("[I5] 롤플레이를 끝까지 진행해도 여정 상태 여덟 값이 그대로다", () => {
  render(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  const before = journeyStateSnapshot();

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-roleplay"), {});

  // 메신저: 끝까지 → 처음부터 보기 → 다시 끝까지
  openRoleplayItem(messengerUnitId);
  finishMessengerConversation();
  fireEvent.tap(screen.getByTestId("messenger-replay"), {});
  finishMessengerConversation();
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});

  // 전화: 세 턴 끝까지
  openRoleplayItem(phoneCallUnitId);
  finishPhoneCall();
  fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});

  // 비주얼 노벨: 끝까지 → 처음부터 보기 → 다시 끝까지
  openRoleplayItem(visualNovelUnitId);
  advanceVisualNovelOnce();
  advanceVisualNovelOnce();
  fireEvent.tap(screen.getByTestId("visual-novel-replay-button"), {});
  advanceVisualNovelOnce();
  advanceVisualNovelOnce();
  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  expect(journeyStateSnapshot()).toEqual(before);

  fireEvent.tap(screen.getByTestId(`journey-messenger-item-${messengerUnitId}`), {});
  expect(screen.getByTestId("messenger-screen-progress")).toHaveTextContent("대화 1 / 2");
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});

  fireEvent.tap(screen.getByTestId(`journey-map-visual-novel-${visualNovelUnitId}`), {});
  expect(screen.getByTestId("visual-novel-scene-arrive")).toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});

  fireEvent.tap(screen.getByTestId(`journey-map-phone-call-${phoneCallUnitId}`), {});
  expect(screen.getByTestId("phone-call-status")).toHaveTextContent("통화 준비");
});

// -------------------------------------------------------------- I6 (AC6)

test("[I6] 메신저 롤플레이 이벤트는 entrySource: roleplay를 싣고 entryStatus 키가 없다", () => {
  const messengerEventSink = vi.fn<NonNullable<MessengerEventSink>>();
  openRoleplayTab({ messengerEventSink });

  openRoleplayItem(messengerUnitId);
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {}); // active·replyIndex 0 → incomplete
  openRoleplayItem(messengerUnitId);
  finishMessengerConversation(); // 1회차 완료
  fireEvent.tap(screen.getByTestId("messenger-replay"), {});
  finishMessengerConversation(); // 2회차 완료(A2)

  expect(messengerEventSink.mock.calls.map(([event]) => event)).toEqual([
    { name: "messenger_unit_opened", unitId: messengerUnitId, entrySource: "roleplay" },
    {
      name: "messenger_unit_exited_incomplete",
      unitId: messengerUnitId,
      entrySource: "roleplay",
    },
    { name: "messenger_unit_opened", unitId: messengerUnitId, entrySource: "roleplay" },
    { name: "messenger_unit_completed", unitId: messengerUnitId, entrySource: "roleplay" },
    {
      name: "messenger_unit_replay_started",
      unitId: messengerUnitId,
      entrySource: "roleplay",
    },
    { name: "messenger_unit_completed", unitId: messengerUnitId, entrySource: "roleplay" },
  ]);
});

test("[I6] 전화는 열림 이벤트만 있고 출처로 journey·roleplay를 구분한다", () => {
  const phoneCallEventSink = vi.fn<NonNullable<PhoneCallEventSink>>();
  openRoleplayTab({ phoneCallEventSink });

  openRoleplayItem(phoneCallUnitId);
  fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});
  openRoleplayItem(phoneCallUnitId);

  expect(phoneCallEventSink.mock.calls.map(([event]) => event)).toEqual([
    { name: "phone_call_unit_opened", unitId: phoneCallUnitId, entrySource: "roleplay" },
    { name: "phone_call_unit_opened", unitId: phoneCallUnitId, entrySource: "roleplay" },
  ]);

  fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  fireEvent.tap(screen.getByTestId(`journey-map-phone-call-${phoneCallUnitId}`), {});

  expect(phoneCallEventSink).toHaveBeenLastCalledWith({
    name: "phone_call_unit_opened",
    unitId: phoneCallUnitId,
    entrySource: "journey",
    entryStatus: "available",
  });
});

test("[I6] 비주얼 노벨 롤플레이 이벤트는 entrySource: roleplay를 싣고 enter 종료는 exited_incomplete 0건이다", () => {
  const announcements = stubCompletionAnnouncementHost();
  const visualNovelEventSink = vi.fn<NonNullable<VisualNovelEventSink>>();
  openRoleplayTab({ visualNovelEventSink });

  openRoleplayItem(visualNovelUnitId);
  advanceVisualNovelOnce(); // → find, 미완료
  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {}); // find에서 이탈 → incomplete

  openRoleplayItem(visualNovelUnitId);
  advanceVisualNovelOnce();
  advanceVisualNovelOnce(); // → enter, 1회차 완료
  fireEvent.tap(screen.getByTestId("visual-novel-replay-button"), {});
  advanceVisualNovelOnce();
  advanceVisualNovelOnce(); // → enter, 2회차 완료(A2)
  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {}); // enter에서 이탈 → completed, 이벤트 없음

  expect(visualNovelEventSink.mock.calls.map(([event]) => event)).toEqual([
    { name: "visual_novel_unit_opened", unitId: visualNovelUnitId, entrySource: "roleplay" },
    {
      name: "visual_novel_unit_exited_incomplete",
      unitId: visualNovelUnitId,
      beatId: "find",
      entrySource: "roleplay",
    },
    { name: "visual_novel_unit_opened", unitId: visualNovelUnitId, entrySource: "roleplay" },
    { name: "visual_novel_unit_completed", unitId: visualNovelUnitId, entrySource: "roleplay" },
    {
      name: "visual_novel_unit_replay_started",
      unitId: visualNovelUnitId,
      entrySource: "roleplay",
    },
    { name: "visual_novel_unit_completed", unitId: visualNovelUnitId, entrySource: "roleplay" },
  ]);
  expect(
    visualNovelEventSink.mock.calls.filter(
      ([event]) => event.name === "visual_novel_unit_exited_incomplete",
    ),
  ).toHaveLength(1);
  expect(announcements).toEqual([{ content: "이야기 완료" }, { content: "이야기 완료" }]);
});

// -------------------------------------------------------------- I7 (AC6 부수 — null sink)

test("[I7] null sink에서도 I2·I4의 내비게이션 결과가 같고 던지지 않는다", () => {
  expect(() =>
    render(<App messengerEventSink={null} phoneCallEventSink={null} visualNovelEventSink={null} />),
  ).not.toThrow();
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-roleplay"), {});

  expect(() => openRoleplayItem(messengerUnitId)).not.toThrow();
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
  expect(screen.getByTestId("messenger-screen-exit")).toHaveTextContent("목록으로");
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();

  expect(() => openRoleplayItem(phoneCallUnitId)).not.toThrow();
  expect(screen.getByTestId("phone-call-screen")).toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();

  expect(() => openRoleplayItem(visualNovelUnitId)).not.toThrow();
  expect(screen.getByTestId("visual-novel-screen")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();
});
