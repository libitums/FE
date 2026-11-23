import { describe, expect, test } from "vitest";

import { messengerChatSuggestedEn } from "./ui-copy-en-chat-suggested";
import { messengerChatSuggestedEs } from "./ui-copy-es-chat-suggested";
import { messengerChatSuggestedId } from "./ui-copy-id-chat-suggested";
import { messengerChatSuggestedJa } from "./ui-copy-ja-chat-suggested";
import { messengerChatSuggestedVi } from "./ui-copy-vi-chat-suggested";

// `unit` 계층(AA-U1 · U2): 「Get closer」 시트 문구(ADR-0164, 사용자 결정 2026-11-19). 어느 언어에서도 로맨스 · 성인 · 18+ · 생년을
// 말하지 않고, 대명사는 인물 데이터를 따른다(없으면 대명사 없는 문구).

const tables = {
  en: messengerChatSuggestedEn,
  es: messengerChatSuggestedEs,
  id: messengerChatSuggestedId,
  ja: messengerChatSuggestedJa,
  vi: messengerChatSuggestedVi,
} as const;

/** 언어마다 쓰지 않을 말 — 소문자로 비교합니다. */
const FORBIDDEN = [
  "roman",
  "adult",
  "18",
  "birth",
  "sex",
  "romántic",
  "adulto",
  "mayor de edad",
  "nacimiento",
  "romantis",
  "dewasa",
  "lahir",
  "恋愛",
  "ロマン",
  "大人",
  "成人",
  "生年",
  "誕生",
  "lãng mạn",
  "người lớn",
  "trưởng thành",
  "năm sinh",
];

describe("AA-U1 숨길 말", () => {
  test.each(Object.entries(tables))("%s — 모든 문구에 금지어가 없다", (_language, copy) => {
    const ack = copy.adultAck;
    const texts = [
      ack.title("서연"),
      ...(["female", "male", null] as const).flatMap((g) => [ack.body(g), ack.casual(g)]),
      ack.safe,
      ack.confirm,
      ack.decline,
    ];
    for (const text of texts) {
      expect(text.trim(), text).not.toBe("");
      for (const word of FORBIDDEN) expect(text.toLowerCase(), text).not.toContain(word);
    }
  });
});

describe("AA-U2 en 문구 · 대명사", () => {
  const ack = messengerChatSuggestedEn.adultAck;
  test("디자인 B1 그대로", () => {
    expect(ack.title("차서연")).toBe("Get closer with 차서연?");
    expect(ack.body("female")).toBe(
      "She can be warmer and more personal with you, like someone you're getting to know.",
    );
    expect(ack.safe).toBe("Always kind and respectful. Never anything explicit.");
    expect(ack.casual("female")).toBe("Want to keep it casual later? Just tell her.");
    expect(ack.confirm).toBe("Sounds good");
    expect(ack.decline).toBe("Just friends for now");
  });

  test("he · 대명사 없음", () => {
    expect(ack.body("male").startsWith("He can")).toBe(true);
    expect(ack.casual("male")).toBe("Want to keep it casual later? Just tell him.");
    expect(ack.body(null)).not.toMatch(/\b(she|he|her|him)\b/i);
    expect(ack.casual(null)).not.toMatch(/\b(she|he|her|him)\b/i);
  });
});
