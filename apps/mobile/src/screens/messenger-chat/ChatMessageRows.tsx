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
}: ChatMessageRowProps): ReactNode {
  const { counterpart } = thread;
  const avatar = { name: counterpart.name, imageUrl: counterpart.avatarUrl };
  switch (message.kind) {
    case "text":
      if (message.from === "me") {
        const notes = notesOf(thread, message.id);
        const open = openTools[message.id];
        return (
          <ChatOutgoingRow testId={ids.outgoing}>
            <MyMessageRow
              messageId={message.id}
              ko={message.text.ko}
              speaker={learnerName}
              view={myBubbleViewOf(open, notes)}
              tools={bubbleToolRowOf(open, notes)}
              motion={motion}
              onToggle={(tool) => onToggleTool(message.id, tool)}
            />
          </ChatOutgoingRow>
        );
      }
      return (
        <ChatIncomingRow avatar={avatar} testId={ids.incoming}>
          <ChatTextBubble
            direction="incoming"
            speaker={counterpart.name}
            message={message.text.ko}
            translation={message.text.en}
          />
        </ChatIncomingRow>
      );
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
