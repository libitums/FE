// 테스트 지원 — 단어장 화면 줄 대역입니다. 제품 코드는 import하지 않습니다.

import type { WordbookEntry } from "../../app/wordbook-entries";
import type { WordStatus } from "../../lib/wordbook";

export function wordbookEntry(
  ko: string,
  roman: string,
  meaning: string,
  status: WordStatus,
  extra: Partial<WordbookEntry> = {},
): WordbookEntry {
  return {
    key: `u01-water|voca:${roman}`,
    record: {
      episodeId: "u01-water",
      ref: `voca:${roman}`,
      firstSeen: "2026-11-18",
      correct: 3,
      incorrect: 2,
      box: 1,
      due: "2026-11-21",
      last: "correct",
    },
    ko,
    roman,
    meaning,
    episodeOrder: 1,
    episodeTitle: "At the guesthouse",
    status,
    example: null,
    audioId: `u01-water/${roman}`,
    ...extra,
  };
}

export const sampleEntries: readonly WordbookEntry[] = [
  wordbookEntry("감사합니다", "gamsahamnida", "thank you", "new"),
  wordbookEntry("물", "mul", "water", "new"),
  wordbookEntry("주세요", "juseyo", "please give", "review", {
    example: { ko: "물 좀 주세요.", roman: "mul jom juseyo", meaning: "Some water, please." },
  }),
  wordbookEntry("안녕하세요", "annyeonghaseyo", "hello", "known"),
];
