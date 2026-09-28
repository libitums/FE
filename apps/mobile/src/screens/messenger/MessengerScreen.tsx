import { useEffect, useReducer, useState } from "@lynx-js/react";
import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import arrowUp02 from "@libitums/icons/lynx/arrow-up-02";
import refresh from "@libitums/icons/lynx/refresh";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { AnswerVerdict } from "../../components/AnswerVerdict";
import { specialUnitExitLabel } from "../../lib/special-unit-entry-source";
import { maskedAnswer } from "./hangul-keyboard";
import { MessageBubble } from "./MessageBubble";
import { MessengerKeyboard } from "./MessengerKeyboard";
import { ReplayButton } from "./ReplayButton";
import {
  composedText,
  initialMessengerComposerState,
  messengerComposerReducer,
  messengerCorrectDelayMs,
} from "./messenger-composer";
import type { MessengerScreenProps } from "./messenger.contract";
import {
  currentMessengerReply,
  initialMessengerSessionState,
  messengerExitOutcome,
  messengerSessionReducer,
  visibleMessengerMessages,
} from "./messenger";
import "./messenger-screen.css";

// 메신저 특별 유닛 — 에피소드의 서사 기반 최종 테스트입니다(Figma 80-7082). 지민의 메시지에
// 학습자가 **가상 키보드(두벌식)로 답장을 쳐서** 답합니다. 입력창에 답장이 초성으로 가려져
// 보이고(`ㅈㅇㅇ!`), 그 아래 답장의 뜻(영문)이 늘 섭니다 — 뜻만으로는 너무 어려워, 글자 수와
// 첫소리를 보여 줍니다.
//
// 맞히면 판정 배지와 초록 테두리가 서고 잠시 뒤 답장이 대화에 섭니다. 틀리면 자판 자리에
// `Try Again`이 서고, 누르면 입력을 비우고 같은 답장을 다시 칩니다.
//
// 화면 세션만 로컬로 소유하고 완료 기록은 상위 경계의 콜백으로 알립니다. `exitLabel`은
// 어느 탭에서 열렸는지를 화면이 알아서가 아니라 데이터로 받습니다(ADR-0007 D3).
//
// 디자인의 사진 메시지와 오른쪽 위 설정 버튼은 그리지 않습니다 — 그림 자산이 없고, 설정이
// 갈 곳이 정해지지 않았습니다(서사 메신저와 같습니다).
export function MessengerScreen({
  conversation,
  completionStatus,
  exitLabel = specialUnitExitLabel("journey"),
  onExit,
  onComplete,
  onReplay,
}: MessengerScreenProps) {
  const [session, setSession] = useState(() => initialMessengerSessionState(completionStatus));
  const [composer, dispatchComposer] = useReducer(
    messengerComposerReducer,
    initialMessengerComposerState,
  );
  const messages = visibleMessengerMessages(conversation, session);
  const reply = currentMessengerReply(conversation, session);
  const typed = composedText(composer);

  // 맞힌 답장은 배지를 읽을 틈을 두고 대화에 섭니다. 그 사이 화면을 떠나면 타이머가
  // 걷혀 답장이 서지 않습니다.
  useEffect(() => {
    if (composer.verdict !== "correct") {
      return undefined;
    }
    const timer = setTimeout(() => {
      const next = messengerSessionReducer(session, { type: "reply" });
      if (next.mode === "completed" && session.mode !== "completed") onComplete(conversation.id);
      setSession(next);
      dispatchComposer({ type: "clear" });
    }, messengerCorrectDelayMs);
    return () => clearTimeout(timer);
  }, [composer.verdict]);

  // 메시지가 늘 때마다 대화 끝을 보입니다 — 자판이 화면 아래를 차지해 새 메시지가 숨기
  // 쉽습니다.
  useEffect(() => {
    scrollToMessengerEnd();
  }, [messages.length]);

  const handleReplay = () => {
    onReplay(conversation.id);
    setSession(messengerSessionReducer(session, { type: "replay" }));
    dispatchComposer({ type: "clear" });
  };

  const handleSend = () => {
    if (reply !== null) dispatchComposer({ type: "submit", answer: reply.text });
  };

  const canSend = composer.verdict === "typing" && typed.trim().length > 0;

  return (
    <view className="messenger-screen" data-testid="messenger-screen">
      <view className="messenger-screen-header">
        {/* 탭과 접근성 이름은 바깥 상자가 집니다 — 원 버튼은 모양만 빌립니다. 상자가 하나의
            접근성 요소라 안쪽 원 버튼은 따로 읽히지 않습니다. */}
        <view
          className="messenger-screen-exit"
          data-testid="messenger-screen-exit"
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label={exitLabel}
          bindtap={() => onExit(messengerExitOutcome(session))}
        >
          <RoundButton
            accessibilityLabel={exitLabel}
            icon={arrowLeft03}
            variant="neutral"
            size="xl"
          />
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
        <view className="messenger-message-list" data-testid="messenger-message-list">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </view>
        <view id={messengerEndId} className="messenger-screen-end" />
      </scroll-view>

      {reply === null ? (
        <view className="messenger-screen-action">
          <ReplayButton onReplay={handleReplay} />
        </view>
      ) : (
        <view className="messenger-screen-reply" data-testid="messenger-reply">
          {composer.verdict === "typing" ? null : (
            <AnswerVerdict result={composer.verdict === "correct" ? "correct" : "incorrect"} />
          )}
          <view
            className={`messenger-composer messenger-composer-${composer.verdict}`}
            data-testid="messenger-composer"
            data-verdict={composer.verdict}
          >
            <view className="messenger-composer-body">
              {/* 비어 있으면 가린 정답이 자리를 채우고, 치기 시작하면 친 글자가 그 자리에
                  섭니다. 가린 정답은 아래 줄로 옮겨 가 계속 보입니다. */}
              <text
                className={
                  typed.length === 0
                    ? "messenger-composer-text messenger-composer-placeholder"
                    : "messenger-composer-text"
                }
                data-testid="messenger-composer-text"
                text-maxline="2"
              >
                {typed.length === 0 ? maskedAnswer(reply.text) : typed}
              </text>
              <text
                className="messenger-composer-hint"
                data-testid="messenger-composer-hint"
                text-maxline="2"
              >
                {typed.length === 0
                  ? reply.translation
                  : `${maskedAnswer(reply.text)} · ${reply.translation}`}
              </text>
            </view>
            <view
              className={
                canSend
                  ? "messenger-composer-send"
                  : "messenger-composer-send messenger-composer-send-idle"
              }
              data-testid="messenger-send"
              accessibility-element={true}
              accessibility-traits={canSend ? "button" : "disabled"}
              accessibility-label={canSend ? `보내기, ${typed}` : "보내기"}
              bindtap={handleSend}
            >
              <svg
                className="messenger-composer-send-icon"
                content={arrowUp02}
                current-color={color.white}
              />
            </view>
          </view>
          {composer.verdict === "incorrect" ? (
            <view className="messenger-screen-retry" data-testid="messenger-try-again">
              <Button
                label="Try Again"
                variant="brand"
                size="xl"
                width="fill"
                icon={refresh}
                iconPosition="trailing"
                bindtap={() => dispatchComposer({ type: "retry" })}
              />
            </view>
          ) : (
            <MessengerKeyboard
              shifted={composer.shifted}
              onPress={(key) => dispatchComposer({ type: "press", key })}
              onBackspace={() => dispatchComposer({ type: "backspace" })}
              onShift={() => dispatchComposer({ type: "shift" })}
            />
          )}
        </view>
      )}
    </view>
  );
}

// 끝의 여백입니다. `invoke`는 ID 선택자만 받습니다(클래스는 `SELECTOR_NOT_SUPPORTED`).
const messengerEndId = "messenger-screen-end";

function scrollToMessengerEnd(): void {
  "background only";
  try {
    lynx
      .createSelectorQuery()
      .select(`#${messengerEndId}`)
      .invoke({
        method: "scrollIntoView",
        params: { scrollIntoViewOptions: { block: "end", behavior: "smooth" } },
      })
      .exec();
  } catch {
    // 못 내려도 대화는 이어집니다 — 손으로 내려 읽을 수 있습니다.
  }
}
