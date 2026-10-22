import { describe, expect, test } from "vitest";

import { KNOWN_ITEM_TYPES } from "./episode-content.schema";
import { scoredItemTypeOf } from "./item-answer";

// `unit` 계층: 문항 유형이 채점 유형인지 가르는 순수 함수의 입출력만 봅니다.

const scored = [
  "LISTEN_SELECT",
  "MIN_PAIR_AB",
  "IMG_MATCH",
  "CLOZE",
  "CLOZE_CHOICE",
  "REPLY_SELECT",
  "ROLE_LINE",
  "TRANSLATE_TO_EN",
  "PARTICLE_FILL",
  "PARTICLE_SWAP",
  "CULTURE_CHECK",
  "LISTEN_BUILD",
  "WORD_ORDER",
  "TURN_ORDER",
  "SYLLABLE_BUILD",
  "SPEAK_WORD",
] as const;

const unscored = [
  "VOCAB_CARD",
  "CULTURE_CARD",
  "SHADOW",
  "PAIR_MATCH",
  "DICTATION",
  "TRANSLATE_TO_KO",
  "SENT_BUILD",
  "ROLEPLAY_TURN",
] as const;

describe("scoredItemTypeOf (EV1)", () => {
  test.each(scored)("%s는 채점 유형이라 그대로 돌려준다", (type) => {
    expect(scoredItemTypeOf(type)).toBe(type);
  });

  test.each(unscored)("%s는 채점 밖이라 null이다", (type) => {
    expect(scoredItemTypeOf(type)).toBeNull();
  });

  test("표가 콘텐츠의 모든 문항 유형을 한 번씩 덮는다", () => {
    expect(new Set<string>([...scored, ...unscored])).toEqual(new Set<string>(KNOWN_ITEM_TYPES));
    expect(scored.length + unscored.length).toBe(KNOWN_ITEM_TYPES.length);
  });
});
