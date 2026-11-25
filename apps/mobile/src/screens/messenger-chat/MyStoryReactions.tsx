import type { ReactNode } from "@lynx-js/react";
import arrowRight from "@libitums/icons/lynx/arrow-right";
import { color } from "@libitums/design-tokens";
import { Avatar } from "@libitums/ui-lynx/avatar";

import { playSound } from "../../lib/sound-effects";
import { laneBoxStyle, laneStyle, stickerStyle } from "./MyStorySticker";
import { useUiCopy } from "../../lib/ui-copy";
import {
  myStoriesTestIds as ids,
  type MyStory,
  type MyStoryReaction,
  type ReactionFace,
} from "./my-stories.contract";

// 내 스토리 보기의 반응 줄 · Seen by(ADR-0191, 시안 16번).

/** Seen by 얼굴 줄에 그리는 얼굴 수 — 그 이상은 수만(시안 16번은 넷). */
const SEEN_FACES = 4;

export function ReactionRow({
  reaction,
  face,
  age,
  onOpenChat,
}: {
  readonly reaction: MyStoryReaction;
  readonly face: ReactionFace;
  readonly age: string;
  readonly onOpenChat: () => void;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.viewer;
  return (
    <view className="my-story-reaction" data-testid={ids.reaction(reaction.id)}>
      <Avatar
        imageSource={face.avatarUrl ?? undefined}
        name={face.name}
        size="md"
        accessibility="hidden"
      />
      <view className="my-story-reaction-body">
        <view
          className="my-story-reaction-words"
          flatten={false}
          accessibility-element={true}
          accessibility-label={copy.reactionLabel(face.name, reaction.text, reaction.meaning)}
        >
          <text className="my-story-reaction-name" accessibility-elements-hidden={true}>
            {`${face.name} · ${age}`}
          </text>
          <text className="my-story-reaction-text" accessibility-elements-hidden={true}>
            {reaction.text}
          </text>
          {reaction.meaning === null ? null : (
            <text className="my-story-reaction-meta" accessibility-elements-hidden={true}>
              {`“${reaction.meaning}”`}
            </text>
          )}
        </view>
        <view
          className="my-story-open-chat"
          data-testid={ids.openChat(reaction.id)}
          accessibility-element={true}
          accessibility-label={copy.openChatLabel(face.name)}
          accessibility-traits="button"
          accessibility-enable-tap={true}
          flatten={false}
          bindtap={() => {
            "background only";
            playSound("button");
            onOpenChat();
          }}
        >
          <text className="my-story-open-chat-text" accessibility-elements-hidden={true}>
            {copy.openChat}
          </text>
          <svg
            className="my-story-open-chat-icon"
            content={arrowRight}
            current-color={color.white}
            accessibility-elements-hidden={true}
          />
        </view>
      </view>
    </view>
  );
}

/** 「Seen by N」 — 방이 있는 인물만 얼굴, 수는 서버가 준 그대로(시안 16번). */
export function SeenBy({
  story,
  face,
}: {
  readonly story: MyStory;
  readonly face: (characterId: string) => ReactionFace | null;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.viewer;
  const count = story.seenBy.length;
  if (count === 0) return null;
  const faces = story.seenBy
    .map((seen) => face(seen.characterId))
    .filter((who): who is ReactionFace => who !== null)
    .slice(0, SEEN_FACES);
  return (
    <view
      className="my-story-seen"
      data-testid={ids.seenBy}
      flatten={false}
      accessibility-element={true}
      accessibility-label={copy.seenByLabel(count)}
    >
      {faces.map((who, index) => (
        <view
          key={`${who.name}-${index}`}
          className={index === 0 ? "my-story-seen-face" : "my-story-seen-face overlap"}
          accessibility-elements-hidden={true}
        >
          <Avatar
            imageSource={who.avatarUrl ?? undefined}
            name={who.name}
            size="xs"
            accessibility="hidden"
          />
        </view>
      ))}
      <text className="my-story-seen-text" accessibility-elements-hidden={true}>
        {copy.seenBy(count)}
      </text>
    </view>
  );
}

/** 글 스토리 카드(서버 반영 예상, 시안 27번 결과) — 바탕색 · 한국어 한 줄 · 「뜻」 · 얹은 단어 · 카드(제자리 · 크기 · 회전 그대로). */
export function MyTextStoryCard({ story }: { readonly story: MyStory }): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.editor;
  return (
    <view
      className={`my-story-text-card my-story-bg-${story.background ?? "orange"}`}
      data-testid={ids.storyBackground}
    >
      {story.ko === "" || story.overlays.some((overlay) => overlay.kind === "text") ? null : (
        <view className="my-story-text-block" accessibility-element={true} flatten={false}>
          <text className="my-story-text-block-ko" data-testid={ids.cardKo}>
            {story.ko}
          </text>
          {story.meaning === "" ? null : (
            <text className="my-story-text-block-meaning">{`“${story.meaning}”`}</text>
          )}
        </view>
      )}
      {story.overlays.map((overlay, index) =>
        overlay.kind === "text" ? (
          <view key={`${overlay.ko}-${index}`} className="my-story-lane" style={laneStyle(overlay)}>
            <view
              className="my-story-text-box"
              style={laneBoxStyle(overlay)}
              flatten={false}
              accessibility-element={true}
              accessibility-label={
                overlay.meaning === undefined ? overlay.ko : `${overlay.ko}. ${overlay.meaning}`
              }
            >
              <text
                className={`my-story-text-box-ko my-story-ink-${overlay.color ?? "brown"}`}
                data-testid={ids.cardKo}
                accessibility-elements-hidden={true}
              >
                {overlay.ko}
              </text>
              {overlay.roman === undefined ? null : (
                <text className="my-story-sticker-roman" accessibility-elements-hidden={true}>
                  {overlay.roman}
                </text>
              )}
              {overlay.meaning === undefined ? null : (
                <text className="my-story-sticker-meaning" accessibility-elements-hidden={true}>
                  {`“${overlay.meaning}”`}
                </text>
              )}
            </view>
          </view>
        ) : (
          <view
            key={`${overlay.ko}-${index}`}
            className="my-story-sticker"
            style={stickerStyle(overlay)}
            flatten={false}
            accessibility-element={true}
            accessibility-label={copy.stickerLabel(overlay.ko, overlay.meaning ?? "")}
          >
            <text className="my-story-sticker-ko" accessibility-elements-hidden={true}>
              {overlay.ko}
            </text>
            {overlay.meaning === undefined ? null : (
              <text className="my-story-sticker-meaning" accessibility-elements-hidden={true}>
                {overlay.meaning}
              </text>
            )}
          </view>
        ),
      )}
    </view>
  );
}
