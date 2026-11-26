// 대화방 스토리 인용 판의 판정(ADR-0178 D5 개정 ⟨판⟩ · ADR-0194 개정 ⟨판⟩) — 순수 · 던지지 않음.

import type { ChatRoomSummary } from "./chat-source.contract";
import type {
  ChatStoryLookup,
  ChatStoryTarget,
  ChatStoryThumbView,
} from "./chat-story-thumb.contract";
import type { ChatStoryQuote, FriendStory, StoryViewerItem } from "./friend-stories.contract";
import type { MyStory } from "./my-stories.contract";

/** 친구에게 스토리가 보이는 시간(ADR-0178) — 인용에는 만료가 없어 올린 시각 + 24시간으로 봅니다. */
const STORY_LIFETIME_MS = 86_400_000;

/** 목록에 없는 내 스토리 — 바탕색(주황) 위 한 줄만(같은 글 스토리 카드로 그립니다). */
function lineStoryOf(quote: ChatStoryQuote): MyStory {
  const postedAt = quote.postedAt ?? 0;
  return {
    id: quote.storyId,
    kind: "text",
    status: "live",
    imagePath: null,
    word: null,
    ko: quote.line,
    roman: "",
    meaning: "",
    example: null,
    postedAt,
    expiresAt: postedAt + STORY_LIFETIME_MS,
    reactions: [],
    seenBy: [],
    background: "orange",
    overlays: [],
  };
}

const isDeleted = (quote: ChatStoryQuote, lookup: ChatStoryLookup): boolean =>
  quote.kind === "deleted" || lookup.deleted.has(quote.storyId);

/** 친구 스토리가 지났는가 — 받은 목록에 있으면 그 만료, 목록을 받았는데 없으면 지남, 못 받았으면 올린 시각 + 24시간(모르면 안 지남). */
function friendEnded(quote: ChatStoryQuote, lookup: ChatStoryLookup, now: number): boolean {
  const found = lookup.friends?.find((story) => story.id === quote.storyId);
  if (found !== undefined) return found.expiresAt <= now;
  if (lookup.friends !== null) return true;
  return quote.postedAt !== null && quote.postedAt + STORY_LIFETIME_MS <= now;
}

/** 판의 모양 — 지운 것 · 내 스토리(목록에 있으면 그대로) · 친구 스토리(그림 · 지남). */
export function chatStoryThumbOf(
  quote: ChatStoryQuote,
  lookup: ChatStoryLookup,
  now: number,
): ChatStoryThumbView {
  if (isDeleted(quote, lookup)) return { kind: "deleted" };
  if (quote.kind === "mine") {
    const story = lookup.mine?.find((each) => each.id === quote.storyId);
    return story === undefined
      ? { kind: "mine", story: lineStoryOf(quote), openable: false }
      : { kind: "mine", story, openable: true };
  }
  return { kind: "friend", imagePath: quote.imagePath, ended: friendEnded(quote, lookup, now) };
}

/** 판을 눌렀을 때 열 것 — 내 스토리는 목록에 있을 때만(지난 것도 보관함), 친구 스토리는 살아 있으면 보기 · 지났으면 안내 시트. */
export function chatStoryTargetOf(
  quote: ChatStoryQuote,
  lookup: ChatStoryLookup,
  now: number,
): ChatStoryTarget | null {
  const view = chatStoryThumbOf(quote, lookup, now);
  if (view.kind === "deleted") return null;
  if (view.kind === "mine") return view.openable ? { kind: "mine", story: view.story } : null;
  if (view.ended) return { kind: "ended" };
  return lookup.friends === null
    ? null
    : { kind: "friend", characterId: quote.characterId, storyId: quote.storyId };
}

/** 친구 스토리 보기의 장 — 그 인물의 살아 있는 스토리(올린 순), 시작은 그 스토리. 그 스토리 · 방이 없으면 null. */
export function chatFriendItemsOf(
  stories: readonly FriendStory[],
  target: { readonly characterId: string; readonly storyId: string },
  room: ChatRoomSummary | null,
  imageUrl: (path: string) => string | null,
  now: number,
): { readonly items: readonly StoryViewerItem[]; readonly start: number } | null {
  if (room === null) return null;
  const live = stories
    .filter((story) => story.characterId === target.characterId && story.expiresAt > now)
    .sort((a, b) => a.postedAt - b.postedAt);
  const start = live.findIndex((story) => story.id === target.storyId);
  if (start < 0) return null;
  const items = live.map((story) => ({
    story,
    name: room.counterpart.name,
    avatarUrl: room.counterpart.avatarUrl,
    imageUrl: imageUrl(story.imagePath),
    unmet: null,
  }));
  return { items, start };
}
