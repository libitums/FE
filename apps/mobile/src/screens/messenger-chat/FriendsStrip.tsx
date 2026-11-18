import { useEffect, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { Avatar } from "@libitums/ui-lynx/avatar";

import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { friendsTestIds as ids } from "./chat-friends.contract";
import type { FriendCard } from "./companion-friends";

import "./friends.css";

export type FriendsStripProps = {
  readonly cards: readonly FriendCard[];
  /** 첫 입장 안내가 위에 떠 있으면 false — 줄은 그려 두지만 「보임」 이벤트는 안내가 끝난 뒤에 냅니다(ADR-0139 우선). */
  readonly active: boolean;
  readonly onOpen: (characterId: string) => void;
  /** 줄이 처음 보였을 때 한 번(카드 수) — `friends_strip_shown`. */
  readonly onShown: (count: number) => void;
};

/** 목록 위 「추천 친구」 가로 줄입니다. 카드가 없으면 아무것도 그리지 않습니다. 카드는 아바타 · 이름 · 직업 한 줄이고 누르면 프로필 시트. */
export function FriendsStrip({ cards, active, onOpen, onShown }: FriendsStripProps): ReactNode {
  const copy = useUiCopy().messengerChat.friends;
  const shown = useRef(false);
  const visible = active && cards.length > 0;
  useEffect(() => {
    if (!visible || shown.current) return;
    shown.current = true;
    onShown(cards.length);
  }, [visible, cards.length, onShown]);

  if (cards.length === 0) return null;
  return (
    <view className="friends-strip" data-testid={ids.strip}>
      <text
        className="friends-strip-title"
        data-testid={ids.stripTitle}
        flatten={false}
        accessibility-element={true}
        accessibility-heading={true}
      >
        {copy.stripTitle}
      </text>
      <scroll-view
        className="friends-strip-scroll"
        scroll-orientation="horizontal"
        scroll-bar-enable={false}
      >
        <view className="friends-strip-row">
          {cards.map((card) => (
            <view
              key={card.id}
              className="friends-card"
              data-testid={ids.card(card.id)}
              accessibility-element={true}
              accessibility-label={copy.cardLabel(card.name, card.tag)}
              accessibility-traits="button"
              accessibility-enable-tap={true}
              bindtap={() => {
                "background only";
                playSound("button");
                onOpen(card.id);
              }}
            >
              <Avatar
                imageSource={card.avatarUrl ?? undefined}
                name={card.name}
                size="lg"
                accessibility="hidden"
              />
              <text className="friends-card-name" text-maxline="1">
                {card.name}
              </text>
              <text className="friends-card-tag" text-maxline="2">
                {card.tag}
              </text>
            </view>
          ))}
        </view>
      </scroll-view>
    </view>
  );
}
