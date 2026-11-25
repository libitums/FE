// 스토리 보기(ADR-0178 D4)의 부품 — 넘김 타이머 · 진행 막대 · 아이콘 단추 · 단어 알약 · 답장 칩/칸 · 안 만난 친구 카드.

import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import plus from "@libitums/icons/lynx/plus";
import { Avatar } from "@libitums/ui-lynx/avatar";
import { Button } from "@libitums/ui-lynx/button";

import { playSound } from "../../lib/sound-effects";
import {
  friendStoriesTestIds as ids,
  type FriendStoriesCopy,
  type StoryViewerItem,
  type StoryWordPort,
} from "./friend-stories.contract";
import { localizedLine, type SuggestedFriend } from "./suggested-friends";

import "./story-progress.css";

/** 한 장을 보이는 시간 — 진행 막대 CSS(`story-viewer.css`)의 6000ms와 같은 값입니다(ADR-0178 D4). */
export const STORY_SHOW_MS = 6_000;

const SLOP = { top: "8px", bottom: "8px", left: "8px", right: "8px" } as const;

/** 저절로 넘김 타이머 — 멈추면 남은 시간을 기억했다가 이어 갑니다. 장이 바뀌면 처음부터. */
export function useAdvanceTimer(index: number, running: boolean, onDone: () => void): void {
  const left = useRef(STORY_SHOW_MS);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const shownIndex = useRef(index);
  if (shownIndex.current !== index) {
    shownIndex.current = index;
    left.current = STORY_SHOW_MS;
  }
  useEffect(() => {
    if (!running) return undefined;
    const started = Date.now();
    const handle = setTimeout(() => doneRef.current(), left.current);
    return () => {
      clearTimeout(handle);
      // 같은 장에서 멈춘 때만 남은 시간을 줄입니다 — 장이 바뀌었으면 렌더가 이미 6초로 되돌렸습니다.
      if (shownIndex.current === index)
        left.current = Math.max(0, left.current - (Date.now() - started));
    };
  }, [index, running]);
}

/** 진행 막대 — 지난 칸은 꽉, 지금 칸은 6초 동안 차고(멈추면 그 자리), 모션 줄이기면 꽉 찬 채 움직이지 않습니다. */
export function StoryProgress({
  items,
  index,
  still,
  stopped,
  label,
}: {
  readonly items: readonly StoryViewerItem[];
  readonly index: number;
  readonly still: boolean;
  readonly stopped: boolean;
  readonly label: string;
}): ReactNode {
  const running = stopped
    ? "story-progress-fill story-progress-run story-progress-paused"
    : "story-progress-fill story-progress-run";
  return (
    <view
      className="story-progress"
      data-testid={ids.progress}
      accessibility-element={true}
      accessibility-label={label}
    >
      {items.map((each, at) => (
        <view
          key={each.story.id}
          className="story-progress-track"
          data-testid={ids.segment(at)}
          accessibility-elements-hidden={true}
        >
          {at < index ? <view className="story-progress-fill" /> : null}
          {at === index ? (
            <view
              key={`${each.story.id}:${index}`}
              className={still ? "story-progress-fill story-progress-half" : running}
            />
          ) : null}
        </view>
      ))}
    </view>
  );
}

export function IconButton({
  testId,
  icon,
  label,
  onTap,
}: {
  readonly testId: string;
  readonly icon: string;
  readonly label: string;
  readonly onTap: () => void;
}): ReactNode {
  return (
    <view
      className="story-icon-button"
      data-testid={testId}
      accessibility-element={true}
      accessibility-label={label}
      accessibility-traits="button"
      accessibility-enable-tap={true}
      flatten={false}
      bindtap={() => {
        "background only";
        onTap();
      }}
    >
      <svg className="story-icon" content={icon} current-color={color.white} />
    </view>
  );
}

/** 「<단어> · <뜻> — Save word」 — 카탈로그에 그 단어가 있을 때만 섭니다. 넣으면 「saved」. */
export function WordPill({
  item,
  words,
  copy,
  onSaved,
}: {
  readonly item: StoryViewerItem;
  readonly words: StoryWordPort | undefined;
  readonly copy: FriendStoriesCopy;
  readonly onSaved: () => void;
}): ReactNode {
  const word = item.story.word;
  const info = word === null || words === undefined ? null : words.lookup(word);
  const [saved, setSaved] = useState(() =>
    word === null || words === undefined ? false : words.saved(word),
  );
  if (word === null || words === undefined || info === null) return null;
  const text = saved ? copy.viewer.saved(info.ko) : copy.viewer.saveWord(info.ko, info.meaning);
  function handleTap() {
    "background only";
    if (saved || word === null || words === undefined) return;
    playSound("button");
    words.save(word);
    setSaved(true);
    onSaved();
  }
  return (
    <view
      className={saved ? "story-word story-word-saved" : "story-word"}
      data-testid={ids.word}
      hit-slop={SLOP}
      accessibility-element={true}
      accessibility-label={saved ? text : copy.viewer.saveWordLabel(info.ko, info.meaning)}
      accessibility-traits={saved ? undefined : "button"}
      accessibility-enable-tap={!saved}
      flatten={false}
      bindtap={saved ? undefined : handleTap}
    >
      {saved ? null : (
        <svg className="story-word-icon" content={plus} current-color={color.white} />
      )}
      <text className="story-word-text">{text}</text>
    </view>
  );
}

/** 내 친구 스토리의 아래 — 무료 안내(첫 답장, 보내기 전만) · 답장 칩(누르면 그 자리에서 보냄, D5 개정). 답장 칸은 `StoryReplyInput`. */
export function StoryReplyBar({
  item,
  copy,
  free,
  onChip,
}: {
  readonly item: StoryViewerItem;
  readonly copy: FriendStoriesCopy;
  readonly free: boolean;
  readonly onChip: (text: string) => void;
}): ReactNode {
  const { story } = item;
  return (
    <>
      {free ? (
        <view className="story-free">
          <text className="story-free-text" data-testid={ids.free}>
            {copy.viewer.freeReply}
          </text>
        </view>
      ) : null}
      {story.replies.length === 0 ? null : (
        <scroll-view
          className="story-chips-scroll"
          scroll-orientation="horizontal"
          scroll-bar-enable={false}
        >
          <view className="story-chips">
            {story.replies.map((text, at) => (
              <view
                key={`${at}:${text}`}
                className="story-chip"
                data-testid={ids.chip(at)}
                accessibility-element={true}
                accessibility-label={copy.viewer.replyChipLabel(text)}
                accessibility-traits="button"
                accessibility-enable-tap={true}
                flatten={false}
                bindtap={() => {
                  "background only";
                  onChip(text);
                }}
              >
                <text className="story-chip-text">{text}</text>
              </view>
            ))}
          </view>
        </scroll-view>
      )}
    </>
  );
}

/** 안 만난 친구의 아래 — 소개 카드 · 「Add friend and reply」(추가 가능) / 「See how to meet」(잠김). */
export function StoryMeet({
  item,
  friend,
  copy,
  onMeet,
}: {
  readonly item: StoryViewerItem;
  readonly friend: SuggestedFriend;
  readonly copy: FriendStoriesCopy;
  readonly onMeet: () => void;
}): ReactNode {
  return (
    <>
      <view className="story-meet-card" data-testid={ids.meetCard}>
        <Avatar
          imageSource={item.avatarUrl ?? undefined}
          name={item.name}
          size="md"
          accessibility="hidden"
        />
        <view className="story-meet-body">
          <text className="story-meet-name">{item.name}</text>
          {friend.character.intro === null ? null : (
            <text className="story-meet-intro">
              {localizedLine(friend.character.intro, copy.language)}
            </text>
          )}
        </view>
      </view>
      <view data-testid={ids.meet}>
        <Button
          label={friend.status === "addable" ? copy.viewer.addAndReply : copy.viewer.seeHowToMeet}
          variant="brand"
          size="xl"
          width="fill"
          bindtap={() => {
            "background only";
            onMeet();
          }}
        />
      </view>
    </>
  );
}
