// 방의 다시 보내기 · 👍 👎 자리와 동작을 모읍니다(ADR-0129). 화면은 결과를 메시지 줄에 그대로 넘깁니다.
// 동작은 렌더 때의 방이 아니라 누르는 순간 출처의 최신 방으로 판정합니다 — 같은 렌더 안의 연속 탭이 관문(무료 수 · 엽전)만
// 두 번 지나고 출처는 무동작이 되던 결함(리뷰 C1)과 👍 연속 탭(S2)을 막습니다.

import type { ChatRowFeedback } from "./ChatMessageRows";
import { latestReplyId, readyResend, resendableMessageId } from "./chat-feedback-rules";
import type { ChatRoomAction } from "./chat-room-state";
import type { ChatSource, ChatThread } from "./chat-source.contract";

export type UseChatFeedbackInput = {
  readonly roomId: string;
  readonly source: ChatSource;
  /** 방이 없으면(지워짐) 자리가 없습니다. */
  readonly thread: ChatThread | null;
  readonly dispatch: (action: ChatRoomAction) => void;
  /** 보내기 관문(무료 수 · 엽전) — 다시 보내기도 새 턴이라 같은 관문을 지납니다. */
  readonly authorizeSend: () => boolean;
};

export type ResendInput = Pick<UseChatFeedbackInput, "roomId" | "source" | "authorizeSend">;

/** 지금 다시 보낼 수 있을 때만 관문을 지나 보냅니다. 보냈으면 true. */
export function resendIfReady({ roomId, source, authorizeSend }: ResendInput, messageId: string) {
  const latest = source.thread(roomId);
  if (latest === null || readyResend(latest, messageId) === null) return false;
  if (!authorizeSend()) return false;
  source.resendCorrected(roomId, messageId);
  return true;
}

export function useChatFeedback(input: UseChatFeedbackInput): ChatRowFeedback {
  const { roomId, source, thread, dispatch } = input;
  return {
    // 서버 모드는 아직 다시 보내기를 서버(replaces_message_id)에 잇지 않아 단추를 두지 않습니다(리뷰 W6, 3단계).
    resendableId:
      thread === null || thread.origin === "server"
        ? null
        : resendableMessageId(thread, thread.awaitingReply),
    latestReplyId: thread === null ? null : latestReplyId(thread),
    onResend: (messageId) => {
      "background only";
      resendIfReady(input, messageId);
    },
    onGood: (messageId) => {
      "background only";
      const up = source.thread(roomId)?.ratings[messageId]?.value === "up";
      source.rateMessage(roomId, messageId, up ? null : { value: "up" });
    },
    onBad: (messageId) => {
      "background only";
      const current = source.thread(roomId)?.ratings[messageId];
      dispatch({
        type: "open-overlay",
        overlay: {
          kind: "rate-down",
          messageId,
          reasons: current?.value === "down" ? current.reasons : [],
          note: current?.value === "down" ? (current.note ?? "") : "",
        },
      });
    },
  };
}
