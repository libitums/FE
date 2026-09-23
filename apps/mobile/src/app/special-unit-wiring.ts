// 여정에서 여는 특별 유닛 셋(메신저 · 전화 · 비주얼 노벨)의 콜백을 만듭니다. 진행 상태와
// 이벤트 sink를 함께 받아 「연 순간」과 「완료한 순간」을 한 자리에서 냅니다.

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import { announceCompletion } from "../lib/accessibility";
import type {
  MessengerEventSink,
  MessengerExitOutcome,
  MessengerUnitId,
} from "../screens/messenger/messenger.contract";
import { completeMessengerUnit, messengerCompletionStatus } from "../screens/messenger/messenger";
import type {
  PhoneCallEventSink,
  PhoneCallUnitId,
} from "../screens/phone-call/phone-call.contract";
import { completePhoneCallUnit, phoneCallCompletionStatus } from "../screens/phone-call/phone-call";
import type {
  VisualNovelAdvanceOutcome,
  VisualNovelBeatId,
  VisualNovelEventSink,
  VisualNovelExitOutcome,
  VisualNovelProgress,
  VisualNovelUnitId,
} from "../screens/visual-novel/visual-novel.contract";
import { visualNovelEntrySnapshot } from "../screens/visual-novel/visual-novel";
import type { NavAction } from "./nav-state";

export type SpecialUnitWiringArgs = {
  readonly messengerEventSink: MessengerEventSink;
  readonly phoneCallEventSink: PhoneCallEventSink;
  readonly visualNovelEventSink: VisualNovelEventSink;
  readonly dispatch: Dispatch<NavAction>;
  readonly completedMessengerUnitIds: readonly MessengerUnitId[];
  readonly setCompletedMessengerUnitIds: Dispatch<SetStateAction<readonly MessengerUnitId[]>>;
  readonly completedPhoneCallUnitIds: readonly PhoneCallUnitId[];
  readonly setCompletedPhoneCallUnitIds: Dispatch<SetStateAction<readonly PhoneCallUnitId[]>>;
  readonly visualNovelProgress: VisualNovelProgress;
  readonly setVisualNovelProgress: Dispatch<SetStateAction<VisualNovelProgress>>;
};

// 반환 객체를 `special`로 먼저 이름 붙입니다. `onMessengerExit`이 그 이름으로 자기참조하므로,
// 조립하는 쪽이 이 객체를 펼쳐 담아도 참조가 끊기지 않습니다.
export function specialUnitWiring(args: SpecialUnitWiringArgs) {
  const {
    messengerEventSink,
    phoneCallEventSink,
    visualNovelEventSink,
    dispatch,
    completedMessengerUnitIds,
    setCompletedMessengerUnitIds,
    completedPhoneCallUnitIds,
    setCompletedPhoneCallUnitIds,
    visualNovelProgress,
    setVisualNovelProgress,
  } = args;

  const special = {
    messengerEventSink,
    completedMessengerUnitIds,
    onStartMessengerUnit: (id: MessengerUnitId) => {
      const entryStatus = messengerCompletionStatus(completedMessengerUnitIds, id);
      messengerEventSink?.({
        name: "messenger_unit_opened",
        unitId: id,
        entrySource: "journey",
        entryStatus,
      });
      dispatch({ type: "push", screen: { name: "messenger", unitId: id } });
    },
    onMessengerExit: (id: MessengerUnitId, outcome: MessengerExitOutcome) => {
      // 계약상 중도 이탈만 기록합니다. 완료한 세션의 이탈은 완료 이벤트에 중복 집계하지 않습니다.
      if (outcome === "incomplete")
        special.messengerEventSink?.({
          name: "messenger_unit_exited_incomplete",
          unitId: id,
          entrySource: "journey",
        });
      dispatch({ type: "backToRoot" });
    },
    onMessengerComplete: (id: MessengerUnitId) => {
      if (!completedMessengerUnitIds.includes(id)) {
        messengerEventSink?.({
          name: "messenger_unit_completed",
          unitId: id,
          entrySource: "journey",
        });
        setCompletedMessengerUnitIds((ids) => completeMessengerUnit(ids, id));
      }
    },
    onMessengerReplay: (id: MessengerUnitId) =>
      messengerEventSink?.({
        name: "messenger_unit_replay_started",
        unitId: id,
        entrySource: "journey",
      }),
    completedPhoneCallUnitIds,
    onStartPhoneCallUnit: (id: PhoneCallUnitId) => {
      "background only";
      // 여정 전화 진입은 열림 이벤트가 새로 늡니다 — `push` 직전에 `entrySource`.
      phoneCallEventSink?.({
        name: "phone_call_unit_opened",
        unitId: id,
        entrySource: "journey",
        entryStatus: phoneCallCompletionStatus(completedPhoneCallUnitIds, id),
      });
      dispatch({ type: "push", screen: { name: "phone-call", unitId: id } });
    },
    onPhoneCallComplete: (id: PhoneCallUnitId) => {
      "background only";
      setCompletedPhoneCallUnitIds((ids) => completePhoneCallUnit(ids, id));
    },
    onPhoneCallExit: () => {
      "background only";
      dispatch({ type: "backToRoot" });
    },
    visualNovelProgress,
    onStartVisualNovelUnit: (id: VisualNovelUnitId) => {
      "background only";
      const entry = visualNovelEntrySnapshot(visualNovelProgress);
      visualNovelEventSink?.({
        name: "visual_novel_unit_opened",
        unitId: id,
        entrySource: "journey",
        ...entry,
      });
      dispatch({ type: "push", screen: { name: "visual-novel", unitId: id } });
    },
    onVisualNovelAdvance: (id: VisualNovelUnitId, outcome: VisualNovelAdvanceOutcome) => {
      "background only";
      if (outcome.progressChanged) setVisualNovelProgress(outcome.progress);
      if (outcome.completedNow) {
        if (outcome.announcement !== null) announceCompletion(outcome.announcement);
        visualNovelEventSink?.({
          name: "visual_novel_unit_completed",
          unitId: id,
          entrySource: "journey",
        });
      }
    },
    onVisualNovelExit: (outcome: VisualNovelExitOutcome, beatId: VisualNovelBeatId) => {
      "background only";
      if (outcome === "incomplete") {
        visualNovelEventSink?.({
          name: "visual_novel_unit_exited_incomplete",
          unitId: "cafe-arrival-visual-novel",
          beatId,
          entrySource: "journey",
        });
      }
      dispatch({ type: "backToRoot" });
    },
    onVisualNovelReplay: (id: VisualNovelUnitId) => {
      "background only";
      visualNovelEventSink?.({
        name: "visual_novel_unit_replay_started",
        unitId: id,
        entrySource: "journey",
      });
    },
  };

  return special;
}
