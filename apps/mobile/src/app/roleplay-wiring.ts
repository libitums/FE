import type { AnswerResult } from "../lib/answer-result";
// 롤플레이 연습 콜백 여덟을 만듭니다. **여정 상태 넷과 그 setter를 받지 않는
// 것**이 이 파일의 경계입니다 — sink 호출 ·
// `dispatch(push/backToRoot)` 말고 아무것도 하지 않습니다.

import type { Dispatch } from "@lynx-js/react";

import type {
  MessengerEventSink,
  MessengerExitOutcome,
  MessengerUnitId,
} from "../screens/messenger/messenger.contract";
import type { PhoneCallUnitId } from "../screens/phone-call/phone-call.contract";
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
    // 끝난 대화의 `결과 보기`입니다. 메신저 화면을 학습 완료로 갈아 끼웁니다 — 끝난
    // 대화는 스택에 남길 자리가 아닙니다(학습 세션 → 평가와 같은 `replace`).
    onMessengerFinish: (id: MessengerUnitId, results: readonly AnswerResult[]) =>
      dispatch({ type: "replace", screen: { name: "messenger-complete", unitId: id, results } }),
    onPhoneCallComplete: (id: PhoneCallUnitId) => {
      "background only";
      dispatch({ type: "replace", screen: { name: "special-unit-complete", unitId: id } });
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
        visualNovelEventSink?.({
          name: "visual_novel_unit_completed",
          unitId: id,
          entrySource: "roleplay",
        });
      }
    },
    onVisualNovelExit: (id: VisualNovelUnitId, beatId: VisualNovelBeatId) => {
      "background only";
      {
        visualNovelEventSink?.({
          name: "visual_novel_unit_exited_incomplete",
          unitId: id,
          beatId,
          entrySource: "roleplay",
        });
      }
      dispatch({ type: "backToRoot" });
    },
    onVisualNovelFinish: (id: VisualNovelUnitId) => {
      "background only";
      dispatch({ type: "replace", screen: { name: "special-unit-complete", unitId: id } });
    },
  };
}
