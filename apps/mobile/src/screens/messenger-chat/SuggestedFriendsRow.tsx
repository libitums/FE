import type { ReactNode } from "@lynx-js/react";
import lock from "@libitums/icons/lynx/lock";
import plus from "@libitums/icons/lynx/plus";
import { color } from "@libitums/design-tokens";
import { Avatar } from "@libitums/ui-lynx/avatar";

import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import type { SuggestedFriendsCopy, SuggestedFriendsRowProps } from "./suggested-friends.contract";
import { suggestedFriendsTestIds as ids } from "./suggested-friends.contract";
import type { SuggestedFriend } from "./suggested-friends";

import "./suggested-friends.css";

function labelOf(friend: SuggestedFriend, copy: SuggestedFriendsCopy): string {
  const { name, unlockEpisode } = friend.character;
  if (friend.status === "addable" || unlockEpisode === null) return copy.newLabel(name);
  return friend.offer === null
    ? copy.lockedLabel(name, unlockEpisode)
    : copy.earlyLabel(name, unlockEpisode, friend.offer.price);
}

export function SuggestedAvatar({
  friend,
  onOpen,
}: {
  readonly friend: SuggestedFriend;
  readonly onOpen: (friend: SuggestedFriend) => void;
}): ReactNode {
  const copy = useUiCopy().messengerChat.suggested;
  const { character } = friend;
  const locked = friend.status === "locked";
  function handleTap() {
    "background only";
    playSound("button");
    onOpen(friend);
  }
  return (
    <view
      className="suggested-item"
      data-testid={ids.avatar(character.id)}
      data-state={friend.status}
      accessibility-element={true}
      accessibility-label={labelOf(friend, copy)}
      accessibility-traits="button"
      accessibility-enable-tap={true}
      flatten={false}
      bindtap={handleTap}
    >
      <view className={locked ? "suggested-ring suggested-ring-locked" : "suggested-ring"}>
        <Avatar
          imageSource={friend.room.counterpart.avatarUrl ?? undefined}
          name={character.name}
          size="lg"
          accessibility="hidden"
        />
        <view
          className={locked ? "suggested-badge suggested-badge-locked" : "suggested-badge"}
          accessibility-elements-hidden={true}
        >
          <svg
            className="suggested-badge-icon"
            content={locked ? lock : plus}
            current-color={color.white}
          />
        </view>
      </view>
      <text
        className={locked ? "suggested-name suggested-name-locked" : "suggested-name"}
        accessibility-elements-hidden={true}
      >
        {character.name}
      </text>
    </view>
  );
}

/**
 * 채팅 목록 머리 아래 「Meet new friends」 줄(R1, ADR-0162)입니다. 추천 판정 · 최대 수는 `suggested-friends`가 정하고, 여기서는
 * 받은 인물을 가로 스크롤로 그리기만 합니다. 목록 스크롤 안이라 z-index 없이 문서 순서로 배지를 얹습니다.
 */
export function SuggestedFriendsRow({
  friends,
  onOpen,
  onSeeAll,
}: SuggestedFriendsRowProps): ReactNode {
  const copy = useUiCopy().messengerChat.suggested;
  function handleSeeAll() {
    "background only";
    playSound("button");
    onSeeAll();
  }
  return (
    <view className="suggested-row" data-testid={ids.row}>
      <view className="suggested-row-head">
        <text
          className="suggested-row-title"
          data-testid={ids.title}
          accessibility-traits="header"
          flatten={false}
          accessibility-element={true}
        >
          {copy.rowTitle}
        </text>
        <view
          className="suggested-row-see-all"
          data-testid={ids.seeAll}
          accessibility-element={true}
          accessibility-label={copy.seeAllLabel}
          accessibility-traits="button"
          accessibility-enable-tap={true}
          flatten={false}
          bindtap={handleSeeAll}
        >
          <text className="suggested-row-see-all-text">{copy.seeAll}</text>
        </view>
      </view>
      <scroll-view
        className="suggested-row-scroll"
        scroll-orientation="horizontal"
        scroll-bar-enable={false}
      >
        <view className="suggested-row-track">
          {friends.map((friend) => (
            <SuggestedAvatar key={friend.character.id} friend={friend} onOpen={onOpen} />
          ))}
        </view>
      </scroll-view>
      <view className="suggested-divider" />
    </view>
  );
}
