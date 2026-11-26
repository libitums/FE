import type { ReactNode } from "@lynx-js/react";
import clock from "@libitums/icons/lynx/clock";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";

import { useUiCopy } from "../../lib/ui-copy";
import { storyAgeOf } from "./friend-stories";
import {
  myStoriesTestIds as ids,
  type MyStory,
  type MyStoryReaction,
  type ReactionFace,
} from "./my-stories.contract";
import { ReactionRow } from "./MyStoryReactions";

/**
 * 내 스토리의 답 목록(ADR-0191, 시안 16 · 17번) — 반응마다 「Open chat」 + 맨 아래 「Replies are saved in each friend's chat.」. 답이 없으면
 * 살아 있는 동안 한 시간 안내, 답할 친구가 없으면 친구 추가 안내. 설정 › My stories 보기와 전체 화면 보기의 답 목록 시트가 함께 씁니다.
 * 반응 얼굴은 대화 스냅숏의 방에서 — 방이 없는 인물의 반응은 줄에 서지 않습니다.
 */
export function MyStoryReplyList({
  story,
  now,
  face,
  hasFriends,
  onFindFriends,
  onOpenChat,
}: {
  readonly story: MyStory;
  readonly now: number;
  readonly face: (characterId: string) => ReactionFace | null;
  readonly hasFriends: boolean;
  readonly onFindFriends?: () => void;
  readonly onOpenChat: (reaction: MyStoryReaction) => void;
}): ReactNode {
  const all = useUiCopy().messengerChat;
  const copy = all.myStories.viewer;
  const rows = story.reactions.flatMap((reaction) => {
    const who = face(reaction.characterId);
    return who === null ? [] : [{ reaction, who }];
  });
  if (rows.length > 0)
    return (
      <>
        {rows.map(({ reaction, who }) => (
          <ReactionRow
            key={reaction.id}
            reaction={reaction}
            face={who}
            age={all.stories.age(storyAgeOf(reaction.at, now))}
            onOpenChat={() => onOpenChat(reaction)}
          />
        ))}
        <text className="my-story-note center" data-testid={ids.savedNote}>
          {copy.saved}
        </text>
      </>
    );
  if (story.expiresAt <= now) return null;
  return (
    <>
      <view
        className="my-story-waiting"
        data-testid={ids.waiting}
        flatten={false}
        accessibility-element={true}
        accessibility-label={`${copy.waiting} ${copy.waitingBody}`}
      >
        <view className="my-story-waiting-icon" accessibility-elements-hidden={true}>
          <svg className="my-story-icon" content={clock} current-color={color.fg.brand} />
        </view>
        <view className="my-story-waiting-body" accessibility-elements-hidden={true}>
          <text className="my-story-waiting-title">{copy.waiting}</text>
          <text className="my-story-note">{copy.waitingBody}</text>
        </view>
      </view>
      {hasFriends ? null : (
        <view className="my-story-no-friends" data-testid={ids.noFriends}>
          <view
            className="my-story-waiting-body"
            flatten={false}
            accessibility-element={true}
            accessibility-label={`${copy.noFriendsTitle}. ${copy.noFriendsBody}`}
          >
            <text className="my-story-waiting-title" accessibility-elements-hidden={true}>
              {copy.noFriendsTitle}
            </text>
            <text className="my-story-note" accessibility-elements-hidden={true}>
              {copy.noFriendsBody}
            </text>
          </view>
          {onFindFriends === undefined ? null : (
            <view data-testid={ids.findFriends}>
              <Button
                label={copy.findFriends}
                variant="brand"
                size="s"
                bindtap={() => {
                  "background only";
                  onFindFriends();
                }}
              />
            </view>
          )}
        </view>
      )}
    </>
  );
}
