// 가짜 출처의 서버 없는 보내기입니다(messenger-chat-ui spec §5.1) — 내 글을 놓고 정해 둔 답을 타이머로 흉내 냅니다.
// `chat-fixture-source.ts`에서 떼어 냈습니다(300줄). 던지지 않습니다.

import { advanceIdeas, isOpenAccess, type RoomState } from "./chat-fixture-room";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import { myTextLine } from "./friend-stories";
import type { ChatMessage, ChatSendOptions } from "./chat-source.contract";

export type LocalSendDeps = {
  readonly live: (roomId: string) => RoomState | null;
  readonly now: () => number;
  readonly messageId: () => string;
  readonly changed: (room: RoomState) => void;
  readonly schedule: (room: RoomState, ms: number, fn: () => void) => void;
  readonly openRoomId: () => string | null;
  readonly onReplyArrived: (room: RoomState, sentId: string) => void;
};

export function localSender(deps: LocalSendDeps) {
  const { live, now, messageId, changed, schedule } = deps;
  const timing = CHAT_PLACEHOLDERS.timing;
  return (roomId: string, text: string, options?: ChatSendOptions): void => {
    const room = live(roomId);
    const trimmed = text.trim();
    if (room === null || !isOpenAccess(room) || trimmed === "") return;
    const sentId = messageId();
    const sent: ChatMessage = myTextLine(sentId, now(), trimmed, options?.story);
    room.messages = [...room.messages, sent];
    room.pendingReplies += 1;
    changed(room);
    schedule(room, timing.typingDelayMs, () => {
      room.typing = true;
      changed(room);
      schedule(room, timing.replyDelayMs, () => {
        room.pendingReplies -= 1;
        room.typing = room.pendingReplies > 0;
        const replies = room.seed.cannedReplies;
        if (replies.length > 0) {
          const reply = replies[room.replyIndex % replies.length];
          room.replyIndex += 1;
          if (reply !== undefined) {
            room.messages = [
              ...room.messages,
              { id: messageId(), at: now(), kind: "text", from: "them", text: reply },
            ];
            if (deps.openRoomId() !== room.seed.roomId) room.unread += 1;
            deps.onReplyArrived(room, sentId);
          }
        }
        advanceIdeas(room);
        changed(room);
      });
    });
  };
}
