// 알림 권한을 첫 스토리 뒤에 묻는 결선입니다(ADR-0176 · ADR-0034 D4 개정). 새 가입자가 표지 스토리를 끝내거나 · 건너뛰거나 ·
// 나와 지도로 돌아온 뒤, 다른 안내가 없고 완료 연출이 끝나면 한 번 묻습니다. 다시 켰을 때는 활동 기록이 있으면 바로, 없으면
// 스토리를 다시 기다립니다(그동안 지도에는 첫 유닛 안내가 서 있습니다).
//
// 머리 모달 · 받기 시트처럼 셸이 모르는 겹침은 창을 띄우기 직전에 뒤로가기 층 스택으로 봅니다 — 열려 있으면 다시 기다립니다.

import { useEffect, useRef, useState } from "@lynx-js/react";

import { backHandlers } from "../lib/back-handler";
import type { Screen } from "./nav-state";
import { progressUserId } from "./pending-learning-progress";
import {
  PUSH_PROMPT_DELAY_MS,
  clearPushPrompt,
  isPushPromptPending,
  leftStory,
  pushPromptDue,
} from "./push-prompt";
import { syncPushDevice } from "./push-wiring";

export function usePushPrompt(input: {
  readonly screen: Screen["name"];
  readonly signedIn: boolean;
  /** 지도 루트이고 다른 안내 · 겹침이 없음. */
  readonly idle: boolean;
  readonly activityCount: number;
  /** 시스템 창의 답을 기다리는 동안 참 — 다른 안내가 그 밑에 서지 않게 미룹니다. */
  readonly onAskingChange: (asking: boolean) => void;
}): void {
  const { screen, signedIn, idle, activityCount, onAskingChange } = input;
  const previous = useRef(screen);
  const [storyLeft, setStoryLeft] = useState(false);
  useEffect(() => {
    if (leftStory(previous.current, screen)) setStoryLeft(true);
    previous.current = screen;
  }, [screen]);

  const asked = useRef(false);
  const [waits, setWaits] = useState(0);
  useEffect(() => {
    if (asked.current || !idle) return undefined;
    const pending = isPushPromptPending();
    if (!pushPromptDue({ signedIn, pending, idle, storyLeft, activityCount })) return undefined;
    const handle = setTimeout(() => {
      if (backHandlers.hasLayer()) {
        setWaits((count) => count + 1);
        return;
      }
      const userId = progressUserId();
      if (userId === null) return;
      asked.current = true;
      onAskingChange(true);
      // 답을 받은 뒤에 지웁니다 — iOS는 창이 떠 있는 채 꺼지면 다음에 다시 묻습니다. Android 호스트는 창을 띄우기 전에
      // 「물었음」을 적어 다시 묻지 못합니다(ADR-0176 D5).
      void syncPushDevice({ ask: true }).then(() => {
        clearPushPrompt(userId);
        onAskingChange(false);
      });
    }, PUSH_PROMPT_DELAY_MS);
    return () => clearTimeout(handle);
  }, [signedIn, idle, storyLeft, activityCount, waits]);
}
