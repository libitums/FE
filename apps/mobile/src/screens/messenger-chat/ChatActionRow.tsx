import type { ReactNode } from "@lynx-js/react";

import type { ChatText } from "./chat-source.contract";
import { actionSpoken } from "./companion-parse";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

import "./chat-action.css";

export type ChatActionRowProps = { readonly text: ChatText; readonly name: string };

// 상대의 행동 · 서술 지문입니다(ADR-0137) — 말풍선 없이 회색 기울임 줄, 말풍선이 시작하는 자리에 맞춰 섭니다. 번역은 아래 작은 줄.
export function ChatActionRow({ text, name }: ChatActionRowProps): ReactNode {
  return (
    <view
      className="chat-action"
      data-testid={ids.action}
      flatten={false}
      accessibility-element={true}
      accessibility-label={actionSpoken(text, name)}
    >
      <text className="chat-action-text">{text.ko}</text>
      {text.en === "" ? null : <text className="chat-action-translation">{text.en}</text>}
    </view>
  );
}
