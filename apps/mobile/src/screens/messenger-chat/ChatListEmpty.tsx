import type { ReactNode } from "@lynx-js/react";
import message from "@libitums/icons/lynx/message";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";

import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { messengerListTestIds as ids } from "./messenger-chat.contract";

import "./messenger-list.css";

export type ChatListEmptyProps = { readonly onGoToJourney: () => void };

/** 방이 하나도 없을 때의 안내입니다(M2) — 여정으로 가는 길 하나만 둡니다. */
export function ChatListEmpty({ onGoToJourney }: ChatListEmptyProps): ReactNode {
  const copy = useUiCopy().messengerChat.list;
  function handleGo() {
    "background only";
    playSound("button");
    onGoToJourney();
  }
  return (
    <view className="messenger-list-empty" data-testid={ids.empty}>
      <view className="messenger-list-empty-circle">
        <svg
          className="messenger-list-empty-icon"
          content={message}
          current-color={color.brand.primary}
        />
      </view>
      <text className="messenger-list-empty-title" accessibility-traits="header">
        {copy.emptyTitle}
      </text>
      <text className="messenger-list-empty-body">{copy.emptyBody}</text>
      {/* 탭은 감싸는 상자가 받습니다 — 단추의 탭은 위로 올라와 여기서 처리되고, 단추 자체는 모양과
          낭독(버튼 trait)만 맡습니다. */}
      <view
        className="messenger-list-empty-go"
        data-testid={ids.emptyGoToJourney}
        bindtap={handleGo}
      >
        <Button label={copy.goToJourney} variant="brand" size="l" />
      </view>
    </view>
  );
}
