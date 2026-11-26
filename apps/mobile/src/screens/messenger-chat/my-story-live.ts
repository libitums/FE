// 내 스토리 보기를 연 동안 Seen by · 답을 다시 읽는 판정(ADR-0194 개정 ⟨살아 있는 보기⟩). 순수 함수만 둡니다.

import type { ChatRoomSummary } from "./chat-source.contract";
import type { StoryViewerItem } from "./friend-stories.contract";
import type { MyStoriesState, MyStory } from "./my-stories.contract";

/** 다시 읽는 간격 — 서버는 「볼」 시각을 1 ~ 30분(답할 인물은 답 30 ~ 120초 전)에 흩어 적습니다. */
export const MY_STORY_LIVE_MS = 30_000;

/** 어느 방에 새 말이 왔는가(안 읽음이 오름) — 답장 토스트 · 앞 푸시가 서는 것과 같은 오름. */
export function replyArrived(
  prev: readonly ChatRoomSummary[],
  next: readonly ChatRoomSummary[],
): boolean {
  return next.some((room) => {
    const old = prev.find((each) => each.roomId === room.roomId);
    return old !== undefined && room.access.kind === "open" && room.unread > old.unread;
  });
}

/**
 * 다시 읽은 목록의 Seen by · 반응만 들고 있는 목록 상태에 얹습니다 — 순서 · 다른 칸 · 새 스토리는 그대로. 둘 다 늘기만 하므로 수로 견주고, 바뀐 게
 * 없으면 같은 객체(다시 그리지 않음).
 */
export function stateWithLive(
  before: MyStoriesState | null,
  loaded: readonly MyStory[],
): MyStoriesState | null {
  let changed = false;
  const stories = (before?.stories ?? []).map((story) => {
    const fresh = loaded.find((each) => each.id === story.id);
    if (
      fresh === undefined ||
      (fresh.seenBy.length === story.seenBy.length &&
        fresh.reactions.length === story.reactions.length)
    )
      return story;
    changed = true;
    return { ...story, seenBy: fresh.seenBy, reactions: fresh.reactions };
  });
  return before !== null && changed ? { ...before, stories } : before;
}

/** 보기 장(열 때 한 번 정한 순서)의 내 스토리를 지금 목록의 같은 id로. */
export function withLatestMine(
  items: readonly StoryViewerItem[],
  stories: readonly MyStory[],
): readonly StoryViewerItem[] {
  return items.map((item) => {
    const mine = stories.find((story) => story.id === item.mine?.id);
    return mine === undefined ? item : { ...item, mine };
  });
}

/** 겹치는 읽기를 하나로 — 읽는 중에 다시 부르면 같은 약속을 돌려줍니다. */
export function sharedRead<T>(read: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () => {
    if (pending !== null) return pending;
    const done = () => {
      pending = null;
    };
    const started = read();
    started.then(done, done);
    pending = started;
    return started;
  };
}
