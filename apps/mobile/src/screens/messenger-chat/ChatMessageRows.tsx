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
import { StoryQuoteCard } from "./StoryQuote";
import { StoryQuizCorrect, StoryQuizNote } from "./StoryQuizNotes";
import { ChatCrisisCard, ChatNoticeRow } from "./SafetyParts";
import { ChatMediaNoticeRow } from "./ChatMediaNotice";
import type { ChatEntrance } from "./chat-entrance";
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
  /** 처음 나타나는 글이면 그 쪽(`chat-entrance.ts`) — 움직임 줄이기 · 이미 있던 글은 null. */
  readonly entrance?: ChatEntrance;
  readonly thread: ChatThread;
  readonly learnerName: string;
  readonly openTools: BubbleToolsState;
  readonly motion: "standard" | "reduced";
  readonly onToggleTool: (messageId: string, tool: BubbleTool) => void;
  readonly feedback: ChatRowFeedback;
  /** 다 만든 사진을 누르면 사진 보기를 엽니다(사진 줄 id). 없으면 사진은 누를 수 없습니다. */
  readonly onOpenPhoto?: (messageId: string) => void;
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

/** 줄 하나 — 처음 나타나는 글이면 감싸개가 등장 움직임을 집니다(상대는 왼쪽 아래, 내 글은 오른쪽 아래에서). */
export function ChatMessageRow({ entrance = null, ...props }: ChatMessageRowProps): ReactNode {
  return entrance === null ? (
    <RowBody {...props} />
  ) : (
    <view className={`messenger-chat-enter messenger-chat-enter-${entrance}`}>
      <RowBody {...props} />
    </view>
  );
}

function RowBody({
  message,
  thread,
  learnerName,
  openTools,
  motion,
  onToggleTool,
  feedback,
  onOpenPhoto,
}: Omit<ChatMessageRowProps, "entrance">): ReactNode {
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
        const bubble = (
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
            chatWords={notes.chatWords ?? null}
          />
        );
        // 스토리 답장(ADR-0178 D5)이면 말풍선 위에 인용 카드 — 줄은 가로라 둘을 세로 묶음에 담습니다. 덕수쌤 퀴즈의 무료 답이면 말풍선 아래
        // 「Free · quiz answer」, 맞혔으면 그 아래 가운데 줄(시안 22 · 23, 서버 반영 예상).
        const answer = message.quiz?.kind === "answer" ? message.quiz : null;
        const row = (
          <ChatOutgoingRow testId={ids.outgoing}>
            {message.story === undefined && answer === null ? (
              bubble
            ) : (
              <view className="story-reply-stack">
                {message.story === undefined ? null : (
                  <StoryQuoteCard quote={message.story} name={counterpart.name} now={Date.now()} />
                )}
                {bubble}
                {answer === null ? null : (
                  <StoryQuizNote messageId={message.id} attempt={answer.attempt} />
                )}
              </view>
            )}
          </ChatOutgoingRow>
        );
        return answer?.result === "correct" ? (
          <>
            {row}
            <StoryQuizCorrect messageId={message.id} name={counterpart.name} />
          </>
        ) : (
          row
        );
      }
      const rating = thread.ratings[message.id];
      return (
        <ChatIncomingRow avatar={avatar} testId={ids.incoming}>
          {/* 내 스토리에 단 반응(ADR-0191 D2, 시안 20번) — 첫 말풍선 위 인용 카드. */}
          {message.story === undefined ? null : (
            <StoryQuoteCard
              quote={message.story}
              name={counterpart.name}
              now={Date.now()}
              from="them"
            />
          )}
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
          <PhotoPendingBubble
            name={counterpart.name}
            testId={ids.photoPending}
            key={message.startedAt ?? 0}
            {...(message.startedAt === undefined ? {} : { startedAt: message.startedAt })}
            {...(message.serverStage === undefined ? {} : { serverStage: message.serverStage })}
            {...(message.aspect === undefined ? {} : { aspect: message.aspect })}
          />
        </ChatIncomingRow>
      );
    case "photo":
      return (
        <ChatIncomingRow avatar={avatar} testId={ids.incoming}>
          <PhotoBubble
            src={message.imageUrl}
            {...(message.aspect === undefined ? {} : { aspect: message.aspect })}
            {...(message.aiGenerated === undefined ? {} : { aiGenerated: message.aiGenerated })}
            name={counterpart.name}
            testId={ids.photo}
            {...(onOpenPhoto === undefined ? {} : { onOpen: () => onOpenPhoto(message.id) })}
          />
        </ChatIncomingRow>
      );
    case "voice-pending":
      return (
        <ChatIncomingRow avatar={avatar} testId={ids.incoming}>
          <VoicePendingBubble
            name={counterpart.name}
            testId={ids.voicePending}
            key={message.startedAt ?? 0}
            {...(message.startedAt === undefined ? {} : { startedAt: message.startedAt })}
          />
        </ChatIncomingRow>
      );
    case "voice":
      return (
        <ChatIncomingRow avatar={avatar} testId={ids.incoming}>
          <VoiceBubble
            durationMs={message.durationMs}
            {...(message.audioUrl === undefined ? {} : { audioUrl: message.audioUrl })}
            text={message.text}
            name={counterpart.name}
            testId={ids.voice}
          />
        </ChatIncomingRow>
      );
    case "notice":
      return <ChatNoticeRow notice={message.notice} name={counterpart.name} />;
    case "media-notice":
      return (
        <ChatMediaNoticeRow
          notice={message.notice}
          media={message.media}
          until={message.until}
          name={counterpart.name}
        />
      );
    case "crisis":
      return <ChatCrisisCard resources={message.resources} onOpen={openLink} />;
    default: {
      const unreachable: never = message;
      return unreachable;
    }
  }
}
