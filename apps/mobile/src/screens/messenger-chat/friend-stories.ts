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

/** 인물마다 살아 있는 스토리를 올린 시각 순으로 모읍니다(D4 개정 — 한 인물 여러 장). 정렬은 새로 모은 배열에서(PrimJS). */
function byCharacter(
  stories: readonly FriendStory[],
  now: number,
): Map<string, readonly FriendStory[]> {
  const groups = new Map<string, FriendStory[]>();
  for (const story of liveStoriesOf(stories, now)) {
    const list = groups.get(story.characterId);
    if (list === undefined) groups.set(story.characterId, [story]);
    else list.push(story);
  }
  for (const list of groups.values()) list.sort((a, b) => a.postedAt - b.postedAt);
  return groups;
}

const newestOf = (list: readonly FriendStory[]): FriendStory | undefined => list[list.length - 1];

/** 스토리 줄(ADR-0178 D3) — 친구 · 안 만난 친구(각 `byLatestStory` 순, 한 줄 순서는 `storyOrderOf`, 칸은 그 인물의 가장 새 스토리) · 그 밖의 추천. */
export function storyRowOf(input: StoryRowInput): StoryRow {
  const groups = byCharacter(input.stories, input.now);
  const friends: FriendStoryEntry[] = [];
  for (const room of input.rooms) {
    if (room.access.kind !== "open") continue;
    const stories = groups.get(room.counterpart.id) ?? [];
    const story = newestOf(stories);
    // 본 것 = 그 인물의 스토리를 다 봤을 때(고리가 회색이 되는 때).
    if (story !== undefined)
      friends.push({
        story,
        stories,
        room,
        seen: stories.every((each) => input.seen.has(each.id)),
      });
  }
  friends.sort(byLatestStory);
  const unmet: UnmetStoryEntry[] = [];
  const others: SuggestedFriend[] = [];
  for (const friend of input.suggested) {
    const stories = groups.get(friend.character.id) ?? [];
    const story = newestOf(stories);
    if (story === undefined) others.push(friend);
    else unmet.push({ story, stories, friend });
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

/** 보기에서 지금 장이 속한 인물 묶음 — 같은 인물이 이어진 칸들(위 진행 막대는 이 묶음만, D4 개정). */
export type ViewerGroup = { readonly start: number; readonly count: number; readonly at: number };

const characterAt = (items: readonly StoryViewerItem[], index: number) =>
  items[index]?.story.characterId;

export function viewerGroupOf(items: readonly StoryViewerItem[], index: number): ViewerGroup {
  const who = characterAt(items, index);
  let start = index;
  while (start > 0 && characterAt(items, start - 1) === who) start -= 1;
  let end = index + 1;
  while (end < items.length && characterAt(items, end) === who) end += 1;
  return { start, count: end - start, at: index - start };
}

/** 가로 넘김 — 다음 인물의 첫 장(마지막 인물이면 닫힘) · 이전 인물의 첫 장(첫 인물이면 그 인물의 처음). */
export function viewerJump(
  items: readonly StoryViewerItem[],
  index: number,
  direction: "next" | "prev",
): number | "close" {
  const group = viewerGroupOf(items, index);
  if (direction === "next") {
    const next = group.start + group.count;
    return next >= items.length ? "close" : next;
  }
  return group.start === 0 ? 0 : viewerGroupOf(items, group.start - 1).start;
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

const itemsOf = (
  stories: readonly FriendStory[],
  room: ChatRoomSummary,
  unmet: SuggestedFriend | null,
  imageUrl: (path: string) => string | null,
): StoryViewerItem[] =>
  stories.map((story) => ({
    story,
    name: room.counterpart.name,
    avatarUrl: room.counterpart.avatarUrl,
    imageUrl: imageUrl(story.imagePath),
    unmet,
  }));

/** 그 묶음의 안 본 첫 장(다 봤으면 묶음의 처음). */
function firstUnseen(items: readonly StoryViewerItem[], from: number, seen: ReadonlySet<string>) {
  const { start, count } = viewerGroupOf(items, from);
  for (let at = start; at < start + count; at += 1)
    if (!seen.has(items[at]?.story.id ?? "")) return at;
  return start;
}

/**
 * 보기의 장 목록과 시작 칸 — 인물 묶음(올린 시각 순)을 줄 순서(`storyOrderOf`)로 이어 붙입니다(D4 개정). 줄의 친구는 친구 묶음 전체 중 그 인물부터,
 * 이어 보기는 첫 인물부터, 안 만난 친구 · 알림은 그 인물 묶음 하나. 시작은 그 인물의 안 본 첫 장. 그 인물(또는 친구 스토리)이 없으면 null.
 */
export function viewerItemsOf(
  row: StoryRow,
  open: ViewerOpen,
  imageUrl: (path: string) => string | null,
  seen: ReadonlySet<string> = new Set(),
): { readonly items: readonly StoryViewerItem[]; readonly start: number } | null {
  const friends: StoryViewerItem[] = [];
  for (const each of storyOrderOf(row)) {
    if (each.kind === "friend")
      friends.push(...itemsOf(each.entry.stories, each.entry.room, null, imageUrl));
  }
  const one = (items: readonly StoryViewerItem[]) =>
    items.length === 0 ? null : { items, start: firstUnseen(items, 0, seen) };
  if (open.from === "watch_all") return one(friends);
  if (open.from === "friend") {
    const at = friends.findIndex((item) => item.story.characterId === open.characterId);
    return at < 0 ? null : { items: friends, start: firstUnseen(friends, at, seen) };
  }
  const friend = row.friends.find((entry) => entry.story.characterId === open.characterId);
  if (friend !== undefined && open.from !== "unmet")
    return one(itemsOf(friend.stories, friend.room, null, imageUrl));
  const unmet = row.unmet.find((entry) => entry.story.characterId === open.characterId);
  return unmet === undefined
    ? null
    : one(itemsOf(unmet.stories, unmet.friend.room, unmet.friend, imageUrl));
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
