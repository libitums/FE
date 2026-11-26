import type { ReactNode } from "@lynx-js/react";
import trash from "@libitums/icons/lynx/trash";
import { color } from "@libitums/design-tokens";

import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { myStoriesTestIds as ids, type MyStory } from "./my-stories.contract";

import "./my-stories.css";
import "./my-stories-archive.css";

/** 보관함 칸 하나(ADR-0194, 시안 10번) — 단어 카드 · 날짜 · 반응 수 · LIVE, 오른쪽 위 지우기. 낭독은 칸 본문 · 지우기 둘. */
export function ArchiveTile({
  story,
  date,
  today,
  live,
  onOpen,
  onDelete,
}: {
  readonly story: MyStory;
  readonly date: string;
  /** 오늘 올린 칸 — 지우기 낭독을 「오늘의 스토리」로(감사 M4). */
  readonly today: boolean;
  readonly live: boolean;
  readonly onOpen: () => void;
  readonly onDelete: () => void;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.archive;
  const count = story.reactions.length;
  return (
    <view className="my-archive-tile">
      <view
        className="my-archive-tile-main"
        data-testid={ids.tile(story.id)}
        accessibility-element={true}
        accessibility-label={copy.tileLabel(story.ko, story.meaning, date, count, live)}
        accessibility-traits="button"
        accessibility-enable-tap={true}
        flatten={false}
        bindtap={() => {
          "background only";
          playSound("button");
          onOpen();
        }}
      >
        {live ? <text className="my-archive-live">{copy.live}</text> : null}
        <text className="my-archive-ko">{story.ko}</text>
        <text className="my-archive-meaning">{story.meaning}</text>
        <text className="my-archive-meta">{copy.tileMeta(date, count)}</text>
      </view>
      <view
        className="my-archive-delete"
        data-testid={ids.tileDelete(story.id)}
        accessibility-element={true}
        accessibility-label={today ? copy.deleteToday : copy.deleteOne(date)}
        accessibility-traits="button"
        accessibility-enable-tap={true}
        flatten={false}
        bindtap={() => {
          "background only";
          onDelete();
        }}
      >
        <svg className="my-story-icon" content={trash} current-color={color.fg.neutral} />
      </view>
    </view>
  );
}
