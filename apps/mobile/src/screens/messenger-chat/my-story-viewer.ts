// 내 스토리 전체 화면 보기의 판정(ADR-0194 개정 ⟨보기⟩) — 보기 장 목록 · 아래 바 자리 · 위로 밀기. 순수 함수만 둡니다.

import type { StoryViewerItem } from "./friend-stories.contract";
import type { MyStory, ReactionFace } from "./my-stories.contract";
import {
  MY_STORY_CHARACTER,
  MY_STORY_REPLY_LINES,
  MY_STORY_SEEN_FACES,
  MY_STORY_SWIPE_UP,
  type MyStoryBarView,
  type MyStoryReplyLine,
} from "./my-story-viewer.contract";

/** 내 스토리 한 장 — 한 줄 카드(단어 · 카드)는 한국어 · 로마자 · 뜻, 글 · 사진은 얹은 것을 그 자리에(`mine`). */
function itemOf(story: MyStory, name: string): StoryViewerItem {
  return {
    story: {
      id: story.id,
      characterId: MY_STORY_CHARACTER,
      postedAt: story.postedAt,
      expiresAt: story.expiresAt,
      imagePath: "",
      line: { ko: story.ko, roman: story.roman, meaning: { en: story.meaning } },
      word: null,
      replies: [],
      freeReply: false,
    },
    name,
    avatarUrl: null,
    imageUrl: null,
    unmet: null,
    mine: story,
  };
}

/** 살아 있는 내 스토리를 오래된 것부터 보기 장으로 — 시작은 연 스토리. 연 스토리가 없거나 이미 지났으면 null. */
export function myViewerItemsOf(
  stories: readonly MyStory[],
  openedId: string,
  now: number,
  name: string,
): { readonly items: readonly StoryViewerItem[]; readonly start: number } | null {
  const live = stories
    .filter((story) => story.expiresAt > now)
    .sort((a, b) => a.postedAt - b.postedAt);
  const start = live.findIndex((story) => story.id === openedId);
  return start < 0 ? null : { items: live.map((story) => itemOf(story, name)), start };
}

/** 아래 바 자리 — Seen by 수(서버 그대로) · 얼굴(방 있는 인물 최대 3), 새 답 줄(최신이 아래 최대 2) 또는 안내. */
export function myStoryBarOf(
  story: MyStory,
  face: (characterId: string) => ReactionFace | null,
  hasFriends: boolean,
): MyStoryBarView {
  const faces = story.seenBy
    .map((seen) => face(seen.characterId))
    .filter((who): who is ReactionFace => who !== null)
    .slice(0, MY_STORY_SEEN_FACES);
  const rows: MyStoryReplyLine[] = [];
  for (const reaction of story.reactions) {
    const who = face(reaction.characterId);
    if (who !== null) rows.push({ reaction, who });
  }
  // 같은 시각이면 받은 순서 그대로(정렬은 안정적).
  const lines = rows
    .slice()
    .sort((a, b) => a.reaction.at - b.reaction.at)
    .slice(-MY_STORY_REPLY_LINES);
  return {
    seen: story.seenBy.length,
    faces,
    replies: rows.length,
    note:
      lines.length > 0
        ? { kind: "lines", lines }
        : hasFriends
          ? { kind: "waiting" }
          : { kind: "noFriends" },
  };
}

/** 손가락이 위로 밀었는가 — 세로가 기준 이상이고 가로보다 깁니다. */
export function isSwipeUp(dx: number, dy: number): boolean {
  return -dy >= MY_STORY_SWIPE_UP && -dy > Math.abs(dx);
}
