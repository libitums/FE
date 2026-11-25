// 친구 스토리의 판정입니다(ADR-0178). 순수 — 스토리 · 대화 스냅숏의 방 · 추천 친구 · 본 것 · 시각만 봅니다.

import type { ChatMessage, ChatRoomSummary } from "./chat-source.contract";
import type {
  ChatStoryQuote,
  FriendStory,
  FriendStoryEntry,
  StoryAge,
  StoryRow,
  StoryViewerItem,
  UnmetStoryEntry,
} from "./friend-stories.contract";
import { joinSpoken } from "../../lib/ui-copy-chat-parts";
import { byLatestStory, storyOrderOf } from "./story-order";
import type { SuggestedFriend } from "./suggested-friends";

export type StoryRowInput = {
  readonly stories: readonly FriendStory[];
  readonly rooms: readonly ChatRoomSummary[];
  /** 추천 친구(ADR-0162) — 안 만난 친구는 이 목록에 있는 인물만 줄에 섭니다. */
  readonly suggested: readonly SuggestedFriend[];
  readonly seen: ReadonlySet<string>;
  readonly now: number;
};

/** 본 것 표시 — 스토리 id → 만료 시각(ms). */
export type SeenRecords = Readonly<Record<string, number>>;

export type ViewerState = { readonly index: number; readonly count: number };
export type ViewerAction = "next" | "prev" | "tick";

/** 보기를 어디서 열었나 — 이벤트 `from`과 장 목록을 정합니다. */
export type ViewerOpen =
  | { readonly from: "friend"; readonly characterId: string }
  | { readonly from: "unmet"; readonly characterId: string }
  | { readonly from: "watch_all" }
  | { readonly from: "list"; readonly characterId: string }
  | { readonly from: "push"; readonly characterId: string };

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

/** 만료 전(`expiresAt > now`)만. */
export function liveStoriesOf(
  stories: readonly FriendStory[],
  now: number,
): readonly FriendStory[] {
  return stories.filter((story) => story.expiresAt > now);
}

/** 인물마다 가장 새 살아 있는 스토리 하나. */
function latestByCharacter(stories: readonly FriendStory[], now: number): Map<string, FriendStory> {
  const latest = new Map<string, FriendStory>();
  for (const story of liveStoriesOf(stories, now)) {
    const kept = latest.get(story.characterId);
    if (kept === undefined || story.postedAt > kept.postedAt) latest.set(story.characterId, story);
  }
  return latest;
}

/** 스토리 줄(ADR-0178 D3) — 친구 · 안 만난 친구(각 `byLatestStory` 순, 한 줄 순서는 `storyOrderOf`) · 그 밖의 추천. */
export function storyRowOf(input: StoryRowInput): StoryRow {
  const latest = latestByCharacter(input.stories, input.now);
  const friends: FriendStoryEntry[] = [];
  for (const room of input.rooms) {
    if (room.access.kind !== "open") continue;
    const story = latest.get(room.counterpart.id);
    if (story !== undefined) friends.push({ story, room, seen: input.seen.has(story.id) });
  }
  friends.sort(byLatestStory);
  const unmet: UnmetStoryEntry[] = [];
  const others: SuggestedFriend[] = [];
  for (const friend of input.suggested) {
    const story = latest.get(friend.character.id);
    if (story === undefined) others.push(friend);
    else unmet.push({ story, friend });
  }
  unmet.sort(byLatestStory);
  return { friends, unmet, others };
}

/** 1분 미만 now, 1시간 미만 분, 그 밖 시간(내림). 미래 시각(시계 차이)은 now. */
export function storyAgeOf(postedAt: number, now: number): StoryAge {
  const ago = now - postedAt;
  if (ago < MINUTE_MS) return { unit: "now" };
  if (ago < HOUR_MS) return { unit: "m", value: Math.floor(ago / MINUTE_MS) };
  return { unit: "h", value: Math.floor(ago / HOUR_MS) };
}

/** 채팅 목록 줄의 「New story」 — 그 인물의 안 본 친구 스토리, 없으면 null. */
export function listStoryOf(row: StoryRow, characterId: string): FriendStory | null {
  const entry = row.friends.find((each) => each.story.characterId === characterId);
  return entry === undefined || entry.seen ? null : entry.story;
}

/** 다음 · 저절로 넘김은 한 칸(마지막이면 닫힘), 이전은 한 칸(처음이면 그대로). */
export function viewerStep(state: ViewerState, action: ViewerAction): ViewerState | "close" {
  if (action === "prev") return { ...state, index: Math.max(0, state.index - 1) };
  return state.index + 1 >= state.count ? "close" : { ...state, index: state.index + 1 };
}

/** 새 표시를 더하고(같은 id는 덮어씀) 만료가 지난 표시는 지웁니다. */
export function seenRecordsWith(
  records: SeenRecords,
  id: string,
  expiresAt: number,
  now: number,
): SeenRecords {
  const next: Record<string, number> = {};
  for (const [key, value] of Object.entries(records)) if (value > now) next[key] = value;
  next[id] = expiresAt;
  return next;
}

const friendItem = (
  entry: FriendStoryEntry,
  imageUrl: (path: string) => string | null,
): StoryViewerItem => ({
  story: entry.story,
  name: entry.room.counterpart.name,
  avatarUrl: entry.room.counterpart.avatarUrl,
  imageUrl: imageUrl(entry.story.imagePath),
  unmet: null,
});

const unmetItem = (
  entry: UnmetStoryEntry,
  imageUrl: (path: string) => string | null,
): StoryViewerItem => ({
  story: entry.story,
  name: entry.friend.room.counterpart.name,
  avatarUrl: entry.friend.room.counterpart.avatarUrl,
  imageUrl: imageUrl(entry.story.imagePath),
  unmet: entry.friend,
});

/**
 * 보기의 장 목록과 시작 칸 — 줄의 친구는 친구 스토리 전체(줄 순서 `storyOrderOf`) 중 그 칸부터, 이어 보기는 처음부터, 안 만난 친구 · 목록 줄 · 알림은 그 인물 한 장.
 * 그 인물(또는 친구 스토리)이 없으면 null.
 */
export function viewerItemsOf(
  row: StoryRow,
  open: ViewerOpen,
  imageUrl: (path: string) => string | null,
): { readonly items: readonly StoryViewerItem[]; readonly start: number } | null {
  const friends: StoryViewerItem[] = [];
  for (const each of storyOrderOf(row)) {
    if (each.kind === "friend") friends.push(friendItem(each.entry, imageUrl));
  }
  if (open.from === "watch_all") return friends.length === 0 ? null : { items: friends, start: 0 };
  if (open.from === "friend") {
    const start = friends.findIndex((item) => item.story.characterId === open.characterId);
    return start < 0 ? null : { items: friends, start };
  }
  const friend = friends.find((item) => item.story.characterId === open.characterId);
  if (friend !== undefined && open.from !== "unmet") return { items: [friend], start: 0 };
  const unmet = row.unmet.find((entry) => entry.story.characterId === open.characterId);
  return unmet === undefined ? null : { items: [unmetItem(unmet, imageUrl)], start: 0 };
}

/** 그 내 글이 답장한 스토리 id(ADR-0178 D5) — 서버 턴 요청의 `storyId`. 인용이 없으면 undefined. */
export function storyIdIn(messages: readonly ChatMessage[], id: string): string | undefined {
  const message = messages.find((each) => each.id === id);
  return message?.kind === "text" ? message.story?.storyId : undefined;
}

/** 내가 보낸 글 한 줄 — 스토리 답장이면 인용을 싣습니다(ADR-0178 D5). 가짜 · 서버 출처가 함께 씁니다. */
export function myTextLine(
  id: string,
  at: number,
  text: string,
  story?: ChatStoryQuote,
): ChatMessage {
  return {
    id,
    at,
    kind: "text",
    from: "me",
    text: { ko: text, en: "" },
    ...(story === undefined ? {} : { story }),
  };
}

/** 낭독 조각을 그 언어의 구분자로 잇습니다(빈 조각은 건너뜀) — 구분자는 문구표가 줍니다(감사 다국어 minor 9). */
export function spokenOf(separator: string, parts: readonly string[]): string {
  return joinSpoken(parts, separator);
}

/** 목록이 보이는 동안 스토리를 다시 읽는 주기(ADR-0178 「다시 읽기」) — 5분. */
export const STORY_RELOAD_MS = 5 * MINUTE_MS;

/** 다시 읽은 뒤의 목록 — 못 읽음(null)이면 있던 목록을 지킵니다(첫 읽기 실패는 null 그대로, ADR-0178 「다시 읽기」). */
export function storiesAfterLoad(
  previous: readonly FriendStory[] | null,
  loaded: readonly FriendStory[] | null,
): readonly FriendStory[] | null {
  return loaded ?? previous;
}
