import type { MessengerScreenProps } from "./messenger.contract";
import { useState } from "@lynx-js/react";
import { specialUnitExitLabel } from "../../lib/special-unit-entry-source";
import { MessageBubble } from "./MessageBubble";
import { ReplyButton } from "./ReplyButton";
import { ReplayButton } from "./ReplayButton";
import {
  currentMessengerReply,
  initialMessengerSessionState,
  messengerExitOutcome,
  messengerProgressLabel,
  messengerSessionReducer,
  visibleMessengerMessages,
} from "./messenger";
import "./messenger-screen.css";

// 화면 세션만 로컬로 소유하고 완료 기록은 상위 경계의 콜백으로 알립니다.
// `exitLabel`은 어느 탭에서 열렸는지를 화면이 알아서가 아니라 데이터로 받는다
// (ADR-0007 D3). 기본값은 여정 라벨이라 기존 호출은 수정 없이 성립한다(LIB-255 §2.7).
export function MessengerScreen({
  conversation,
  completionStatus,
  exitLabel = specialUnitExitLabel("journey"),
  onExit,
  onComplete,
  onReplay,
}: MessengerScreenProps) {
  const [session, setSession] = useState(() => initialMessengerSessionState(completionStatus));
  const messages = visibleMessengerMessages(conversation, session);
  const reply = currentMessengerReply(conversation, session);

  const handleReply = () => {
    const next = messengerSessionReducer(session, { type: "reply" });
    if (next.mode === "completed" && session.mode !== "completed") onComplete(conversation.id);
    setSession(next);
  };

  const handleReplay = () => {
    onReplay(conversation.id);
    setSession(messengerSessionReducer(session, { type: "replay" }));
  };

  return (
    <view className="messenger-screen" data-testid="messenger-screen">
      <view className="messenger-screen-header">
        <view
          className="messenger-screen-exit"
          data-testid="messenger-screen-exit"
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label={exitLabel}
          bindtap={() => onExit(messengerExitOutcome(session))}
        >
          <text>{exitLabel}</text>
        </view>
        <text
          className="messenger-screen-title"
          data-testid="messenger-screen-title"
          accessibility-traits="header"
        >
          {conversation.title}
        </text>
      </view>
      <scroll-view
        className="messenger-screen-scroll"
        data-testid="messenger-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        <view className="messenger-screen-content">
          <text className="messenger-screen-progress" data-testid="messenger-screen-progress">
            {messengerProgressLabel(session)}
          </text>
          <view className="messenger-message-list" data-testid="messenger-message-list">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </view>
        </view>
      </scroll-view>
      <view className="messenger-screen-action">
        {reply ? (
          <ReplyButton reply={reply} onReply={handleReply} />
        ) : (
          <ReplayButton onReplay={handleReplay} />
        )}
      </view>
    </view>
  );
}
