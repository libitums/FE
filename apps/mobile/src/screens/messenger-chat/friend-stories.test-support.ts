// 테스트 지원 — 친구 스토리 unit · ui · integration이 함께 쓰는 스토리 만들기입니다. 제품 코드는 import하지 않습니다.

import type { FriendStory } from "./friend-stories.contract";

export const STORY_NOW = 1_800_000_000_000;
export const HOUR_MS = 3_600_000;

export function story(characterId: string, patch: Partial<FriendStory> = {}): FriendStory {
  return {
    id: `s-${characterId}`,
    characterId,
    postedAt: STORY_NOW - 2 * HOUR_MS,
    expiresAt: STORY_NOW + 22 * HOUR_MS,
    imagePath: `content/images/${characterId}.webp`,
    line: {
      ko: "야근 끝! 편의점 라면이 최고야",
      roman: "yageun kkeut! pyeonuijeom ramyeoni choegoya",
      meaning: {
        en: "Done with overtime! Convenience-store ramen is the best.",
        ja: "残業終わり！",
      },
    },
    word: { episodeId: "u01-water", ref: "voca:e70ba1ce" },
    replies: ["맛있겠다!", "수고했어!", "나도 배고파"],
    freeReply: true,
    ...patch,
  };
}
