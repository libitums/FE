import type { ReactNode } from "@lynx-js/react";

import { openExternalLink } from "../../lib/external-link";

import {
  ChatIncomingRow,
  ChatOutgoingRow,
  ChatTextBubble,
} from "../../components/chat/ChatMessageRow";
import {
  PhotoBubble,
  PhotoPendingBubble,
  VoiceBubble,
  VoicePendingBubble,
} from "./ChatMediaBubbles";
import { ChatActionRow } from "./ChatActionRow";
import { UnsentMessage } from "./ChatDelivery";
import { RatingButtons, RatingResult } from "./RatingRow";
import { MyMessageRow } from "./MyMessage";
import { ChatCrisisCard, ChatNoticeRow } from "./SafetyParts";
import { notesOf } from "./chat-source.contract";
import type { ChatMessage, ChatThread } from "./chat-source.contract";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import {
  bubbleToolRowOf,
  myBubbleViewOf,
  type BubbleTool,
  type BubbleToolsState,
} from "./my-message-state";

export type ChatMessageRowProps = {
  readonly message: ChatMessage;
  readonly thread: ChatThread;
  readonly learnerName: string;
  readonly openTools: BubbleToolsState;
  readonly motion: "standard" | "reduced";
  readonly onToggleTool: (messageId: string, tool: BubbleTool) => void;
  readonly feedback: ChatRowFeedback;
};

/** 다시 보내기 · 👍 👎 자리와 동작입니다(ADR-0129). 자리는 방에 하나씩 — 마지막 내 글 · 가장 최근 캐릭터 글. */
export type ChatRowFeedback = {
  readonly resendableId: string | null;
  readonly latestReplyId: string | null;
  readonly onResend: (messageId: string) => void;
  readonly onGood: (messageId: string) => void;
  readonly onBad: (messageId: string) => void;
  /** 서버가 받지 못한 내 글(ADR-0138) — 다시 보내기 · 지우기 대화상자를 엽니다. */
  readonly onUnsent: (messageId: string) => void;
};

/** 메시지 하나 → 줄(1단계 `MessageRow` 이전 + 내 글 분기)입니다. 같은 id의 pending → 도착은 같은 key 자리에서 바뀝니다. */
// 위기 카드의 전화 · 웹 주소는 호스트가 엽니다(ADR-0125). 열지 못해도 카드의 글자는 그대로 보입니다.
const openLink = (url: string): void => {
  "background only";
  openExternalLink(url);
};

export function ChatMessageRow({
  message,
  thread,
  learnerName,
  openTools,
  motion,
  onToggleTool,
  feedback,
}: ChatMessageRowProps): ReactNode {
  const { counterpart } = thread;
  const avatar = { name: counterpart.name, imageUrl: counterpart.avatarUrl };
  switch (message.kind) {
    case "text":
      if (message.from === "me") {
        if (thread.server?.unsent.includes(message.id) === true)
          return (
            <ChatOutgoingRow testId={ids.outgoing}>
              <UnsentMessage
                ko={message.text.ko}
                speaker={learnerName}
                onOpen={() => feedback.onUnsent(message.id)}
              />
            </ChatOutgoingRow>
          );
        const notes = notesOf(thread, message.id);
        const open = openTools[message.id];
        return (
          <ChatOutgoingRow testId={ids.outgoing}>
            <MyMessageRow
              messageId={message.id}
              ko={message.text.ko}
              speaker={learnerName}
              view={myBubbleViewOf(open, notes)}
              tools={bubbleToolRowOf(open, notes, thread.server === null ? "shown" : "hidden")}
              motion={motion}
              onToggle={(tool) => onToggleTool(message.id, tool)}
              onResend={
                feedback.resendableId === message.id ? () => feedback.onResend(message.id) : null
              }
            />
          </ChatOutgoingRow>
        );
      }
      const rating = thread.ratings[message.id];
      return (
        <ChatIncomingRow avatar={avatar} testId={ids.incoming}>
          <ChatTextBubble
            direction="incoming"
            speaker={counterpart.name}
            message={message.text.ko}
            translation={message.text.en}
          />
          {feedback.latestReplyId === message.id ? (
            <RatingButtons
              rating={rating}
              onGood={() => feedback.onGood(message.id)}
              onBad={() => feedback.onBad(message.id)}
            />
          ) : rating === undefined ? null : (
            <RatingResult rating={rating} />
          )}
        </ChatIncomingRow>
      );
    case "action":
      return <ChatActionRow text={message.text} name={counterpart.name} />;
    case "photo-pending":
      return (
        <ChatIncomingRow avatar={avatar} testId={ids.incoming}>
          <PhotoPendingBubble name={counterpart.name} testId={ids.photoPending} />
        </ChatIncomingRow>
      );
    case "photo":
      return (
        <ChatIncomingRow avatar={avatar} testId={ids.incoming}>
          <PhotoBubble src={message.imageUrl} name={counterpart.name} testId={ids.photo} />
        </ChatIncomingRow>
      );
    case "voice-pending":
      return (
        <ChatIncomingRow avatar={avatar} testId={ids.incoming}>
          <VoicePendingBubble name={counterpart.name} testId={ids.voicePending} />
        </ChatIncomingRow>
      );
    case "voice":
      return (
        <ChatIncomingRow avatar={avatar} testId={ids.incoming}>
          <VoiceBubble
            durationMs={message.durationMs}
            text={message.text}
            name={counterpart.name}
            testId={ids.voice}
          />
        </ChatIncomingRow>
      );
    case "notice":
      return <ChatNoticeRow notice={message.notice} name={counterpart.name} />;
    case "crisis":
      return <ChatCrisisCard resources={message.resources} onOpen={openLink} />;
    default: {
      const unreachable: never = message;
      return unreachable;
    }
  }
}
