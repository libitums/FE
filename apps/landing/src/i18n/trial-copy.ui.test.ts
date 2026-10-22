import { describe, expect, it } from "vitest";

import { trialEn } from "./trial-copy";
import { trialKo } from "./trial-ko";

// TK1 — 두 언어의 체험판 문구가 같은 키를 비지 않은 값으로 채우고, 자리표시자 이름이 키마다 같다.
const placeholders = (text: string) =>
  [...text.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((m) => m[1]).sort();

describe("TK1 체험판 문구", () => {
  it("trialKo가 trialEn의 키를 전부 · 그것만 채운다", () => {
    expect(Object.keys(trialKo).sort()).toEqual(Object.keys(trialEn).sort());
  });

  it.each([
    ["en", trialEn],
    ["ko", trialKo],
  ] as const)("값은 비지 않은 평문 — 태그 없음 (%s)", (_language, copy) => {
    for (const [key, value] of Object.entries(copy)) {
      expect(typeof value, key).toBe("string");
      expect(value.trim(), key).not.toBe("");
      expect(value, key).not.toMatch(/<[a-z/]/i);
    }
  });

  it("키마다 {name} 자리표시자 집합이 같다", () => {
    for (const key of Object.keys(trialEn) as (keyof typeof trialEn)[]) {
      expect(placeholders(trialKo[key]), key).toEqual(placeholders(trialEn[key]));
    }
  });

  it("계약이 정한 자리표시자", () => {
    expect(placeholders(trialEn.correctAnswer)).toEqual(["answer"]);
    expect(placeholders(trialEn.lineProgress)).toEqual(["ordinal", "total"]);
    expect(placeholders(trialEn.hint)).toEqual(["roman", "translation"]);
    expect(placeholders(trialEn.youSaid)).toEqual(["heard"]);
    expect(placeholders(trialEn.completeBodyMissed)).toEqual(["correct", "total"]);
  });

  it("앱과 같은 en 원문", () => {
    expect(trialEn.great).toBe("Great");
    expect(trialEn.notQuite).toBe("Not quite");
    expect(trialEn.showHint).toBe("Show hint");
    expect(trialEn.cantSpeak).toBe("Can't speak now");
    expect(trialEn.me).toBe("Me");
  });

  it("ko 값이 en 값을 그대로 베끼지 않는다(자리표시자만인 문구 제외)", () => {
    const copied = (Object.keys(trialEn) as (keyof typeof trialEn)[]).filter(
      (key) => trialKo[key] === trialEn[key] && trialEn[key].replace(/\{[^}]+\}|[\s·]/g, "") !== "",
    );
    expect(copied).toEqual([]);
  });
});
