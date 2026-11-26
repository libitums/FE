import type { ReactNode } from "@lynx-js/react";
import search from "@libitums/icons/lynx/search";
import { color } from "@libitums/design-tokens";

import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { storyAgeOf } from "./friend-stories";
import { storyOrderOf } from "./story-order";
import {
  friendStoriesTestIds as ids,
  type FriendStoriesRowProps,
  type FriendStoryEntry,
  type UnmetStoryEntry,
} from "./friend-stories.contract";
import { myStoriesTestIds } from "./my-stories.contract";
import { MyStoryRowFaces } from "./MyStoryRowFaces";
import { StoryFace } from "./StoryFace";
import { SuggestedAvatar } from "./SuggestedFriendsRow";

import "./suggested-friends.css";
import "./friend-stories.css";

/**
 * 채팅 목록 맨 위 스토리 줄(ADR-0178 D3, 시안 1번) — 추천 친구 줄(ADR-0162) 자리를 바꿉니다. 판정은 `storyRowOf`, 칸 순서는
 * `storyOrderOf`(스토리 있는 인물 최신 순 → 스토리 없는 추천, 구분 선 없음 — D3 개정)가 하고 여기서는 그리기만 합니다. 목록 스크롤 안이라 z-index 없이 문서 순서로 그립니다.
 */
export function FriendStoriesRow({
  row,
  mine = null,
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
        ring={entry.seen ? "seen" : "unseen"}
        unmet
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
  const order = storyOrderOf(row);
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
          {mine === null ? null : <MyStoryRowFaces slot={mine} />}
          {mine !== null && order.length + row.others.length > 0 ? (
            <view
              className="story-mine-divider"
              data-testid={myStoriesTestIds.rowDivider}
              accessibility-element={false}
            />
          ) : null}
          {order.map((each) =>
            each.kind === "friend" ? friendFace(each.entry) : unmetFace(each.entry),
          )}
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
