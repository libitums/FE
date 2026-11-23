import type { ReactNode } from "@lynx-js/react";
import search from "@libitums/icons/lynx/search";
import { color } from "@libitums/design-tokens";
import { Avatar } from "@libitums/ui-lynx/avatar";

import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { storyAgeOf } from "./friend-stories";
import {
  friendStoriesTestIds as ids,
  type FriendStoriesRowProps,
  type FriendStoryEntry,
  type UnmetStoryEntry,
} from "./friend-stories.contract";
import { SuggestedAvatar } from "./SuggestedFriendsRow";

import "./suggested-friends.css";
import "./friend-stories.css";

type Ring = "unseen" | "seen" | "unmet";

function StoryFace({
  testId,
  ring,
  name,
  avatarUrl,
  caption,
  captionTone,
  label,
  onTap,
}: {
  readonly testId: string;
  readonly ring: Ring;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly caption: string;
  readonly captionTone: "muted" | "brand";
  readonly label: string;
  readonly onTap: () => void;
}): ReactNode {
  function handleTap() {
    "background only";
    playSound("button");
    onTap();
  }
  return (
    <view
      className="story-item"
      data-testid={testId}
      data-state={ring}
      accessibility-element={true}
      accessibility-label={label}
      accessibility-traits="button"
      accessibility-enable-tap={true}
      flatten={false}
      bindtap={handleTap}
    >
      <view className={`story-ring story-ring-${ring}`}>
        <Avatar imageSource={avatarUrl ?? undefined} name={name} size="lg" accessibility="hidden" />
      </view>
      <text
        className={ring === "seen" ? "story-name story-name-seen" : "story-name"}
        accessibility-elements-hidden={true}
      >
        {name}
      </text>
      <text
        className={captionTone === "brand" ? "story-caption story-caption-brand" : "story-caption"}
        accessibility-elements-hidden={true}
      >
        {caption}
      </text>
    </view>
  );
}

/**
 * 채팅 목록 맨 위 스토리 줄(ADR-0177 D3, 시안 1번) — 추천 친구 줄(ADR-0162) 자리를 바꿉니다. 판정은 `storyRowOf`가 하고 여기서는
 * 그리기만 합니다. 목록 스크롤 안이라 z-index 없이 문서 순서로 그립니다.
 */
export function FriendStoriesRow({
  row,
  now,
  onOpenFriend,
  onOpenUnmet,
  onOpenSuggested,
  onWatchAll,
  onFindFriends,
}: FriendStoriesRowProps): ReactNode {
  const copy = useUiCopy().messengerChat.stories;
  const friendFace = (entry: FriendStoryEntry) => {
    const { counterpart } = entry.room;
    const age = copy.age(storyAgeOf(entry.story.postedAt, now));
    return (
      <StoryFace
        key={entry.story.id}
        testId={ids.friend(counterpart.id)}
        ring={entry.seen ? "seen" : "unseen"}
        name={counterpart.name}
        avatarUrl={counterpart.avatarUrl}
        caption={entry.seen ? copy.seen : age}
        captionTone="muted"
        label={copy.friendLabel(counterpart.name, age, entry.seen)}
        onTap={() => onOpenFriend(entry)}
      />
    );
  };
  const unmetFace = (entry: UnmetStoryEntry) => {
    const { counterpart } = entry.friend.room;
    return (
      <StoryFace
        key={entry.story.id}
        testId={ids.unmet(counterpart.id)}
        ring="unmet"
        name={entry.friend.character.name}
        avatarUrl={counterpart.avatarUrl}
        caption={copy.newBadge}
        captionTone="brand"
        label={copy.unmetLabel(entry.friend.character.name)}
        onTap={() => onOpenUnmet(entry)}
      />
    );
  };
  function handleWatchAll() {
    "background only";
    playSound("button");
    onWatchAll();
  }
  function handleFind() {
    "background only";
    playSound("button");
    onFindFriends();
  }
  const hasFriends = row.friends.length > 0;
  const hasRest = row.unmet.length > 0 || row.others.length > 0;
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
        {hasFriends ? (
          <view
            className="suggested-row-see-all"
            data-testid={ids.watchAll}
            accessibility-element={true}
            accessibility-label={copy.watchAllLabel}
            accessibility-traits="button"
            accessibility-enable-tap={true}
            flatten={false}
            bindtap={handleWatchAll}
          >
            <text className="suggested-row-see-all-text">{copy.watchAll}</text>
          </view>
        ) : null}
      </view>
      <scroll-view
        className="suggested-row-scroll"
        scroll-orientation="horizontal"
        scroll-bar-enable={false}
      >
        <view className="suggested-row-track">
          {row.friends.map(friendFace)}
          {hasFriends && hasRest ? (
            <view
              className="story-divider"
              data-testid={ids.divider}
              accessibility-elements-hidden={true}
            />
          ) : null}
          {row.unmet.map(unmetFace)}
          {row.others.map((friend) => (
            <view key={friend.character.id} data-testid={ids.suggested(friend.character.id)}>
              <SuggestedAvatar friend={friend} onOpen={onOpenSuggested} />
            </view>
          ))}
          <view
            className="story-item"
            data-testid={ids.findFriends}
            accessibility-element={true}
            accessibility-label={copy.findFriendsLabel}
            accessibility-traits="button"
            accessibility-enable-tap={true}
            flatten={false}
            bindtap={handleFind}
          >
            <view className="story-find">
              <svg className="story-find-icon" content={search} current-color={color.fg.brand} />
            </view>
            <text className="story-name" accessibility-elements-hidden={true}>
              {copy.findFriends}
            </text>
          </view>
        </view>
      </scroll-view>
      <view className="suggested-divider" />
    </view>
  );
}
