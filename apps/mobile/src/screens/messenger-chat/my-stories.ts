// 내 스토리 판정(ADR-0194) — 순수. 「Your story」 고리 · 보관함 · 날짜 · 올리기 요청 · 대화 인용 · 카드 거르기.

import type { ChatRoomSummary } from "./chat-source.contract";
import type { ChatStoryQuote } from "./friend-stories.contract";
import type {
  MyStoriesState,
  MyStory,
  MyStoryChoice,
  MyStoryDraft,
  MyStoryWindow,
  WindowSheetView,
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

export function draftOf(
  choice: MyStoryChoice,
  clientId: string,
  lang: string,
  tzOffsetMin: number,
): MyStoryDraft {
  return {
    tzOffsetMin,
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

/** 기기의 UTC 차이(분, 동쪽이 +) — 서버 `p_tz_offset_min`(현지 = UTC + 차이). */
export function tzOffsetMinOf(now: number): number {
  return -new Date(now).getTimezoneOffset() || 0;
}

/** 「+」 자리 — 이번 창을 썼고 다음 창이 아직이면 그 시각, 아니면 null(만들기). */
export function nextOpenOf(window: MyStoryWindow | null, now: number): number | null {
  return window !== null && window.used && window.nextAt > now ? window.nextAt : null;
}

/** 창의 현지 시 — 서버 기본값(`my_story_rules` morningStart 4 · dayStart 12 · nightStart 18). 서버가 경계를 바꾸면 시트의 시각만 어긋납니다. */
const SLOT_HOURS = [
  { slot: "morning", startHour: 4, endHour: 12 },
  { slot: "day", startHour: 12, endHour: 18 },
  { slot: "night", startHour: 18, endHour: 4 },
] as const;

/** 창 시트(시안 18번) — 지금 창이 속한 현지 날(`window.day`)의 세 칸. 지난 칸의 「올렸음」은 스토리 목록(24시간 안은 늘 있음)으로 봅니다. */
export function windowSheetOf(
  window: MyStoryWindow,
  stories: readonly MyStory[],
  now: number,
): WindowSheetView {
  void now;
  const [year, month, day] = window.day.split("-").map(Number) as [number, number, number];
  const at = (hour: number, nextDay: boolean) =>
    new Date(year, month - 1, day + (nextDay ? 1 : 0), hour).getTime();
  const current = SLOT_HOURS.findIndex((each) => each.slot === window.slot);
  const next = new Date(window.nextAt);
  return {
    current: window.slot,
    used: window.used,
    next: { hours: next.getHours(), minutes: next.getMinutes() },
    slots: SLOT_HOURS.map((each, index) => {
      const start = at(each.startHour, false);
      const end = at(each.endHour, each.endHour < each.startHour);
      const posted = stories.some((story) => story.postedAt >= start && story.postedAt < end);
      const state =
        index < current
          ? posted
            ? "shared"
            : "missed"
          : index === current
            ? window.used
              ? "shared"
              : "open"
            : "upcoming";
      return { slot: each.slot, state, startHour: each.startHour, endHour: each.endHour };
    }),
  };
}

/**
 * 답할 친구가 있는가 — 서버 판정(ADR-0191 D3 「내가 보낸 메시지가 있는 대화」)의 앱 근사: 열린 방 중 대화가 있는 방이 하나라도. 0명이면
 * 막 올린 뒤 「Add a friend to get replies」(시안 17번).
 */
export function hasFriendsOf(rooms: readonly ChatRoomSummary[]): boolean {
  return rooms.some((room) => room.access.kind === "open" && room.lastMessage !== null);
}
