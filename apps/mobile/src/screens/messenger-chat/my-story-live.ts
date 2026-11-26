// 내 스토리 보기를 연 동안 Seen by · 답을 다시 읽는 판정(ADR-0194 개정 ⟨살아 있는 보기⟩). 순수 함수만 둡니다.

import type { MyStoriesState, MyStory } from "./my-stories.contract";

/** 다시 읽는 간격 — 서버는 「볼」 시각을 1 ~ 30분(답할 인물은 답 30 ~ 120초 전)에 흩어 적습니다. */
export const MY_STORY_LIVE_MS = 30_000;

/** 다시 읽은 목록의 Seen by · 반응만 들고 있는 목록 상태에 얹습니다 — 순서 · 다른 칸 · 새 스토리는 그대로, 상태가 없으면 null. */
export function stateWithLive(
  before: MyStoriesState | null,
  loaded: readonly MyStory[],
): MyStoriesState | null {
  return (
    before && {
      ...before,
      stories: before.stories.map((story) => {
        const fresh = loaded.find((each) => each.id === story.id);
        return fresh ? { ...story, seenBy: fresh.seenBy, reactions: fresh.reactions } : story;
      }),
    }
  );
}
