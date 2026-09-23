// 롤플레이 연습 콜백 여덟을 만듭니다. **여정 상태 넷과 그 setter를 받지 않는
// 것**이 이 파일의 경계입니다 — sink 호출 · `announceCompletion` ·
// `dispatch(push/backToRoot)` 말고 아무것도 하지 않습니다.

import type { Dispatch } from "@lynx-js/react";

import { announceCompletion } from "../lib/accessibility";
import type {
  MessengerEventSink,
  MessengerExitOutcome,
  MessengerUnitId,
} from "../screens/messenger/messenger.contract";
import { practiceVisualNovelExitOutcome } from "../screens/visual-novel/visual-novel";
import type {
  VisualNovelAdvanceOutcome,
  VisualNovelBeatId,
  VisualNovelEventSink,
  VisualNovelUnitId,
} from "../screens/visual-novel/visual-novel.contract";
import type { NavAction } from "./nav-state";

export type RoleplayWiringArgs = {
  readonly messengerEventSink: MessengerEventSink;
  readonly visualNovelEventSink: VisualNovelEventSink;
  readonly dispatch: Dispatch<NavAction>;
};

export function roleplayWiring({
  messengerEventSink,
  visualNovelEventSink,
  dispatch,
}: RoleplayWiringArgs) {
  return {
    onMessengerExit: (id: MessengerUnitId, outcome: MessengerExitOutcome) => {
      // 계약상 중도 이탈만 기록합니다(여정과 같은 규약).
      if (outcome === "incomplete")
        messengerEventSink?.({
          name: "messenger_unit_exited_incomplete",
          unitId: id,
          entrySource: "roleplay",
        });
      dispatch({ type: "backToRoot" });
    },
    // 중복 거름 없음 — 회차마다 발화합니다.
    onMessengerComplete: (id: MessengerUnitId) => {
      messengerEventSink?.({
        name: "messenger_unit_completed",
        unitId: id,
        entrySource: "roleplay",
      });
    },
    onMessengerReplay: (id: MessengerUnitId) =>
      messengerEventSink?.({
        name: "messenger_unit_replay_started",
        unitId: id,
        entrySource: "roleplay",
      }),
    onPhoneCallComplete: () => {
      "background only";
      // 전화 완료 이벤트가 없고 기록도 없습니다 — 아무것도 하지 않습니다.
    },
    onPhoneCallExit: () => {
      "background only";
      dispatch({ type: "backToRoot" });
    },
    onVisualNovelAdvance: (id: VisualNovelUnitId, outcome: VisualNovelAdvanceOutcome) => {
      "background only";
      // `outcome.progress`는 버립니다 — 연습의 진행값은 늘 처음이라 뜻이
      // 없습니다.
      if (outcome.completedNow) {
        if (outcome.announcement !== null) announceCompletion(outcome.announcement);
        visualNovelEventSink?.({
          name: "visual_novel_unit_completed",
          unitId: id,
          entrySource: "roleplay",
        });
      }
    },
    onVisualNovelExit: (id: VisualNovelUnitId, beatId: VisualNovelBeatId) => {
      "background only";
      if (practiceVisualNovelExitOutcome(beatId) === "incomplete") {
        visualNovelEventSink?.({
          name: "visual_novel_unit_exited_incomplete",
          unitId: id,
          beatId,
          entrySource: "roleplay",
        });
      }
      dispatch({ type: "backToRoot" });
    },
    onVisualNovelReplay: (id: VisualNovelUnitId) => {
      "background only";
      visualNovelEventSink?.({
        name: "visual_novel_unit_replay_started",
        unitId: id,
        entrySource: "roleplay",
      });
    },
  };
}
