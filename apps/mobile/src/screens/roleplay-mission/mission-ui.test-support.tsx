// 테스트 지원 — 미션 화면 ui · integration 테스트가 함께 쓰는 값과 조작입니다. 제품 코드는 import하지 않습니다.

import { act, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { missionListFixture, missionStartFixture } from "./mission-fixture";
import { initialMissionSession, missionSessionReducer } from "./mission-session";
import type {
  MissionCard,
  MissionSessionAction,
  MissionSessionState,
} from "./roleplay-mission.contract";

export const insets = { top: 0, bottom: 0, left: 0, right: 0 };

const cafe = missionListFixture.missions[1];
if (cafe === undefined) throw new Error("fixture");

export const cafeCard: MissionCard = {
  item: cafe,
  price: missionListFixture.price,
  imageUrl: null,
  ordinal: 6,
};

export const U1 = "11111111-1111-4111-8111-111111111111";
export const A1 = "22222222-2222-4222-8222-222222222222";

export const sessionAfter = (actions: readonly MissionSessionAction[]): MissionSessionState =>
  actions.reduce(missionSessionReducer, initialMissionSession("u06-cafe"));

export const startedActions: readonly MissionSessionAction[] = [
  { type: "start-requested" },
  { type: "started", value: missionStartFixture },
];

export const event = (name: string, data: unknown): MissionSessionAction => ({
  type: "turn-event",
  event: name,
  data: JSON.stringify(data),
});

export const id = (testId: string) => screen.getByTestId(testId);
export const maybe = (testId: string) => screen.queryByTestId(testId);
export const tapButton = (testId: string) =>
  fireEvent.tap(within(id(testId)).getByTestId("ui-lynx-button"), {});
export const tapRound = (testId: string) =>
  fireEvent.tap(within(id(testId)).getByTestId("ui-lynx-round-button"), {});

/** `<input>`의 네이티브 이벤트를 흉내 냅니다(메신저 `nativeInput`과 같은 방법). */
export function typeInto(testId: string, value: string, name: "input" | "confirm" = "input") {
  const target = screen.getByTestId(testId);
  const EventConstructor = target.ownerDocument.defaultView?.CustomEvent;
  if (EventConstructor === undefined) throw new Error("CustomEvent is unavailable");
  const ref = lynx.createSelectorQuery().select(`[data-testid="${testId}"]`);
  act(() => {
    fireEvent(
      ref as unknown as Element,
      new EventConstructor(`bindEvent:${name}`, { detail: { value } }),
    );
  });
}

/** 확인 다이얼로그의 단추를 id로 누릅니다(ui-lynx `Dialog`의 `ui-lynx-dialog-action-<id>`). */
export const tapDialogAction = (actionId: string) => tapButton(`ui-lynx-dialog-action-${actionId}`);
