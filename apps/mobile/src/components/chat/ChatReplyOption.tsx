import type { ReactNode } from "@lynx-js/react";

import { chatReplyOptionLabel } from "./chat-reply-option";
import type { ChatReplyOptionProps } from "./chat.contract";

import "./chat.css";

// 답장 보기 면 — brand 면에 흰 첫 줄, 아래 줄들(빈 줄은 생략). 고른 보기(picked)는 눌림과 같은 진한 면입니다.
export function ChatReplyOption({
  primary,
  lines,
  state,
  testId,
  onPick,
}: ChatReplyOptionProps): ReactNode {
  return (
    <view
      className={
        state === "picked" ? "chat-reply-option chat-reply-option-picked" : "chat-reply-option"
      }
      data-testid={testId}
      data-state={state}
      accessibility-element={true}
      accessibility-label={chatReplyOptionLabel(primary, lines)}
      accessibility-traits="button"
      bindtap={() => {
        "background only";
        onPick();
      }}
    >
      <text className="chat-reply-option-primary">{primary}</text>
      {lines.map((line, index) =>
        line === "" ? null : (
          <text key={`${index}:${line}`} className="chat-reply-option-line">
            {line}
          </text>
        ),
      )}
    </view>
  );
}
