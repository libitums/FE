// 내 스토리 판정(ADR-0179) — 순수. 「Your story」 고리 · 보관함 · 날짜 · 올리기 요청 · 대화 인용 · 카드 거르기.

import type { ChatStoryQuote } from "./friend-stories.contract";
import type {
  LessonCardGroup,
  MyStoriesState,
  MyStory,
  MyStoryChoice,
  MyStoryDraft,
} from "./my-stories.contract";

/** 스토리 줄의 「Your story」 — 꺼져 있으면 null. 살아 있는(24시간 안) 가장 새 스토리와, 그 반응 중 안 본 것이 있는가. */
export function mineRingOf(
  state: MyStoriesState | null,
  seen: ReadonlySet<string>,
  now: number,
): { readonly live: MyStory | null; readonly unseen: boolean } | null {
  if (state === null || !state.enabled) return null;
  let live: MyStory | null = null;
  for (const story of state.stories)
    if (story.expiresAt > now && (live === null || story.postedAt > live.postedAt)) live = story;
  return { live, unseen: live !== null && unseenReactionIdsOf(live, seen).length > 0 };
}

export function unseenReactionIdsOf(story: MyStory, seen: ReadonlySet<string>): string[] {
  return story.reactions.filter((reaction) => !seen.has(reaction.id)).map((r) => r.id);
}

/** 보관함 줄 — 최신 먼저. 보관을 끄면 살아 있는 것만(서버 정리가 늦어도). */
export function archiveOf(state: MyStoriesState, now: number): MyStory[] {
  return state.stories
    .filter((story) => state.keep || story.expiresAt > now)
    .slice()
    .sort((a, b) => b.postedAt - a.postedAt);
}

export type StoryDay =
  | { readonly kind: "today" }
  | { readonly kind: "date"; readonly month: number; readonly day: number };

/** 올린 날(기기 현지) — 오늘이면 today. */
export function dayOf(at: number, now: number): StoryDay {
  const posted = new Date(at);
  const today = new Date(now);
  if (
    posted.getFullYear() === today.getFullYear() &&
    posted.getMonth() === today.getMonth() &&
    posted.getDate() === today.getDate()
  )
    return { kind: "today" };
  return { kind: "date", month: posted.getMonth() + 1, day: posted.getDate() };
}

export function draftOf(choice: MyStoryChoice, clientId: string, lang: string): MyStoryDraft {
  return {
    clientId,
    kind: choice.kind,
    word: choice.word,
    ko: choice.ko,
    roman: choice.roman,
    meaning: choice.meaning,
    example: choice.example,
    lang,
  };
}

/** 친구 반응에 답할 때 내 말풍선 위 인용 — 그림 없이 단어만. */
export function myQuoteOf(story: MyStory, characterId: string): ChatStoryQuote {
  return {
    storyId: story.id,
    characterId,
    line: story.ko,
    imagePath: null,
    postedAt: story.postedAt,
    kind: "mine",
  };
}

/** 레슨 카드 거르기 — null이면 전체. */
export function visibleCardsOf(
  groups: readonly LessonCardGroup[],
  episodeId: string | null,
): MyStoryChoice[] {
  return groups
    .filter((group) => episodeId === null || group.episodeId === episodeId)
    .flatMap((group) => group.cards);
}
