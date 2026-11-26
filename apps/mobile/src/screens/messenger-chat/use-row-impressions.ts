// 채팅 목록 맨 위 줄의 노출 이벤트(감사 A5) — 실제로 그린 줄만 셉니다. 판정은 목록 화면 한 곳(이 훅)이 합니다.
// 스토리 줄이 그려지면 `friend_story_row_viewed`, 추천 줄이 그려지면 `suggested_friend_viewed` — 각 목록 마운트당 한 번.
// 첫 입장 안내로 줄이 숨은 동안은 아무것도 내지 않습니다. 스토리가 늦게 읽혀 추천 줄이 먼저 그려졌다면 둘 다 한 번씩입니다.

import { useEffect, useRef } from "@lynx-js/react";

import { useChatEvents } from "./chat-events";

export type StoryRowStats = {
  readonly count: number;
  readonly unseen: number;
  readonly mine: boolean;
};

export function useRowImpressions({
  rowShown,
  story,
  suggestedCount,
  pending = false,
}: {
  /** 맨 위 줄 자리가 보이는가(첫 입장 안내 중이면 false). */
  readonly rowShown: boolean;
  /** 스토리 줄이 그려지면 그 수, 아니면 null. */
  readonly story: StoryRowStats | null;
  /** 추천 줄의 칸 수(0이면 줄 없음). */
  readonly suggestedCount: number;
  /** 스토리 첫 읽기 중 — 추천 줄이 곧 스토리 줄로 바뀔 수 있어 세지 않습니다. */
  readonly pending?: boolean;
}): void {
  const { emit } = useChatEvents();
  const storySent = useRef(false);
  const suggestedSent = useRef(false);
  const storyDrawn = rowShown && story !== null;
  const suggestedDrawn = rowShown && !pending && story === null && suggestedCount > 0;
  useEffect(() => {
    if (!storyDrawn || story === null || storySent.current) return;
    storySent.current = true;
    emit({
      name: "friend_story_row_viewed",
      surface: "chat",
      count: String(story.count),
      unseen: String(story.unseen),
      mine: story.mine,
    });
  }, [storyDrawn]);
  useEffect(() => {
    if (!suggestedDrawn || suggestedSent.current) return;
    suggestedSent.current = true;
    emit({ name: "suggested_friend_viewed", surface: "chat", count: String(suggestedCount) });
  }, [suggestedDrawn]);
}
