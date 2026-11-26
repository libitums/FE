// 스토리 줄 · 보기의 인물 순서입니다(ADR-0178 D3 개정 ⟨2026-11-25⟩). 순수 — 줄의 칸만 봅니다.

import type {
  FriendStory,
  FriendStoryEntry,
  StoryRow,
  UnmetStoryEntry,
} from "./friend-stories.contract";

/** 줄의 스토리 칸 하나 — 내 친구 또는 안 만난 친구. */
export type StoryOrderEntry =
  | { readonly kind: "friend"; readonly entry: FriendStoryEntry }
  | { readonly kind: "unmet"; readonly entry: UnmetStoryEntry };

/** 그 인물의 최신 스토리 올린 시각 내림차순, 같으면 인물 id 오름차순. */
export function byLatestStory(
  a: { readonly story: FriendStory },
  b: { readonly story: FriendStory },
): number {
  if (a.story.postedAt !== b.story.postedAt) return b.story.postedAt - a.story.postedAt;
  const left = a.story.characterId;
  const right = b.story.characterId;
  return left < right ? -1 : left > right ? 1 : 0;
}

/** 스토리가 있는 인물의 줄 순서 — 친구 · 안 만난 친구를 한 줄로. 본 것은 순서에 쓰지 않습니다. */
export function storyOrderOf(row: Pick<StoryRow, "friends" | "unmet">): readonly StoryOrderEntry[] {
  const order: StoryOrderEntry[] = [];
  for (const entry of row.friends) order.push({ kind: "friend", entry });
  for (const entry of row.unmet) order.push({ kind: "unmet", entry });
  return order.sort((a, b) => byLatestStory(a.entry, b.entry));
}
