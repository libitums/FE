import { expect, test } from "vitest";

import { parseSeenScores, seenScoreIn, withSeenScore } from "./ranking-seen-score";

// `unit` 계층(RK-U20 ~ U22): 순위 화면이 지난번에 본 내 점수(숫자 오름의 출발 값, ADR-0170 D12) — 기기 사본의 읽기 · 고치기.

const WEEK = "2026-11-23T00:00:00Z";

test("RK-U20. 저장한 값을 읽는다 — 깨진 값 · 모양이 다른 값은 없음으로 본다", () => {
  expect(parseSeenScores(null)).toBeNull();
  expect(parseSeenScores("not json")).toBeNull();
  expect(parseSeenScores('{"endsAt":3}')).toBeNull();
  expect(parseSeenScores(`{"endsAt":"${WEEK}","scores":{"lessons":4,"chat-words":"x"}}`)).toEqual({
    endsAt: WEEK,
    scores: { lessons: 4 },
  });
});

test("RK-U21. 같은 주의 그 보드 점수만 돌려준다 — 주가 바뀌었거나 본 적이 없으면 null", () => {
  const seen = { endsAt: WEEK, scores: { lessons: 4 } };
  expect(seenScoreIn(seen, "lessons", WEEK)).toBe(4);
  expect(seenScoreIn(seen, "chat-words", WEEK)).toBeNull();
  expect(seenScoreIn(seen, "lessons", "2026-11-30T00:00:00Z")).toBeNull();
  expect(seenScoreIn(null, "lessons", WEEK)).toBeNull();
});

test("RK-U22. 고치기 — 같은 주면 그 보드만 바꾸고, 새 주면 앞 주의 점수를 버린다", () => {
  const seen = { endsAt: WEEK, scores: { lessons: 4 } };
  expect(withSeenScore(seen, "chat-words", WEEK, 9)).toEqual({
    endsAt: WEEK,
    scores: { lessons: 4, "chat-words": 9 },
  });
  expect(withSeenScore(seen, "lessons", "2026-11-30T00:00:00Z", 1)).toEqual({
    endsAt: "2026-11-30T00:00:00Z",
    scores: { lessons: 1 },
  });
  expect(withSeenScore(null, "lessons", WEEK, 2)).toEqual({ endsAt: WEEK, scores: { lessons: 2 } });
});
