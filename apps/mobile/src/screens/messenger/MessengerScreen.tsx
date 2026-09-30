import { useEffect, useReducer, useState } from "@lynx-js/react";
import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import refresh from "@libitums/icons/lynx/refresh";
import { Button } from "@libitums/ui-lynx/button";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import type { AnswerResult } from "../../lib/answer-result";
import { specialUnitExitLabel } from "../../lib/special-unit-entry-source";
import { useUiCopy } from "../../lib/ui-copy";
import { MessageBubble } from "./MessageBubble";
import { MessengerChoices } from "./MessengerChoices";
import { MessengerComposer } from "./MessengerComposer";
import { MessengerKeyboard } from "./MessengerKeyboard";
import { MessengerFinishButton } from "./MessengerFinishButton";
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
// 학습자가 답장을 **가상 키보드(두벌식)로 쳐서** 답하거나(Figma 80-7082), 답장에 보기가
// 있으면 **객관식 보기에서 골라** 답합니다(Figma 80-7380). 어느 쪽인지는 답장 데이터
// (`SelfMessage.choices`)가 정합니다. 힌트는 `MessengerComposer`가 집니다.
//
// 맞히면 판정 배지와 초록 테두리가 서고 잠시 뒤 답장이 대화에 섭니다. 틀리면 자판 · 보기 자리에
// `Try Again`이 서고, 누르면 입력을 비우고 같은 답장을 다시 칩니다. 대화가 끝나면 `See results`가
// 학습 완료 화면(PERFECT LESSON)으로 이어집니다.
//
// 화면 세션만 로컬로 소유하고 완료 기록은 상위 경계의 콜백으로 알립니다. `exitLabel`은
// 어느 탭에서 열렸는지를 화면이 알아서가 아니라 데이터로 받습니다(ADR-0007 D3).
//
// 디자인의 사진 메시지와 오른쪽 위 설정 버튼은 그리지 않습니다 — 그림 자산이 없고, 설정이
// 갈 곳이 정해지지 않았습니다(서사 메신저와 같습니다).
export function MessengerScreen({
  conversation,
  completionStatus,
  exitTo = "journey",
  onExit,
  onComplete,
  onFinish,
}: MessengerScreenProps) {
  const copy = useUiCopy();
  const exitLabel = specialUnitExitLabel(exitTo, copy);
  const [session, setSession] = useState(() => initialMessengerSessionState(completionStatus));
  const [composer, dispatchComposer] = useReducer(
    messengerComposerReducer,
    initialMessengerComposerState,
  );
  const messages = visibleMessengerMessages(conversation, session);
  const reply = currentMessengerReply(conversation, session);
  const typed = composedText(composer);
  // 답장마다 첫 시도의 정오입니다 — 틀린 뒤 다시 쳐서 맞혀도 그 답장은 오답으로 남습니다.
  // 학습 완료 화면이 이것으로 실수 수를 셉니다.
  const [results, setResults] = useState<readonly AnswerResult[]>([]);

  // 판정이 나면 그 답장의 첫 시도만 결과에 싣습니다.
  useEffect(() => {
    if (composer.verdict === "typing" || session.mode !== "active") {
      return;
    }
    if (results.length === session.replyIndex) {
      setResults([...results, composer.verdict === "correct" ? "correct" : "incorrect"]);
    }
  }, [composer.verdict]);

  // 맞힌 답장은 배지를 읽을 틈을 두고 대화에 섭니다. 그 사이 화면을 떠나면 타이머가
  // 걷혀 답장이 서지 않습니다.
  //
  // 의존은 판정 하나뿐입니다. 판정 틈에는 자판 · 보기가 잠겨 세션을 바꿀 길이 이 타이머뿐이라,
  // 캡처한 `session`이 낡을 수 없습니다. `onComplete`를 `setSession` 갱신 함수 안에서 부르지
  // 않습니다 — 갱신 함수는 순수해야 하고 두 번 불릴 수 있어, 완료가 두 번 알려질 수 있습니다.
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

  const handleSend = () => {
    if (reply !== null) dispatchComposer({ type: "submit", answer: reply.text });
  };

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
        {conversation.introduction ? (
          <text className="messenger-story-context" data-testid="messenger-story-introduction">
            {conversation.introduction}
          </text>
        ) : null}
        <view className="messenger-message-list" data-testid="messenger-message-list">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </view>
        {session.mode === "completed" && conversation.completion ? (
          <text className="messenger-story-context" data-testid="messenger-story-completion">
            {conversation.completion}
          </text>
        ) : null}
        <view id={messengerEndId} className="messenger-screen-end" />
      </scroll-view>

      {reply === null ? (
        <view className="messenger-screen-action">
          <MessengerFinishButton onFinish={() => onFinish(conversation.id, results)} />
        </view>
      ) : (
        <view className="messenger-screen-reply" data-testid="messenger-reply">
          <MessengerComposer
            reply={reply}
            typed={typed}
            verdict={composer.verdict}
            onSend={handleSend}
          />
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
          ) : reply.choices === undefined ? (
            <MessengerKeyboard
              shifted={composer.shifted}
              onPress={(key) => dispatchComposer({ type: "press", key })}
              onBackspace={() => dispatchComposer({ type: "backspace" })}
              onShift={() => dispatchComposer({ type: "shift" })}
            />
          ) : (
            <MessengerChoices
              choices={reply.choices}
              chosen={typed}
              onChoose={(text) => dispatchComposer({ type: "choose", text })}
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
