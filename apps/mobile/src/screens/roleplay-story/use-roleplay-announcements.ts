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
    if (state.verdict !== null) {
      announce(
        state.verdict === "correct" ? copy.roleplayStory.great : copy.roleplayStory.notQuite,
      );
    }
  }, [state.turnIndex, state.verdict]);
}
