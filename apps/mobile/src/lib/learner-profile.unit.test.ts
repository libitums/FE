import { describe, expect, test } from "vitest";

import {
  LEARNER_NAME_MAX_LENGTH,
  isLearnerCountryCode,
  learnerNameFrom,
  learnerProfileRecordFrom,
  learnerProfileSavedEvent,
  noLearnerProfilePort,
  pickLearnerName,
  sameLearnerProfile,
} from "./learner-profile";

// `unit` 계층: 이름 검증 · 기록 디코드 · 같음 판정 · 이벤트 만들기의 입출력만 봅니다.
// 이름과 나라는 둘 다 있어야 기록이 됩니다(한 칸만 찬 기록은 없습니다).

const emma = { name: "Emma", countryCode: "DE" } as const;

describe("learnerNameFrom", () => {
  test("PN-0. 상한은 30이다", () => {
    expect(LEARNER_NAME_MAX_LENGTH).toBe(30);
  });

  test.each([
    ["  Emma  ", "Emma"],
    ["Mary   Ann", "Mary Ann"],
    ["Mary\tAnn", "Mary Ann"],
    ["Mary　Ann", "Mary Ann"],
    ["Mary Ann", "Mary Ann"],
    ["　Emma ", "Emma"],
  ])("PN-1. 공백류는 한 칸으로 줄이고 앞뒤를 걷는다: %j -> %j", (input, expected) => {
    expect(learnerNameFrom(input)).toEqual({ ok: true, name: expected });
  });

  test.each([[""], ["   "], ["\t　 "]])("PN-2. 빈 이름은 empty다: %j", (input) => {
    expect(learnerNameFrom(input)).toEqual({ ok: false, issue: "empty" });
  });

  test.each([
    ["a{b"],
    ["a}b"],
    ["{나라}"],
    ["{이름}"],
    ["a\u0000b"],
    ["a\u0001b"],
    ["a\u007Fb"],
    ["a\u0085b"],
    ["a\u009Fb"],
  ])("PN-3. 금지 문자는 forbidden-character다: %j", (input) => {
    expect(learnerNameFrom(input)).toEqual({ ok: false, issue: "forbidden-character" });
  });

  test.each([
    ["줄바꿈", "a\nb"],
    ["줄 구분자", `a${String.fromCharCode(0x2028)}b`],
    ["문단 구분자", `a${String.fromCharCode(0x2029)}b`],
  ])("PN-3. %s는 거절되거나 이름 안에 남지 않는다", (_label, input) => {
    const result = learnerNameFrom(input);
    const breaks = [`\n`, `\r`, String.fromCharCode(0x2028), String.fromCharCode(0x2029)];
    const rejected = !result.ok && result.issue === "forbidden-character";
    const clean = result.ok && breaks.every((lineBreak) => !result.name.includes(lineBreak));

    expect(rejected || clean).toBe(true);
  });

  test("PN-4. 30자는 통과하고 31자는 too-long이다", () => {
    expect(learnerNameFrom("a".repeat(30))).toEqual({ ok: true, name: "a".repeat(30) });
    expect(learnerNameFrom("a".repeat(31))).toEqual({ ok: false, issue: "too-long" });
  });

  test("PN-4. 길이는 UTF-16 단위가 아니라 코드 포인트로 센다", () => {
    expect(learnerNameFrom("😊".repeat(30))).toEqual({ ok: true, name: "😊".repeat(30) });
    expect(learnerNameFrom("😊".repeat(31))).toEqual({ ok: false, issue: "too-long" });
    expect(learnerNameFrom("가".repeat(30))).toEqual({ ok: true, name: "가".repeat(30) });
    expect(learnerNameFrom("가".repeat(31))).toEqual({ ok: false, issue: "too-long" });
    // 결합 문자도 코드 포인트 하나씩 센다(e + U+0301 열다섯 쌍 = 30).
    expect(learnerNameFrom("é".repeat(15)).ok).toBe(true);
    expect(learnerNameFrom("é".repeat(16))).toEqual({ ok: false, issue: "too-long" });
  });

  test("PN-5. 판정 순서는 빈 값 → 금지 문자 → 길이다", () => {
    expect(learnerNameFrom(`${"a".repeat(31)}{`)).toEqual({
      ok: false,
      issue: "forbidden-character",
    });
  });

  test.each([
    ["José"],
    ["Nguyễn"],
    ["O'Brien"],
    ["Anne-Marie"],
    ["민지"],
    ["Мария"],
    ["Emma😊"],
    ["007"],
  ])("PN-6. 그 밖의 글자는 받는다: %s", (input) => {
    expect(learnerNameFrom(input)).toEqual({ ok: true, name: input });
  });

  test("PN-7. 아주 긴 입력 · 외로운 서러게이트에도 던지지 않는다", () => {
    expect(() => learnerNameFrom("a".repeat(10_000))).not.toThrow();
    expect(() => learnerNameFrom("\uD800")).not.toThrow();
    expect(() => learnerNameFrom("a\uDC00b")).not.toThrow();
  });

  const high = String.fromCharCode(0xd800);
  const low = String.fromCharCode(0xdc00);
  test.each([
    ["앞선 서로게이트 단독", `Em${high}ma`],
    ["뒤따르는 서로게이트 단독", low],
    ["앞선 서로게이트가 끝에서 짝 없이", `Emma${high}`],
    ["뒤따르는 서로게이트가 앞에서 짝 없이", `${low}Emma`],
    ["순서가 뒤집힌 짝", `${low}${high}`],
    ["앞선 둘 연속 뒤 뒤따르는 하나", `${high}${high}${low}`],
  ])("PN-8. 짝 없는 서로게이트는 forbidden-character다: %s", (_label, input) => {
    expect(learnerNameFrom(input)).toEqual({ ok: false, issue: "forbidden-character" });
  });

  test("PN-8. 짝이 맞는 서로게이트(이모지)는 통과한다", () => {
    const pair = `${String.fromCharCode(0xd83d)}${String.fromCharCode(0xde0a)}`;
    expect(learnerNameFrom(`Emma${pair}`)).toEqual({ ok: true, name: `Emma${pair}` });
  });
});

describe("isLearnerCountryCode", () => {
  test("PR-2. 대문자 라틴 두 글자만 참이다", () => {
    expect(isLearnerCountryCode("KR")).toBe(true);
    expect(isLearnerCountryCode("XK")).toBe(true);
    for (const value of ["kr", "K", "KOR", "K1", "", 12, null, undefined, {}, ["KR"]]) {
      expect(isLearnerCountryCode(value)).toBe(false);
    }
  });
});

describe("learnerProfileRecordFrom", () => {
  test("PR-1. 이름과 나라가 둘 다 규칙을 지키면 정규화된 기록이다", () => {
    expect(learnerProfileRecordFrom({ name: " Emma ", countryCode: "DE" })).toEqual(emma);
    expect(learnerProfileRecordFrom({ name: "Mary   Ann", countryCode: "KR" })).toEqual({
      name: "Mary Ann",
      countryCode: "KR",
    });
    expect(learnerProfileRecordFrom({ name: "민지", countryCode: "XK" })).toEqual({
      name: "민지",
      countryCode: "XK",
    });
  });

  test.each([
    ["이름만", { name: "Emma", countryCode: null }],
    ["나라만", { name: null, countryCode: "DE" }],
    ["둘 다 null", { name: null, countryCode: null }],
    ["이름 키 없음", { countryCode: "DE" }],
    ["나라 키 없음", { name: "Emma" }],
    ["빈 이름", { name: "   ", countryCode: "DE" }],
    ["소문자 코드", { name: "Emma", countryCode: "de" }],
    ["세 글자 코드", { name: "Emma", countryCode: "DEU" }],
    ["숫자 섞인 코드", { name: "Emma", countryCode: "D1" }],
    ["금지 문자 이름", { name: "{x}", countryCode: "DE" }],
    ["31자 이름", { name: "a".repeat(31), countryCode: "DE" }],
    ["이름이 숫자", { name: 7, countryCode: "DE" }],
    ["null", null],
    ["undefined", undefined],
    ["배열", ["Emma", "DE"]],
    ["문자열", "Emma"],
    ["숫자", 7],
  ])("PR-1. 기록이 아니다 -> null: %s", (_label, raw) => {
    expect(learnerProfileRecordFrom(raw)).toBeNull();
  });
});

describe("sameLearnerProfile", () => {
  test("PR-3. 둘 다 없으면 같고 한쪽만 없으면 다르다", () => {
    expect(sameLearnerProfile(null, null)).toBe(true);
    expect(sameLearnerProfile(null, emma)).toBe(false);
    expect(sameLearnerProfile(emma, null)).toBe(false);
  });

  test("PR-3. 값이 같으면 참조가 달라도 같다", () => {
    expect(sameLearnerProfile({ ...emma }, { name: "Emma", countryCode: "DE" })).toBe(true);
  });

  test("PR-3. 이름의 대소문자 · 나라 코드가 다르면 다르다", () => {
    expect(sameLearnerProfile(emma, { name: "emma", countryCode: "DE" })).toBe(false);
    expect(sameLearnerProfile(emma, { name: "Emma", countryCode: "FR" })).toBe(false);
    expect(sameLearnerProfile(emma, { name: "Liam", countryCode: "DE" })).toBe(false);
  });
});

describe("이벤트", () => {
  test.each(["signup", "settings"] as const)("PR-4. 이전 기록이 없으면 created다: %s", (entry) => {
    expect(learnerProfileSavedEvent(entry, null)).toEqual({
      name: "learner_profile_saved",
      entry,
      change: "created",
    });
  });

  test("PR-4. 이전 기록이 있으면 updated다", () => {
    expect(learnerProfileSavedEvent("settings", emma)).toEqual({
      name: "learner_profile_saved",
      entry: "settings",
      change: "updated",
    });
  });

  test("PR-4. 이벤트의 키는 name · entry · change뿐이고 값(이름 · 나라)이 새지 않는다", () => {
    const created = learnerProfileSavedEvent("signup", null);
    const updated = learnerProfileSavedEvent("settings", emma);

    expect(Object.keys(created).sort()).toEqual(["change", "entry", "name"]);
    expect(Object.keys(updated).sort()).toEqual(["change", "entry", "name"]);
    expect(JSON.stringify([created, updated])).not.toMatch(/Emma|"DE"/);
  });
});

describe("noLearnerProfilePort", () => {
  test("PR-6. 검색은 빈 목록 · 조회는 null · 미리보기는 줄 없는 example이다", () => {
    expect(noLearnerProfilePort.search("ko")).toEqual([]);
    expect(noLearnerProfilePort.search("")).toEqual([]);
    expect(noLearnerProfilePort.byCode("KR")).toBeNull();
    expect(noLearnerProfilePort.previewOf("Emma", null)).toEqual({ kind: "example", lines: [] });
    expect(noLearnerProfilePort.randomName(null)).toBe("");
  });
});

describe("pickLearnerName", () => {
  const names = ["Emma", "Leo", "Mai"] as const;

  test("PR-7. random 값의 구간으로 고른다 — 0은 첫째, 1에 가까우면 마지막", () => {
    expect(pickLearnerName(names, null, () => 0)).toBe("Emma");
    expect(pickLearnerName(names, null, () => 0.5)).toBe("Leo");
    expect(pickLearnerName(names, null, () => 0.9999)).toBe("Mai");
  });

  test("PR-7. 지난 이름은 빼고 고른다(Shuffle이 같은 이름을 다시 내지 않는다)", () => {
    for (const value of [0, 0.3, 0.6, 0.9999]) {
      expect(pickLearnerName(names, "Leo", () => value)).not.toBe("Leo");
    }
    expect(pickLearnerName(names, "Emma", () => 0)).toBe("Leo");
  });

  test("PR-7. 목록에 없는 지난 이름 · 한 개뿐인 목록 · 빈 목록 · 1을 내는 random도 다룬다", () => {
    expect(pickLearnerName(names, "Zoe", () => 0)).toBe("Emma");
    expect(pickLearnerName(["Emma"], "Emma", () => 0.5)).toBe("Emma");
    expect(pickLearnerName([], null, () => 0.5)).toBe("");
    expect(pickLearnerName(names, null, () => 1)).toBe("Mai");
  });
});
