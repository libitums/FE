import { useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import { BottomSheet } from "@libitums/ui-lynx/bottom-sheet";
import { Button } from "@libitums/ui-lynx/button";
import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { ChatHeader, ChatHeaderSide } from "../../components/chat/ChatHeader";
import { ChatLog } from "../../components/chat/ChatLog";
import {
  ChatIncomingRow,
  ChatOutgoingRow,
  ChatPhoto,
  ChatTextBubble,
} from "../../components/chat/ChatMessageRow";
import { ChatReplyOption } from "../../components/chat/ChatReplyOption";
import { ChatTypingRow } from "../../components/chat/ChatTypingRow";
import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";
import { StoryComposer } from "./StoryComposer";
import {
  storyMessengerTestIds as ids,
  type StoryChatLogItem,
  type StoryMessengerScreenProps,
} from "./story-messenger.contract";
import { useStoryChat } from "./use-story-chat";

import "./story-messenger.css";

type MessageRowProps = {
  item: StoryChatLogItem;
  counterpart: string;
  avatarUrl: string | null;
  selfName: string;
};

function MessageRow({ item, counterpart, avatarUrl, selfName }: MessageRowProps): ReactNode {
  const outgoing = item.direction === "outgoing";
  const bubble = (
    <ChatTextBubble
      direction={item.direction}
      message={item.text.ko}
      speaker={outgoing ? selfName : counterpart}
      translation={item.text.en}
    />
  );
  if (outgoing) return <ChatOutgoingRow testId={ids.outgoing}>{bubble}</ChatOutgoingRow>;
  return (
    <ChatIncomingRow avatar={{ name: counterpart, imageUrl: avatarUrl }} testId={ids.incoming}>
      {item.imageUrl === null ? null : (
        <ChatPhoto src={item.imageUrl} aspect="portrait-9x16" testId={ids.photo} />
      )}
      {bubble}
    </ChatIncomingRow>
  );
}

// 문자 막간의 메신저 화면입니다(ADR-0088 D5). 시작 화면(StoryIntroScreen) 뒤에 서고, 상대 메시지가
// 시간에 따라 쌓이며 답장 차례에 바텀 시트가 섭니다. 마지막 뒤 「Finish story」가 완료를 한 번 올립니다.
export function StoryMessengerScreen({
  insets,
  chat,
  onComplete,
  onExit,
}: StoryMessengerScreenProps): ReactNode {
  const uiCopy = useUiCopy();
  const copy = uiCopy.storyMessenger;
  const state = useStoryChat(chat.turns, true);
  const completed = useRef(false);
  const reducedMotion = resolveReducedMotion(undefined, useMotion());

  const handleExit = () => {
    "background only";
    onExit();
  };
  useScreenBack(handleExit);

  return (
    <view
      className={`story-messenger-screen${reducedMotion ? " story-messenger-motion-reduced" : ""}`}
      data-testid={ids.screen}
    >
      <ChatHeader
        title={chat.counterpart}
        insetTop={insets.top}
        testIds={{ root: ids.header, title: ids.title }}
        start={
          <ChatHeaderSide testId={ids.back}>
            <RoundButton
              accessibilityLabel={copy.back}
              icon={arrowLeft03}
              variant="neutral"
              size="l"
              bindtap={handleExit}
            />
          </ChatHeaderSide>
        }
        end={null}
      />
      <ChatLog testId={ids.log}>
        {state.log.map((item) => (
          <MessageRow
            key={item.id}
            item={item}
            counterpart={chat.counterpart}
            avatarUrl={chat.counterpartAvatarUrl}
            selfName={uiCopy.common.me}
          />
        ))}
        {state.typing ? (
          <ChatTypingRow
            avatar={{ name: chat.counterpart, imageUrl: chat.counterpartAvatarUrl }}
            label={copy.typing(chat.counterpart)}
            testId={ids.typing}
          />
        ) : null}
      </ChatLog>
      {state.done ? (
        <view className="story-messenger-footer" data-testid={ids.finish}>
          <Button
            label={copy.finish}
            variant="brand"
            size="xl"
            width="fill"
            bindtap={() => {
              "background only";
              if (completed.current) return;
              // oxlint-disable-next-line react/immutability -- 완료를 한 번만 올리는 표식입니다(렌더와 무관).
              completed.current = true;
              onComplete();
            }}
          />
        </view>
      ) : null}
      <StoryComposer bottomInset={insets.bottom} />
      {state.sheetOpen && state.reply !== null ? (
        <BottomSheet
          title={copy.replyTitle}
          closeAccessibilityLabel={copy.closeReply}
          dismissible={false}
          ondismiss={() => undefined}
        >
          <view className="story-messenger-options" style={{ paddingBottom: `${insets.bottom}px` }}>
            {/* 시트 설명 자리는 스크롤 몸통이라 기기에서 높이가 0으로 접혀, 인용은 내용 자리에 둡니다. */}
            <text className="story-messenger-quote">{`“${state.lastIncoming}”`}</text>
            {state.reply.options.map((option, index) => (
              <ChatReplyOption
                key={`${index}:${option.ko}`}
                primary={option.ko}
                lines={[option.en]}
                state="idle"
                testId={ids.option(index)}
                onPick={() => state.pick(index + 1)}
              />
            ))}
          </view>
        </BottomSheet>
      ) : null}
    </view>
  );
}
