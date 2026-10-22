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
    // 배너는 두 언어 모두 같은 영어 한 문구(사용자 결정 r3 — 예고 장면 대신 배너가 다음을 묻는다).
    expect(trialEn.clearTitle).toBe("What happens next?");
    expect(trialKo.clearTitle).toBe("What happens next?");
  });

  it("r2 · r3 — 표지 · 스토어 · 예고 문구는 없고 사전 등록 문구가 있다", () => {
    for (const gone of [
      "startTitle",
      "startBody",
      "startWith",
      "startLines",
      "start",
      "storeGet",
      "storeSoon",
    ]) {
      expect(Object.keys(trialEn), gone).not.toContain(gone);
    }
    // r3 — 예고 장면 문구는 없다
    for (const gone of ["teaserLabel", "teaserTitle", "teaserBody"]) {
      expect(Object.keys(trialEn), gone).not.toContain(gone);
    }
    expect(trialEn.preregPrivacy).toMatch(/launch/i);
    expect(trialKo.preregPrivacy).toContain("출시");
  });

  it("r3 — 마이크 아래 수집 안내(글자로 저장 · 채점 개선)", () => {
    expect(trialEn.speechSaved).toBe("What you say is saved as text to improve scoring.");
    expect(trialKo.speechSaved).toBe("말한 문장은 글자로 저장되어 채점을 개선하는 데 쓰여요.");
  });

  it("ko 값이 en 값을 그대로 베끼지 않는다(자리표시자만인 문구 제외)", () => {
    const copied = (Object.keys(trialEn) as (keyof typeof trialEn)[]).filter(
      (key) =>
        key !== "clearTitle" &&
        trialKo[key] === trialEn[key] &&
        trialEn[key].replace(/\{[^}]+\}|[\s·]/g, "") !== "",
    );
    expect(copied).toEqual([]);
  });
});
