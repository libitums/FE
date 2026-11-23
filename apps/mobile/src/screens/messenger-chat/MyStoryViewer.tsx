import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import menu from "@libitums/icons/lynx/menu";
import trash from "@libitums/icons/lynx/trash";
import { color } from "@libitums/design-tokens";
import { Avatar } from "@libitums/ui-lynx/avatar";
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

export type MyStoryViewerProps = {
  readonly story: MyStory;
  readonly now: number;
  readonly face: (characterId: string) => ReactionFace | null;
  readonly onAnswer: (reaction: MyStoryReaction) => void;
  readonly onDelete: () => void;
  readonly onClose: () => void;
  /** 위에 확인 상자가 떠 있는가 — 낭독에서 가립니다. */
  readonly covered?: boolean;
};

function ReactionRow({
  reaction,
  face,
  onAnswer,
}: {
  readonly reaction: MyStoryReaction;
  readonly face: ReactionFace;
  readonly onAnswer: () => void;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.viewer;
  return (
    <view className="my-story-reaction" data-testid={ids.reaction(reaction.id)}>
      <view
        className="my-story-reaction-main"
        flatten={false}
        accessibility-element={true}
        accessibility-label={copy.reactionLabel(face.name, reaction.text, reaction.meaning)}
      >
        <Avatar
          imageSource={face.avatarUrl ?? undefined}
          name={face.name}
          size="md"
          accessibility="hidden"
        />
        <view className="my-story-reaction-body" accessibility-elements-hidden={true}>
          <text className="my-story-reaction-text">{reaction.text}</text>
          <text className="my-story-reaction-meta">
            {reaction.meaning === null ? face.name : `${face.name} · ${reaction.meaning}`}
          </text>
        </view>
      </view>
      <view data-testid={ids.answer(reaction.id)}>
        <Button
          label={copy.answer(face.name)}
          variant="outline"
          size="m"
          width="fill"
          bindtap={() => {
            "background only";
            onAnswer();
          }}
        />
      </view>
    </view>
  );
}

/**
 * 내 스토리 보기(ADR-0179, 시안 12번 — 단어 카드 + 친구 반응). 카드 · 반응 줄 · 「Answer <이름>」(그 반응에 답하러 대화방) · ⋯ 메뉴의
 * 「Delete story」(확인 상자는 부르는 쪽). 24시간이 지나면 친구에게는 보이지 않는다고 알립니다. 반응 얼굴은 대화 스냅숏의 방에서 —
 * 방이 없는 인물의 반응은 줄에 서지 않습니다.
 */
export function MyStoryViewer({
  story,
  now,
  face,
  onAnswer,
  onDelete,
  onClose,
  covered = false,
}: MyStoryViewerProps): ReactNode {
  const all = useUiCopy().messengerChat;
  const copy = all.myStories.viewer;
  const [menuOpen, setMenuOpen] = useState(false);
  const age = all.stories.age(storyAgeOf(story.postedAt, now));
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
      <text className="my-story-meta">{`${age} · ${copy.kindLabel(story.kind)}`}</text>
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
      {live ? null : <text className="my-story-note">{copy.hidden}</text>}
      <view className="my-story-reactions" data-testid={ids.reactions}>
        <text className="my-story-section-title" accessibility-traits="header" flatten={false}>
          {copy.repliesTitle}
        </text>
        {rows.length === 0 ? (
          live ? (
            <text className="my-story-note" data-testid={ids.waiting}>
              {copy.waiting}
            </text>
          ) : null
        ) : (
          rows.map(({ reaction, who }) => (
            <ReactionRow
              key={reaction.id}
              reaction={reaction}
              face={who}
              onAnswer={() => onAnswer(reaction)}
            />
          ))
        )}
      </view>
    </MyStoryLayer>
  );
}
