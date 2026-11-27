// 롤플레이 대화의 알림 — 못 알아들음 · 불가 안내 · 판정은 서는 순간 한 번 알립니다. 듣는 중에는 알리지 않습니다(낭독이
// 인식기에 들어갑니다).

import { useEffect } from "@lynx-js/react";

import { announce } from "../../lib/accessibility";
import { useUiCopy } from "../../lib/ui-copy";
import type { RoleplayTalkState } from "./roleplay-story.contract";
import { roleplayMissedMessage, unavailableMessage } from "./RoleplaySpeakControls";

export function useRoleplayAnnouncements(state: RoleplayTalkState): void {
  const copy = useUiCopy();
  useEffect(() => {
    if (state.missedReason !== null) announce(roleplayMissedMessage(state.missedReason, copy));
  }, [state.turnIndex, state.missedReason]);

  useEffect(() => {
    if (state.unavailableReason !== null) {
      announce(unavailableMessage(state.unavailableReason, copy));
    }
  }, [state.turnIndex, state.unavailableReason]);

  useEffect(() => {
    if (state.verdict === null) return;
    if (state.verdict === "incorrect") {
      announce(copy.roleplayStory.notQuite);
      return;
    }
    // close는 모범 정답까지 한 번에 알립니다(말하기 퀴즈 close의 「…, Model answer: 카드」와 같은 꼴).
    const judgement = state.judgement;
    announce(
      judgement?.grade === "close"
        ? `${copy.roleplayStory.great}, ${copy.speakWord.result.almostPerfect}. ${copy.speakWord.result.modelAnswer}: ${judgement.expected}`
        : copy.roleplayStory.great,
    );
  }, [state.turnIndex, state.verdict]);
}
