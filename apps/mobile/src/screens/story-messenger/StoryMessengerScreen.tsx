import { useMainThreadRef, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import type { MainThread } from "@lynx-js/types";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import { Avatar } from "@libitums/ui-lynx/avatar";
import { BottomSheet } from "@libitums/ui-lynx/bottom-sheet";
import { Button } from "@libitums/ui-lynx/button";
import { ChatBubble } from "@libitums/ui-lynx/chat-bubble";
import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";
import { RoundButton } from "@libitums/ui-lynx/round-button";

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
    <ChatBubble
      direction={item.direction}
      message={item.text.ko}
      speaker={outgoing ? selfName : counterpart}
      size="m"
      contentLanguage="learning"
      languageTag="ko"
      translation={item.text.en}
    />
  );
  if (outgoing) {
    return (
      <view className="story-messenger-row story-messenger-row-outgoing" data-testid={ids.outgoing}>
        {bubble}
      </view>
    );
  }
  return (
    <view className="story-messenger-row" data-testid={ids.incoming}>
      <Avatar
        name={counterpart}
        imageSource={avatarUrl ?? undefined}
        size="sm"
        accessibility="hidden"
      />
      <view className="story-messenger-stack">
        {item.imageUrl === null ? null : (
          <image
            className="story-messenger-photo"
            data-testid={ids.photo}
            src={item.imageUrl}
            mode="aspectFill"
          />
        )}
        {bubble}
      </view>
    </view>
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
  const logRef = useMainThreadRef<MainThread.Element>(null);

  // 말풍선이 늘 때마다 대화 끝으로 내립니다 — 내용 높이가 바뀐 그 프레임에 화면 쪽 스레드에서 옮깁니다.
  const followEnd = (event: { detail: { scrollHeight: number } }) => {
    "main thread";
    void logRef.current?.invoke("scrollTo", { offset: event.detail.scrollHeight, smooth: true });
  };

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
      <view
        className="story-messenger-header"
        data-testid={ids.header}
        style={{ paddingTop: `${insets.top}px` }}
      >
        <view className="story-messenger-header-row">
          <view className="story-messenger-header-side" data-testid={ids.back}>
            <RoundButton
              accessibilityLabel={copy.back}
              icon={arrowLeft03}
              variant="neutral"
              size="l"
              bindtap={handleExit}
            />
          </view>
          <text
            className="story-messenger-title"
            data-testid={ids.title}
            accessibility-traits="header"
          >
            {chat.counterpart}
          </text>
          <view className="story-messenger-header-side" />
        </view>
      </view>
      <scroll-view
        className="story-messenger-log"
        data-testid={ids.log}
        scroll-orientation="vertical"
        scroll-bar-enable={false}
        main-thread:ref={logRef}
        main-thread:bindcontentsizechanged={followEnd}
      >
        <view className="story-messenger-log-inner">
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
            <view
              className="story-messenger-row"
              data-testid={ids.typing}
              accessibility-element={true}
              accessibility-label={copy.typing(chat.counterpart)}
            >
              <Avatar
                name={chat.counterpart}
                imageSource={chat.counterpartAvatarUrl ?? undefined}
                size="sm"
                accessibility="hidden"
              />
              <view className="story-messenger-typing">
                <view className="story-messenger-dot" />
                <view className="story-messenger-dot story-messenger-dot-2" />
                <view className="story-messenger-dot story-messenger-dot-3" />
              </view>
            </view>
          ) : null}
        </view>
      </scroll-view>
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
              <view
                key={`${index}:${option.ko}`}
                className="story-messenger-option"
                data-testid={ids.option(index)}
                accessibility-element={true}
                accessibility-label={`${option.ko}, ${option.en}`}
                accessibility-traits="button"
                bindtap={() => {
                  "background only";
                  state.pick(index + 1);
                }}
              >
                <text className="story-messenger-option-ko">{option.ko}</text>
                {option.en === "" ? null : (
                  <text className="story-messenger-option-en">{option.en}</text>
                )}
              </view>
            ))}
          </view>
        </BottomSheet>
      ) : null}
    </view>
  );
}
