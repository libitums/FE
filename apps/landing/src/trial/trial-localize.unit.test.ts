import { describe, expect, it } from "vitest";

import { u00Translations } from "./content/u00-translations";
import { englishStringsOf, localizeTrialModel } from "./trial-localize";
import { u00TrialModel } from "./trial.test-support";

const languages = ["vi", "id", "ms", "es", "ja"] as const;

describe("TL 체험판 콘텐츠 번역", () => {
  it("TL1 모델에 실린 영어 문장은 세 언어 표에 전부 있다", () => {
    const english = englishStringsOf(u00TrialModel());
    expect(english.length).toBeGreaterThan(20);
    for (const language of languages) {
      const missing = english.filter((text) => !Object.hasOwn(u00Translations[language], text));
      expect(missing, language).toEqual([]);
    }
  });

  it("TL2 표가 null이면 같은 객체", () => {
    const model = u00TrialModel();
    expect(localizeTrialModel(model, null)).toBe(model);
  });

  it("TL3 영어 칸만 바뀌고 한국어 · 로마자 · 주소 · id는 그대로", () => {
    const model = u00TrialModel();
    const vi = localizeTrialModel(model, u00Translations.vi);
    expect(vi).not.toBe(model);
    // 컷 번역 · 지문
    expect(vi.prologue[0].text.en).toBe(u00Translations.vi[model.prologue[0].text.en ?? ""]);
    expect(vi.prologue[0].text.ko).toBe(model.prologue[0].text.ko);
    expect(vi.prologue[0].text.roman).toBe(model.prologue[0].text.roman);
    expect(vi.prologue[0].imageUrl).toBe(model.prologue[0].imageUrl);
    // 고르기 안내 · 제시문 · 보기 뜻
    expect(vi.imageMatch.instruction).toBe(u00Translations.vi[model.imageMatch.instruction]);
    expect(vi.imageMatch.prompt).toBe(u00Translations.vi[model.imageMatch.prompt]);
    expect(vi.imageMatch.options[0].en).toBe(
      u00Translations.vi[model.imageMatch.options[0].en ?? ""],
    );
    expect(vi.imageMatch.options[0].ko).toBe(model.imageMatch.options[0].ko);
    expect(vi.imageMatch.answerIndex).toBe(model.imageMatch.answerIndex);
    // 문화 카드 · 롤플레이 힌트 번역
    expect(vi.culture.body.en).toBe(u00Translations.vi[model.culture.body.en ?? ""]);
    expect(vi.roleplay.turns[0].replyTranslation).toBe(
      u00Translations.vi[model.roleplay.turns[0].replyTranslation ?? ""],
    );
    expect(vi.roleplay.turns[0].accepted).toEqual(model.roleplay.turns[0].accepted);
    expect(vi.roleplay.turns[0].tiles).toEqual(model.roleplay.turns[0].tiles);
    expect(vi.episodeId).toBe(model.episodeId);
    expect(vi.version).toBe(model.version);
  });

  it("TL4 바꾼 뒤에는 영어 문장이 하나도 남지 않는다(세 언어)", () => {
    const model = u00TrialModel();
    const english = new Set(englishStringsOf(model));
    for (const language of languages) {
      const localized = localizeTrialModel(model, u00Translations[language]);
      const left = englishStringsOf(localized).filter((text) => english.has(text));
      // 「Tutorial」 · 「Korea」처럼 번역이 영어와 같은 낱말만 남을 수 있다 — 표가 그렇게 정한 값이다.
      for (const text of left) expect(u00Translations[language][text], language).toBe(text);
    }
  });

  it("TL6 프로토타입의 키(constructor · toString)는 번역으로 집지 않는다", () => {
    const model = u00TrialModel();
    const probe = { ...model, imageMatch: { ...model.imageMatch, instruction: "constructor" } };
    expect(localizeTrialModel(probe, u00Translations.vi).imageMatch.instruction).toBe(
      "constructor",
    );
    expect(localizeTrialModel(probe, {}).imageMatch.instruction).toBe("constructor");
  });

  it("TL5 표의 값은 비지 않은 평문이고 자리표시자 · 태그가 없다", () => {
    for (const language of languages) {
      for (const [key, value] of Object.entries(u00Translations[language])) {
        expect(value.trim(), `${language}: ${key}`).not.toBe("");
        expect(value, `${language}: ${key}`).not.toMatch(/<[a-z/]|\{[a-z]+\}/i);
      }
    }
  });
});
