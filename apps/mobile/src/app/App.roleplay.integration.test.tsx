import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { AppJourneySeed } from "./App";
import type { MessengerEventSink } from "../screens/messenger/messenger.contract";
import type { PhoneCallEventSink } from "../screens/phone-call/phone-call.contract";
import type { VisualNovelEventSink } from "../screens/visual-novel/visual-novel.contract";
import { authTokenStorageKey } from "../lib/auth-token";
import { entrySplashDurationMs } from "../lib/entry-flow";

// App · navReducer · BottomNavigator · RoleplayListScreen · RoleplayListItem ·
// 세 특별 유닛 화면 · 여정 맵의 실제 결선을 봅니다(ADR-0006 D4).

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

// I5가 「여덟 항목」이라 부르는 여정 맵 데이터-status 축입니다. 일반 스텝 다섯 +
// 특별 유닛 셋입니다.
const journeyStateTestIds = [
  "ui-lynx-learning-unit-greeting",
  "ui-lynx-learning-unit-introduction",
  "ui-lynx-learning-unit-ordering",
  "ui-lynx-learning-unit-appointment",
  "ui-lynx-learning-unit-directions",
  `ui-lynx-learning-unit-${messengerUnitId}`,
  `ui-lynx-learning-unit-${phoneCallUnitId}`,
  `ui-lynx-learning-unit-${visualNovelUnitId}`,
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

// 기존 `render` 직접 호출 자리를 대신하는 공용 헬퍼(`renderApp`)입니다. 토큰이 있는
// 상태를 스텁하고 가짜 타이머로 `entrySplashDurationMs`만큼 전진시켜 진입
// 스플래시를 건너뜁니다. 이 파일이 이미 세운 `NativeModules` 스텁(있으면,
// `stubCompletionAnnouncementHost()`의 낭독 모듈)을 지우지 않고 `StorageModule`만
// 얹습니다.
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

// 튜토리얼을 다 끝낸 진행입니다 — 롤플레이는 에피소드를 끝내야 열립니다. 이 파일이
// 보는 것은 **열린 뒤의** 롤플레이(연습 경계 · 나가기 · 이벤트)이므로, 여덟 유닛을
// 매번 걷는 대신 끝난 상태에서 시작합니다. 잠김은 아래 [I8]~[I10]이 제품의 씨앗으로
// 봅니다.
const finishedTutorial: AppJourneySeed = {
  completedStepCount: 5,
  completedMessengerUnitIds: [messengerUnitId],
  completedPhoneCallUnitIds: [phoneCallUnitId],
  visualNovelProgress: { status: "completed", beatIndex: 2 },
};

function openRoleplayTab(sinks: Sinks = {}) {
  renderApp(<App journeySeed={finishedTutorial} {...sinks} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});
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

test("[I1] 실제 데이터로 선 구획 — 에피소드 하나에 카드 셋이 여정 순서로 서고 완료·잠김 표식이 없다", () => {
  openRoleplayTab();

  const list = screen.getByTestId("roleplay-list-screen-list");
  const sectionTestIds = Array.from(list.children).map((el) => el.getAttribute("data-testid"));
  expect(sectionTestIds).toEqual(["roleplay-list-section-tutorial"]);
  expect(screen.getByTestId("roleplay-list-section-tutorial")).toHaveAttribute(
    "data-unlocked",
    "true",
  );
  expect(screen.getByTestId("roleplay-list-section-header-tutorial")).toHaveAttribute(
    "accessibility-label",
    "Episode 0. Tutorial.",
  );

  const row = screen.getByTestId("roleplay-list-section-row-tutorial");
  const itemTestIds = Array.from(row.children).map((el) => el.getAttribute("data-testid"));
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

  // 열린 에피소드에는 완료 표식도 잠김 표식도 없습니다 — 롤플레이는 몇 번을 해도
  // 「끝낸 것」이 되지 않습니다.
  expect(list).not.toHaveTextContent("완료됨");
  expect(list.querySelectorAll("[data-status]")).toHaveLength(0);
  expect(list.querySelectorAll('[data-locked="true"]')).toHaveLength(0);
});

// -------------------------------------------------------------- I2 (AC2)

test("[I2] 메신저 항목을 열면 롤플레이 스택에 push되고 여정 스택은 불변이다", () => {
  openRoleplayTab();
  openRoleplayItem(messengerUnitId);
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
  // 쌓인 화면에는 탭이 없습니다(ADR-0007 2026-09-27 개정) — 나가야 목록 루트에서 다시
  // 섭니다. 그래서 탭 확인도 나간 뒤에 합니다.
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(0);

  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay")).toHaveAttribute(
    "accessibility-label",
    "롤플레이, 선택됨",
  );

  // 여정 스택은 건드려지지 않았습니다 — 여정 탭은 여전히 맵 루트입니다.
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("messenger-screen")).not.toBeInTheDocument();
});

test("[I2] 전화 항목을 열면 롤플레이 스택에 push되고 여정 스택은 불변이다", () => {
  openRoleplayTab();
  openRoleplayItem(phoneCallUnitId);
  expect(screen.getByTestId("phone-call-screen")).toBeInTheDocument();
  // 쌓인 화면에는 탭이 없습니다(ADR-0007 2026-09-27 개정) — 나가야 목록 루트에서 다시
  // 섭니다. 그래서 탭 확인도 나간 뒤에 합니다.
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(0);

  fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay")).toHaveAttribute(
    "accessibility-label",
    "롤플레이, 선택됨",
  );

  // 여정 스택은 건드려지지 않았습니다 — 여정 탭은 여전히 맵 루트입니다.
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("phone-call-screen")).not.toBeInTheDocument();
});

test("[I2] 비주얼 노벨 항목을 열면 롤플레이 스택에 push되고 여정 스택은 불변이다", () => {
  openRoleplayTab();
  openRoleplayItem(visualNovelUnitId);
  expect(screen.getByTestId("visual-novel-screen")).toBeInTheDocument();
  // 쌓인 화면에는 탭이 없습니다(ADR-0007 2026-09-27 개정) — 나가야 목록 루트에서 다시
  // 섭니다. 그래서 탭 확인도 나간 뒤에 합니다.
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(0);

  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay")).toHaveAttribute(
    "accessibility-label",
    "롤플레이, 선택됨",
  );

  // 여정 스택은 건드려지지 않았습니다 — 여정 탭은 여전히 맵 루트입니다.
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("visual-novel-screen")).not.toBeInTheDocument();
});

// -------------------------------------------------------------- I3 (AC3)

// 재고정: 롤플레이가 에피소드를 끝내야 열리므로, 「여정 진행」은 이제 「여정에서 셋을
// 모두 끝낸 상태」입니다(`finishedTutorial`). 보는 것은 그대로입니다 — 여정에서 끝까지
// 간 유닛도 롤플레이에서는 처음부터 섭니다.
test("[I3] 여정에서 셋을 모두 끝냈어도 롤플레이는 항상 처음부터 선다", () => {
  openRoleplayTab();

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

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
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
  renderApp(<App />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});

  fireEvent.tap(screen.getByTestId(`ui-lynx-learning-unit-${messengerUnitId}`), {});
  expect(screen.getByTestId("messenger-screen-exit")).toHaveTextContent("맵으로");
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});

  fireEvent.tap(screen.getByTestId(`ui-lynx-learning-unit-${phoneCallUnitId}`), {});
  expect(screen.getByTestId("phone-call-exit-button")).toHaveTextContent("맵으로");
  fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});

  fireEvent.tap(screen.getByTestId(`ui-lynx-learning-unit-${visualNovelUnitId}`), {});
  expect(screen.getByTestId("visual-novel-exit-button")).toHaveTextContent("맵으로");
});

// -------------------------------------------------------------------------- I5 (AC5)

// 재고정: 롤플레이가 열려 있으려면 여정의 여덟이 이미 끝나 있어야 하므로, 「그대로」는
// 「여덟이 끝난 채 그대로」입니다. 예전에는 롤플레이 뒤 여정 유닛을 다시 열어 처음부터
// 서는지도 봤는데, 그 단언은 여정이 미완료일 때만 뜻이 있어 걷었습니다 — 롤플레이가
// 여정의 완료를 걸지 않는다는 것은 결선의 단위 검사(연습 경계)가 집니다.
test("[I5] 롤플레이를 끝까지 진행해도 여정 상태 여덟 값이 그대로다", () => {
  renderApp(<App journeySeed={finishedTutorial} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  const before = journeyStateSnapshot();

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});

  // 메신저: 끝까지 → 처음부터 보기 → 다시 끝까지 진행합니다.
  openRoleplayItem(messengerUnitId);
  finishMessengerConversation();
  fireEvent.tap(screen.getByTestId("messenger-replay"), {});
  finishMessengerConversation();
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});

  // 전화: 세 턴 끝까지 진행합니다.
  openRoleplayItem(phoneCallUnitId);
  finishPhoneCall();
  fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});

  // 비주얼 노벨: 끝까지 → 처음부터 보기 → 다시 끝까지 진행합니다.
  openRoleplayItem(visualNovelUnitId);
  advanceVisualNovelOnce();
  advanceVisualNovelOnce();
  fireEvent.tap(screen.getByTestId("visual-novel-replay-button"), {});
  advanceVisualNovelOnce();
  advanceVisualNovelOnce();
  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  expect(journeyStateSnapshot()).toEqual(before);
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
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  fireEvent.tap(screen.getByTestId(`ui-lynx-learning-unit-${phoneCallUnitId}`), {});

  expect(phoneCallEventSink).toHaveBeenLastCalledWith({
    name: "phone_call_unit_opened",
    unitId: phoneCallUnitId,
    entrySource: "journey",
    // 롤플레이가 열려 있다는 것은 여정에서 이 유닛을 이미 끝냈다는 뜻입니다.
    entryStatus: "completed",
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
    renderApp(
      <App
        journeySeed={finishedTutorial}
        messengerEventSink={null}
        phoneCallEventSink={null}
        visualNovelEventSink={null}
      />,
    ),
  ).not.toThrow();
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});

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
  // 쌓인 화면에는 탭이 없습니다(ADR-0007 2026-09-27 개정) — 나가야 목록 루트에서
  // 다시 서고, 그때 여정 탭으로 갈 수 있습니다.
  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
});

// -------------------------------------------------------------- I8~I11 (에피소드 해금)
//
// 여기서부터는 제품의 씨앗(스텝 둘 완료 · 특별 유닛 0건)으로 부팅합니다 — 잠김을 봅니다.

function openLockedRoleplayTab() {
  renderApp(<App />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});
}

test("[I8] 에피소드를 끝내기 전에는 구획이 잠겨 있고 카드를 눌러도 열리지 않는다", () => {
  openLockedRoleplayTab();

  expect(screen.getByTestId("roleplay-list-section-tutorial")).toHaveAttribute(
    "data-unlocked",
    "false",
  );
  expect(screen.getByTestId("roleplay-list-section-header-tutorial")).toHaveAttribute(
    "accessibility-label",
    "Episode 0. Tutorial., 잠김, 여정에서 이 에피소드를 끝내면 열립니다",
  );
  expect(screen.queryByTestId("roleplay-list-section-view-all-tutorial")).not.toBeInTheDocument();

  for (const unitId of [messengerUnitId, phoneCallUnitId, visualNovelUnitId]) {
    expect(screen.getByTestId(`roleplay-list-item-${unitId}`)).toHaveAttribute(
      "data-locked",
      "true",
    );
    expect(screen.getByTestId(`roleplay-list-item-lock-${unitId}`)).toBeInTheDocument();
    openRoleplayItem(unitId);
    expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();
  }
  expect(screen.queryByTestId("messenger-screen")).not.toBeInTheDocument();
});

test("[I9] 여정에서 특별 유닛 하나만 끝내서는 에피소드가 열리지 않는다", () => {
  renderApp(<App />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  fireEvent.tap(screen.getByTestId(`ui-lynx-learning-unit-${messengerUnitId}`), {});
  finishMessengerConversation();
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});

  expect(screen.getByTestId("roleplay-list-section-tutorial")).toHaveAttribute(
    "data-unlocked",
    "false",
  );
  expect(screen.getByTestId(`roleplay-list-item-${messengerUnitId}`)).toHaveAttribute(
    "data-locked",
    "true",
  );
});

test("[I10] 마지막 하나가 남으면 잠겨 있고, 그것을 끝내는 순간 열린다", () => {
  // 비주얼 노벨만 남긴 진행입니다.
  renderApp(
    <App
      journeySeed={{ ...finishedTutorial, visualNovelProgress: { status: "active", beatIndex: 0 } }}
    />,
  );
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});
  expect(screen.getByTestId("roleplay-list-section-tutorial")).toHaveAttribute(
    "data-unlocked",
    "false",
  );

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  fireEvent.tap(screen.getByTestId(`ui-lynx-learning-unit-${visualNovelUnitId}`), {});
  advanceVisualNovelOnce();
  advanceVisualNovelOnce();
  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});
  expect(screen.getByTestId("roleplay-list-section-tutorial")).toHaveAttribute(
    "data-unlocked",
    "true",
  );
  openRoleplayItem(messengerUnitId);
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
});

test("[I11] 전체 보기는 그 에피소드의 화면을 롤플레이 스택에 쌓고, 나가기는 목록으로 돌아간다", () => {
  openRoleplayTab();

  fireEvent.tap(screen.getByTestId("roleplay-list-section-view-all-tutorial"), {});

  expect(screen.getByTestId("roleplay-episode-screen-title")).toHaveTextContent(
    "Episode 0. Tutorial.",
  );
  expect(screen.queryByTestId("roleplay-list-screen-title")).not.toBeInTheDocument();
  // ⟨2026-09-28, ADR-0007 개정⟩ 바텀 네비게이션은 **탭 루트에서만** 섭니다. 에피소드
  // 화면은 롤플레이 탭 위에 쌓인 화면이라 바가 없습니다 — 「탭이 롤플레이 그대로다」는
  // 아래에서 목록으로 돌아온 뒤에 봅니다.
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(0);
  const list = screen.getByTestId("roleplay-episode-screen-list");
  expect(Array.from(list.children).map((el) => el.getAttribute("data-testid"))).toEqual([
    `roleplay-list-item-${messengerUnitId}`,
    `roleplay-list-item-${phoneCallUnitId}`,
    `roleplay-list-item-${visualNovelUnitId}`,
  ]);

  fireEvent.tap(
    within(screen.getByTestId("roleplay-episode-screen-exit")).getByTestId("ui-lynx-round-button"),
    {},
  );
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("roleplay-episode-screen-title")).not.toBeInTheDocument();
  // 탭 루트로 돌아왔으므로 바가 다시 서고, 탭은 롤플레이 그대로입니다.
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay")).toHaveAttribute(
    "data-selected",
    "true",
  );
});

// 연습 유닛의 `목록으로`는 한 칸 뒤가 아니라 활성 스택의 루트입니다(ADR-0007 D6). 펼친
// 화면에서 열었어도 돌아가는 곳은 롤플레이 화면입니다.
test("[I12] 펼친 화면에서 연 유닛의 목록으로는 롤플레이 화면으로 돌아간다", () => {
  openRoleplayTab();
  fireEvent.tap(screen.getByTestId("roleplay-list-section-view-all-tutorial"), {});

  openRoleplayItem(messengerUnitId);
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});

  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("roleplay-episode-screen-title")).not.toBeInTheDocument();
});

// -------------------------------------------------------------- I13~I15 (결제 롤플레이)

test("[I13] 에피소드를 끝내기 전에는 결제 롤플레이도 에피소드 잠김이고 눌러도 안내가 없다", () => {
  openLockedRoleplayTab();

  const row = screen.getByTestId("roleplay-list-section-premium-row-tutorial");
  expect(row.children.length).toBeGreaterThan(0);
  for (const card of Array.from(row.children)) {
    expect(card).toHaveAttribute("data-lock", "episode");
    fireEvent.tap(card, {});
  }
  expect(screen.queryByTestId("roleplay-list-premium-notice")).not.toBeInTheDocument();
});

test("[I14] 에피소드를 끝내면 기본 롤플레이는 열리고 결제 롤플레이는 결제 잠김이 된다", () => {
  openRoleplayTab();

  expect(screen.getByTestId(`roleplay-list-item-${messengerUnitId}`)).toHaveAttribute(
    "data-locked",
    "false",
  );
  const row = screen.getByTestId("roleplay-list-section-premium-row-tutorial");
  for (const card of Array.from(row.children)) {
    expect(card).toHaveAttribute("data-lock", "payment");
  }
});

test("[I15] 결제 잠김 카드를 누르면 안내가 뜨고 화면은 옮겨 가지 않는다", () => {
  openRoleplayTab();
  const row = screen.getByTestId("roleplay-list-section-premium-row-tutorial");

  fireEvent.tap(row.children[0] as Element, {});

  expect(screen.getByTestId("roleplay-list-premium-notice")).toBeInTheDocument();
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay")).toHaveAttribute(
    "data-selected",
    "true",
  );

  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-dialog-action-close")).getByTestId("ui-lynx-button"),
    {},
  );
  expect(screen.queryByTestId("roleplay-list-premium-notice")).not.toBeInTheDocument();
});
