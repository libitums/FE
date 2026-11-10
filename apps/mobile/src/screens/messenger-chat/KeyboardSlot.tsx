import type { ReactNode } from "@lynx-js/react";

import type { ChatSlotContent } from "./keyboard-height";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

import "./messenger-chat.css";

export type KeyboardSlotProps = {
  readonly height: number;
  /** 지금 자리에 선 것입니다(`chatSlotContent`). 자리 표지와 검증용 data 속성에 실립니다. */
  readonly content: ChatSlotContent;
  readonly children?: ReactNode;
};

// 고정 높이 자리 — 학습 키보드 · 빈 자리 표시 · 답장 보기 판이 같은 높이에서 바꿔 끼워집니다.
export function KeyboardSlot({ height, content, children }: KeyboardSlotProps): ReactNode {
  return (
    <view
      className="messenger-chat-slot"
      data-testid={ids.slot}
      data-content={content}
      data-height={String(height)}
      style={{ height: `${height}px` }}
    >
      {children}
    </view>
  );
}

// 휴대폰 키보드가 덮을 자리를 비워 둡니다 — 네이티브 키보드가 이 위에 올라옵니다.
export function PhoneKeyboardSpacer(): ReactNode {
  return <view className="messenger-chat-slot-spacer" accessibility-elements-hidden={true} />;
}
