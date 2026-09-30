import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import arrowUp02 from "@libitums/icons/lynx/arrow-up-02";
import { color } from "@libitums/design-tokens";
import { ChatBubble } from "@libitums/ui-lynx/chat-bubble";
import { Fog } from "@libitums/ui-lynx/fog";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { useUiCopy } from "../../lib/ui-copy";
import type { PrologueChatScreenProps } from "./episode-intro.contract";
import { prologueChatIncomingDelayMs, prologueChatNext } from "./prologue-chat";

import "./prologue-chat-screen.css";

/**
 * 서사 메신저 화면입니다(Figma 79-6762). 표지의 `Next` 뒤에 섭니다. **학습이 아닙니다** —
 * 상대 메시지는 저절로 오고, 내 차례가 되면 보낼 말이 입력창에 채워져 보내기만 누릅니다.
 *
 * 대화가 끝나면 입력창이 걷히고 하단 fog 위에 `Continue`가 섭니다(서사 통화와 같습니다).
 *
 * 디자인의 사진 메시지와 오른쪽 위 설정 버튼은 그리지 않습니다 — 그림 자산이 없고, 설정이
 * 갈 곳이 정해지지 않았습니다.
 */
export function PrologueChatScreen({
  insets,
  episodeLabel,
  chat,
  onComplete,
  onBack,
}: PrologueChatScreenProps): ReactNode {
  const copy = useUiCopy();
  const [shownCount, setShownCount] = useState(0);
  const next = prologueChatNext(chat.messages, shownCount);
  const shown = chat.messages.slice(0, shownCount);

  // 다음이 상대 메시지면 잠시 뒤 저절로 옵니다. 내 차례에는 기다립니다 — 보내기가 넘깁니다.
  useEffect(() => {
    if (next.kind !== "incoming") {
      return undefined;
    }
    const timer = setTimeout(
      () => setShownCount((count) => count + 1),
      prologueChatIncomingDelayMs,
    );
    return () => clearTimeout(timer);
  }, [shownCount, next.kind]);

  // 메시지가 하나 늘 때마다 대화 끝을 보입니다 — 목록이 화면을 넘으면 새 메시지가 아래에
  // 숨습니다. 마지막 메시지가 아니라 끝의 여백을 집습니다: 끝난 대화에서는 그 여백이
  // `Continue`와 fog의 자리라, 거기까지 내려야 마지막 메시지가 가리지 않습니다.
  useEffect(() => {
    if (shownCount > 0) {
      scrollToChatEnd();
    }
  }, [shownCount]);

  const handleSend = () => {
    "background only";
    if (next.kind === "draft") {
      setShownCount((count) => count + 1);
    }
  };

  const handleComplete = () => {
    "background only";
    onComplete();
  };

  const draft = next.kind === "draft" ? next.message : undefined;

  return (
    <view className="prologue-chat-screen" data-testid="prologue-chat-screen">
      <view
        className="prologue-chat-screen-safe"
        style={{
          paddingTop: `${insets.top}px`,
          paddingBottom: `${insets.bottom}px`,
          paddingLeft: `${insets.left}px`,
          paddingRight: `${insets.right}px`,
        }}
      >
        {/* 화면 여백은 이 상자가 집니다 — 바깥 상자의 가장자리 여백은 인라인이라, 거기에
            CSS 여백을 함께 두면 인라인이 덮어씁니다. */}
        <view className="prologue-chat-screen-body">
          <view className="prologue-chat-screen-header">
            <view className="prologue-chat-screen-back" data-testid="prologue-chat-screen-back">
              <RoundButton
                accessibilityLabel={copy.common.exitTo.journey}
                icon={arrowLeft03}
                variant="neutral"
                size="xl"
                bindtap={onBack}
              />
            </view>
            <text
              className="prologue-chat-screen-title"
              data-testid="prologue-chat-screen-title"
              accessibility-traits="header"
            >
              {episodeLabel}
            </text>
          </view>

          <scroll-view
            className="prologue-chat-screen-scroll"
            scroll-orientation="vertical"
            scroll-bar-enable={true}
          >
            <view className="prologue-chat-screen-list" data-testid="prologue-chat-screen-list">
              {shown.map((message) => (
                <view
                  key={message.id}
                  className={`prologue-chat-screen-row prologue-chat-screen-row-${message.sender}`}
                  data-testid={`prologue-chat-screen-message-${message.id}`}
                  data-sender={message.sender}
                >
                  <ChatBubble
                    direction={message.sender === "self" ? "outgoing" : "incoming"}
                    speaker={message.sender === "self" ? copy.common.me : chat.partnerName}
                    message={message.text}
                    translation={message.translation}
                    size="m"
                    contentLanguage="learning"
                    languageTag="ko"
                  />
                </view>
              ))}
            </view>
            <view id={chatEndId} className="prologue-chat-screen-end" />
          </scroll-view>

          {next.kind === "done" ? null : (
            <view
              className="prologue-chat-screen-composer"
              data-testid="prologue-chat-screen-composer"
            >
              <text
                className="prologue-chat-screen-draft"
                data-testid="prologue-chat-screen-draft"
                text-maxline="2"
              >
                {draft?.text ?? ""}
              </text>
              <view
                className={
                  draft === undefined
                    ? "prologue-chat-screen-send prologue-chat-screen-send-idle"
                    : "prologue-chat-screen-send"
                }
                data-testid="prologue-chat-screen-send"
                accessibility-element={true}
                accessibility-traits={draft === undefined ? "disabled" : "button"}
                accessibility-label={
                  draft === undefined ? copy.common.send : copy.common.sendWithText(draft.text)
                }
                bindtap={handleSend}
              >
                <svg
                  className="prologue-chat-screen-send-icon"
                  content={arrowUp02}
                  current-color={color.white}
                />
              </view>
            </view>
          )}
        </view>
      </view>
      {/* 끝난 대화의 하단 — fog 위에 `Continue`가 섭니다(서사 통화와 같은 자리). */}
      {next.kind === "done" ? (
        <>
          <view className="prologue-chat-screen-fog" accessibility-elements-hidden={true}>
            <Fog direction="bottom" size="full" color="surface-default" />
          </view>
          <view
            className="prologue-chat-screen-complete"
            data-testid="prologue-chat-screen-complete"
            style={{ bottom: `${insets.bottom}px` }}
            accessibility-element={true}
            accessibility-traits="button"
            accessibility-label={copy.common.continue}
            bindtap={handleComplete}
          >
            <text className="prologue-chat-screen-complete-label">{copy.common.continue}</text>
          </view>
        </>
      ) : null}
    </view>
  );
}

// 끝의 여백입니다. `invoke`는 ID 선택자만 받습니다(클래스는 `SELECTOR_NOT_SUPPORTED`).
const chatEndId = "prologue-chat-screen-end";

function scrollToChatEnd(): void {
  "background only";
  try {
    lynx
      .createSelectorQuery()
      .select(`#${chatEndId}`)
      .invoke({
        method: "scrollIntoView",
        params: { scrollIntoViewOptions: { block: "end", behavior: "smooth" } },
      })
      .exec();
  } catch {
    // 못 내려도 대화는 이어집니다 — 손으로 내려 읽을 수 있습니다.
  }
}
