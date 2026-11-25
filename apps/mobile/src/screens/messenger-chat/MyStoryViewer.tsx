import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import clock from "@libitums/icons/lynx/clock";
import menu from "@libitums/icons/lynx/menu";
import trash from "@libitums/icons/lynx/trash";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";

import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { storyAgeOf } from "./friend-stories";
import {
  myStoriesTestIds as ids,
  type MyStory,
  type MyStoryReaction,
  type ReactionFace,
} from "./my-stories.contract";
import { MyStoryIconButton, MyStoryLayer } from "./MyStoryLayer";
import { MyPhotoStoryCard } from "./MyPhotoStoryCard";
import { MyTextStoryCard, ReactionRow, SeenBy } from "./MyStoryReactions";

export type MyStoryViewerProps = {
  readonly story: MyStory;
  readonly now: number;
  readonly face: (characterId: string) => ReactionFace | null;
  /** 반응의 「Open chat」 — 그 인물 방으로(ADR-0191 D2). */
  readonly onOpenChat: (reaction: MyStoryReaction) => void;
  /** 답할 친구가 있는가 — 없으면 막 올린 뒤 「Add a friend to get replies」(시안 17번). */
  readonly hasFriends: boolean;
  /** 친구 찾기 — 없으면(설정 › My stories) 단추 없이 안내만. */
  readonly onFindFriends?: () => void;
  readonly onDelete: () => void;
  readonly onClose: () => void;
  /** 위에 확인 상자가 떠 있는가 — 낭독에서 가립니다. */
  readonly covered?: boolean;
  /** 사진 스토리의 서명 주소(ADR-0199) — 없으면 사진 자리에 빈 바탕. */
  readonly photoUrl?: (imagePath: string) => Promise<string | null>;
};

/**
 * 내 스토리 보기(ADR-0194 · ADR-0191, 시안 16 · 17번) — 카드, 「N friends replied」 + Seen by, 반응마다 「Open chat」(그 인물 방 — 반응은
 * 그 방의 메시지가 정본), 맨 아래 「Replies are saved in each friend's chat.」. 아직 답이 없으면 한 시간 안내, 답할 친구가 없으면 친구 추가
 * 안내. ⋯ 메뉴의 「Delete story」(확인 상자는 부르는 쪽). 반응 얼굴은 대화 스냅숏의 방에서 — 방이 없는 인물의 반응은 줄에 서지 않습니다.
 */
export function MyStoryViewer({
  story,
  now,
  face,
  onOpenChat,
  hasFriends,
  onFindFriends,
  onDelete,
  onClose,
  covered = false,
  photoUrl,
}: MyStoryViewerProps): ReactNode {
  const all = useUiCopy().messengerChat;
  const copy = all.myStories.viewer;
  const [menuOpen, setMenuOpen] = useState(false);
  const ageOf = (at: number) => all.stories.age(storyAgeOf(at, now));
  const rows = story.reactions.flatMap((reaction) => {
    const who = face(reaction.characterId);
    return who === null ? [] : [{ reaction, who }];
  });
  const live = story.expiresAt > now;

  return (
    <MyStoryLayer
      testId={ids.viewer}
      title={copy.yourStory}
      closeTestId={ids.viewerClose}
      closeLabel={copy.close}
      onClose={onClose}
      hidden={covered}
      trailing={
        <MyStoryIconButton
          testId={ids.viewerMenu}
          icon={menu}
          label={copy.options}
          onTap={() => setMenuOpen((open) => !open)}
        />
      }
    >
      {menuOpen ? (
        <view
          className="my-story-menu-item"
          data-testid={ids.viewerDelete}
          accessibility-element={true}
          accessibility-label={copy.delete}
          accessibility-traits="button"
          accessibility-enable-tap={true}
          flatten={false}
          bindtap={() => {
            "background only";
            playSound("button");
            setMenuOpen(false);
            onDelete();
          }}
        >
          <svg className="my-story-icon" content={trash} current-color={color.fg.neutral} />
          <text className="my-story-menu-text danger">{copy.delete}</text>
        </view>
      ) : null}
      <text className="my-story-meta">{`${ageOf(story.postedAt)} · ${
        story.kind === "text"
          ? copy.textLabel
          : story.kind === "photo"
            ? all.myStories.photo.kindLabel
            : copy.kindLabel(story.kind)
      }`}</text>
      {story.kind === "photo" ? (
        <MyPhotoStoryCard story={story} {...(photoUrl === undefined ? {} : { photoUrl })} />
      ) : story.kind === "text" ? (
        <MyTextStoryCard story={story} />
      ) : (
        <view className="my-story-card" data-testid={ids.card}>
          <text className="my-story-card-tag">{copy.cardTag(story.kind)}</text>
          <text className="my-story-card-ko" data-testid={ids.cardKo}>
            {story.ko}
          </text>
          {story.roman === "" ? null : <text className="my-story-card-roman">{story.roman}</text>}
          <text className="my-story-card-meaning">{story.meaning}</text>
          {story.example === null ? null : (
            <view className="my-story-card-example">
              <text className="my-story-card-example-ko">{story.example.ko}</text>
              {story.example.meaning === "" ? null : (
                <text className="my-story-card-example-meaning">{story.example.meaning}</text>
              )}
            </view>
          )}
        </view>
      )}
      {live ? null : <text className="my-story-note">{copy.hidden}</text>}
      <view className="my-story-reactions" data-testid={ids.reactions}>
        <view className="my-story-reactions-head">
          <text className="my-story-section-title" accessibility-traits="header" flatten={false}>
            {copy.replied(rows.length)}
          </text>
          <SeenBy story={story} face={face} />
        </view>
        {rows.length > 0 ? (
          <>
            {rows.map(({ reaction, who }) => (
              <ReactionRow
                key={reaction.id}
                reaction={reaction}
                face={who}
                age={ageOf(reaction.at)}
                onOpenChat={() => onOpenChat(reaction)}
              />
            ))}
            <text className="my-story-note center" data-testid={ids.savedNote}>
              {copy.saved}
            </text>
          </>
        ) : live ? (
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
        ) : null}
      </view>
    </MyStoryLayer>
  );
}
