import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { messengerListTestIds as ids } from "./messenger-chat.contract";

import "./messenger-list.css";

export type ChatListNewBadgeProps = { readonly roomId: string };

/** 목록 행의 NEW 알약입니다(design §3). 줄 라벨이 「New friend」를 이미 읽으므로 알약 자체는 낭독에서 숨깁니다. */
export function ChatListNewBadge({ roomId }: ChatListNewBadgeProps): ReactNode {
  const copy = useUiCopy().messengerChat;
  return (
    <view
      className="messenger-list-new"
      data-testid={ids.rowNew(roomId)}
      accessibility-elements-hidden={true}
    >
      <text className="messenger-list-new-text">{copy.list.newBadge}</text>
    </view>
  );
}
