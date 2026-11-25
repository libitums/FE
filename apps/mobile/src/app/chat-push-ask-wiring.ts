// 채팅 알림 권한 카드(ADR-0197 D5)의 포트입니다 — 회원 방에만 `render-messenger-chat.tsx`가 컨텍스트로 내립니다.
// 알림은 아무것도 막지 않습니다: 실패는 모두 「카드 없음」입니다.

import { loadAuthSession } from "../lib/auth-session";
import { pushAllowed, pushPermission } from "../lib/push-notifications";
import type { ChatPushAskPort } from "../screens/messenger-chat/chat-push-ask.contract";
import {
  chatPushAskDecision,
  chatPushAskShown,
  readChatPushAsk,
  writeChatPushAsk,
} from "./chat-push-ask";
import { progressUserId } from "./pending-learning-progress";
import { syncPushDevice } from "./push-wiring";

export function chatPushAskPort(now: () => number = () => Date.now()): ChatPushAskPort {
  return {
    due: async () => {
      "background only";
      try {
        const userId = progressUserId();
        const signedIn = loadAuthSession() !== null && userId !== null;
        const permission = signedIn ? await pushPermission() : null;
        const record = userId === null ? null : readChatPushAsk(userId);
        if (userId === null || record === null) return { show: false };
        const nowMs = now();
        const decision = chatPushAskDecision({ signedIn, permission, record, nowMs });
        if (decision === "register") await syncPushDevice({ ask: false });
        if (decision !== "card") return { show: false };
        const next = chatPushAskShown(record, nowMs);
        writeChatPushAsk(userId, next);
        return { show: true, count: next.shown };
      } catch {
        return { show: false };
      }
    },
    turnOn: async () => {
      "background only";
      const permission = await syncPushDevice({ ask: true });
      // 답 없이 창이 닫혔으면(미결정 그대로) 결과가 아닙니다.
      if (permission === null || permission === "not-determined") return null;
      return pushAllowed(permission) ? "allowed" : "denied";
    },
  };
}
