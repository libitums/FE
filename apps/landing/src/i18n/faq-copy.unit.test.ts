import { describe, expect, it } from "vitest";
import { buildFaq } from "../seo/faq";
import type { FaqCopy, FaqCopyKey, FaqEntry, StoreAvailability } from "../seo/seo.contract";
import { en } from "./copy";
import { ko } from "./ko";

// FAQ 키가 아직 `en` · `ko`에 없어도 컴파일되도록 문자열 사전으로 읽습니다.
// 키가 없으면 런타임에 undefined가 되어 단언이 실패합니다.
const faqKeys: readonly FaqCopyKey[] = [
  "faqWhatQ",
  "faqWhatA",
  "faqWhoQ",
  "faqWhoA",
  "faqDifferentQ",
  "faqDifferentA",
  "faqActivitiesQ",
  "faqActivitiesA",
  "faqHangulQ",
  "faqHangulA",
  "faqLanguageQ",
  "faqLanguageA",
  "faqWhereQ",
  "faqWhereASoon",
  "faqWhereAAvailable",
];

const languages = { en, ko } as const;
type Language = keyof typeof languages;
const states: readonly StoreAvailability[] = ["coming-soon", "available"];

const copyOf = (language: Language): FaqCopy => {
  const source = languages[language] as unknown as Record<string, string | undefined>;
  return Object.fromEntries(faqKeys.map((key) => [key, source[key]])) as FaqCopy;
};

const faqOf = (language: Language, storeAvailability: StoreAvailability): readonly FaqEntry[] =>
  buildFaq({ copy: copyOf(language), storeAvailability });

const cases = (["en", "ko"] as const).flatMap((language) =>
  states.map((state) => ({ language, state })),
);

const textsOf = (faq: readonly FaqEntry[]) =>
  faq.flatMap((entry) => [entry.question, entry.answer]);

describe("FAQ 문구 데이터", () => {
  it("U-CP1 네 목록이 각각 일곱이고 비어 있지 않다", () => {
    for (const { language, state } of cases) {
      const faq = faqOf(language, state);
      expect(faq).toHaveLength(7);
      for (const entry of faq) {
        expect(entry.question.trim()).not.toBe("");
        expect(entry.answer.trim()).not.toBe("");
      }
    }
  });

  it("U-CP2 가격 · 평점 · 수치 낱말이 없다", () => {
    const banned = {
      en: /\b(free|price|pricing|paid|subscription|cost|\$|rating|stars?|reviews?|downloads|users)\b/i,
      ko: /무료|유료|가격|요금|구독|결제|평점|별점|리뷰|다운로드 수|사용자 수|만 명/,
    } as const;
    for (const { language, state } of cases) {
      for (const text of textsOf(faqOf(language, state))) {
        expect(text).not.toMatch(banned[language]);
      }
    }
  });

  it("U-CP3 답에 숫자가 없다", () => {
    for (const { language, state } of cases) {
      for (const entry of faqOf(language, state)) {
        expect(entry.answer).not.toMatch(/\d/);
      }
    }
  });

  it("U-CP4 공항 · 비행기로 못 박지 않는다", () => {
    const banned = { en: /airport|plane|flight/i, ko: /공항|비행기|기내/ } as const;
    for (const { language, state } of cases) {
      for (const text of textsOf(faqOf(language, state))) {
        expect(text).not.toMatch(banned[language]);
      }
    }
  });

  it("U-CP5 출시 전 답은 출시 전임을 말하고 available 답은 말하지 않는다", () => {
    const marker = { en: "not released yet", ko: "출시 전" } as const;
    for (const language of ["en", "ko"] as const) {
      const soon = faqOf(language, "coming-soon").find((entry) => entry.id === "where");
      const available = faqOf(language, "available").find((entry) => entry.id === "where");
      expect(soon?.answer).toContain(marker[language]);
      expect(available?.answer).not.toContain(marker[language]);
    }
  });

  it("U-CP6 답은 문장 둘 이하이고 첫 문장이 Duru로 시작한다", () => {
    const opening = { en: /^(Duru|In Duru)/, ko: /^Duru/ } as const;
    const sentencesOf = (answer: string) =>
      answer.split(/(?<=\.)\s+/).filter((sentence) => sentence.trim() !== "");
    for (const { language, state } of cases) {
      const faq = faqOf(language, state);
      for (const entry of faq) {
        expect(sentencesOf(entry.answer).length).toBeGreaterThan(0);
        expect(sentencesOf(entry.answer).length).toBeLessThanOrEqual(2);
      }
      for (const entry of faq.filter((item) => item.id !== "hangul")) {
        expect(sentencesOf(entry.answer)[0] ?? "").toMatch(opening[language]);
      }
    }
  });

  it("U-CP7 ko에는 한글이 있고 en에는 한글이 없다", () => {
    const hangul = /[가-힣]/;
    for (const key of faqKeys) {
      const enValue = copyOf("en")[key];
      const koValue = copyOf("ko")[key];
      expect(typeof enValue).toBe("string");
      expect(typeof koValue).toBe("string");
      expect(enValue).not.toMatch(hangul);
      expect(koValue).toMatch(hangul);
    }
  });
});
