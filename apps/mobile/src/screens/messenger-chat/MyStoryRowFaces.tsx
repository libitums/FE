import type { ReactNode } from "@lynx-js/react";
import plus from "@libitums/icons/lynx/plus";
import { color } from "@libitums/design-tokens";

import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { myStoriesTestIds as ids, type MineRowSlot } from "./my-stories.contract";
import { StoryFace } from "./StoryFace";

import "./friend-stories.css";

/**
 * 스토리 줄 맨 앞(ADR-0179, 시안 1번 최신판) — 「+」 하나만 있는 동그라미(만들기)와, 살아 있는 내 스토리가 있으면 「Your story」(안 본 반응이면
 * 주황 고리). 얼굴은 올린 단어의 첫 글자입니다.
 */
export function MyStoryRowFaces({ slot }: { readonly slot: MineRowSlot }): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.row;
  function handleCreate() {
    "background only";
    playSound("button");
    slot.onCreate();
  }
  const { live } = slot;
  return (
    <view className="my-story-faces">
      <view
        className="story-item"
        data-testid={ids.create}
        accessibility-element={true}
        accessibility-label={copy.createLabel}
        accessibility-traits="button"
        accessibility-enable-tap={true}
        flatten={false}
        bindtap={handleCreate}
      >
        <view className="story-find my-story-create">
          <svg className="story-find-icon" content={plus} current-color={color.fg.brand} />
        </view>
        <text className="story-name" accessibility-elements-hidden={true}>
          {copy.create}
        </text>
      </view>
      {live === null ? null : (
        <StoryFace
          testId={ids.mine}
          ring={slot.unseen ? "unseen" : "seen"}
          name={copy.mine}
          avatarName={live.ko}
          avatarUrl={null}
          caption={live.ko}
          captionTone={slot.unseen ? "brand" : "muted"}
          label={copy.mineLabel(live.reactions.length, slot.unseen)}
          onTap={slot.onOpen}
        />
      )}
    </view>
  );
}
