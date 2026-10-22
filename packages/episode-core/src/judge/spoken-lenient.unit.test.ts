import { describe, expect, test } from "vitest";

import {
  judgeSpokenLenient,
  SPOKEN_LENIENT_THRESHOLD,
  SPOKEN_SEGMENT_FLOOR,
  spokenSimilarity,
  spokenUnitsOf,
  type SpokenOutcome,
} from "./index";

// `unit` 계층: 발음 기준의 너그러운 말하기 판정. 사례 표는 u00 롤플레이 세 턴의 정답으로 만들었고,
// 기준값(0.75 · 마디 하한 0.5)은 이 표가 정한다. 앱 채점(judgeSpeaking · judgeRoleplayReply)은 그대로다.

const T1 = "안녕하세요! 네, 처음이에요!";
const T2 = "진짜요? 감사합니다!";
const T3 = "지금부터요!";
const P = "처음이에요";

const units = (text: string) => spokenUnitsOf(text).join("");

describe("SP1 발음형", () => {
  test.each([
    ["좋아요", "조아요"],
    ["좋다", "조타"],
    ["축하", "추카"],
    ["감사합니다", "감사함니다"],
    ["신라", "실라"],
    ["없어요", "업서요"],
    ["처음이에요", "처으미에요"],
    ["찐짜", "진짜"],
    ["개", "게"],
    ["의사", "이사"],
  ])("%s = %s", (spelled, sounded) => {
    expect(units(spelled)).toBe(units(sounded));
    expect(units(spelled).length).toBeGreaterThan(0);
  });

  test("자모 단위 — 초성 ㅇ은 없고, 받침은 7대표음", () => {
    expect(spokenUnitsOf("안녕")).toEqual(["ㅏ", "ㄴ", "ㄴ", "ㅕ", "ㅇ"]);
    expect(spokenUnitsOf("꽃")).toEqual(["ㄱ", "ㅗ", "ㄷ"]);
    expect(spokenUnitsOf("밖")).toEqual(["ㅂ", "ㅏ", "ㄱ"]);
  });

  test("띄어쓰기 · 부호는 무시하고, 낱말 경계 너머로도 연음한다", () => {
    expect(units("처음 이에요")).toBe(units("처음이에요"));
    expect(units("  처음이에요?!… ")).toBe(units("처음이에요"));
  });

  test("군말(어 · 음 · 아 · 그 · 으 · 흠 · 엄과 그 반복)은 낱말 전체일 때만 뗀다", () => {
    expect(units("어 음음 그 처음이에요")).toBe(units("처음이에요"));
    expect(units("아 흠 엄 으 처음이에요")).toBe(units("처음이에요"));
    // 낱말 안의 같은 글자는 그대로다
    expect(units("그림")).not.toBe("");
    expect(units("어머")).not.toBe("");
    expect(units("어 음")).toBe("");
  });

  test("NFD로 들어와도 같다 · 영문 숫자는 소문자 한 단위", () => {
    expect(units("처음이에요".normalize("NFD"))).toBe(units("처음이에요"));
    expect(spokenUnitsOf("Hi 2")).toEqual(["h", "i", "2"]);
  });

  test("빈 글 · 부호만 → 빈 열", () => {
    expect(spokenUnitsOf("")).toEqual([]);
    expect(spokenUnitsOf("?! …")).toEqual([]);
  });
});

type Case = readonly [id: string, expected: string, heard: string, outcome: SpokenOutcome];

// spec-r3 §5 사례 표.
const CASES: readonly Case[] = [
  ["S1", T1, "안녕하세요! 네, 처음이에요!", "strict"],
  ["S2", T1, "안녕하세요 네 처음이에요", "strict"],
  ["S3", T2, "진짜요 감사합니다", "strict"],
  ["S4", T3, "지금부터요", "strict"],
  ["L1", P, "처음이예요", "lenient"],
  ["L2", P, "처으미에요", "lenient"],
  ["L3", T1, "안녕하세요 네 처음 이에요", "lenient"],
  ["L4", T1, "어 안녕하세요 네 처음이에요", "lenient"],
  ["L5", T2, "감사함니다 진짜요", "lenient"],
  ["L6", T3, "지금 부터요", "lenient"],
  ["L7", T1, "안녕하세요 네 처음이예요", "lenient"],
  ["L8", T1, "안녕하세요 처음이에요", "lenient"],
  ["L9", T1, "안녕하세여 네 처음이에여", "lenient"],
  ["L10", T1, "음 그 안녕하세요 네 처음이에요", "lenient"],
  ["L11", T2, "찐짜요 감사합니다", "lenient"],
  ["L12", T2, "진자요 감사함니다", "lenient"],
  ["L13", T2, "진짜 감사합니다", "lenient"],
  ["L14", T2, "진짜요 감사합니다 하하", "strict"],
  ["L15", T3, "지굼부터요", "lenient"],
  ["L16", T3, "음 지금부터요", "lenient"],
  ["L17", T3, "지금부터여", "lenient"],
  ["N1", T1, "", "incorrect"],
  ["N1", T2, "", "incorrect"],
  ["N1", T3, "", "incorrect"],
  ["N1", P, "", "incorrect"],
  ["N2", T1, "안녕하세요", "incorrect"],
  ["N3", T1, "처음이에요", "incorrect"],
  ["N4", T2, "진짜요", "incorrect"],
  ["N5", T2, "감사합니다", "incorrect"],
  ["N6", T3, "지금", "incorrect"],
  ["N7", T3, "부터요", "incorrect"],
  ["N8", T1, "진짜요 감사합니다", "incorrect"],
  ["N9", T1, "지금부터요", "incorrect"],
  ["N10", T2, "안녕하세요 네 처음이에요", "incorrect"],
  ["N11", T2, "지금부터요", "incorrect"],
  ["N12", T3, "진짜요 감사합니다", "incorrect"],
  ["N13", T3, "안녕하세요 네 처음이에요", "incorrect"],
  ["N14", T1, "안녕히 가세요", "incorrect"],
  ["N15", T2, "죄송합니다", "incorrect"],
  ["N16", T2, "고맙습니다", "incorrect"],
  ["N17", T3, "언제부터요", "incorrect"],
  ["N18", T3, "지금이요", "incorrect"],
  ["N19", T3, "hello", "incorrect"],
  ["N20", T3, "어 음", "incorrect"],
];

describe("SP2 사례 표", () => {
  test.each(CASES)("%s %s ← 「%s」 → %s", (_id, expected, heard, outcome) => {
    expect(judgeSpokenLenient([expected], [heard]).outcome).toBe(outcome);
  });

  test.each([
    [P, "처음이예요", 0.857, 0.857],
    [T1, "안녕하세요 네 처음이예요", 0.947, 0.857],
    [T1, "안녕하세요 처음이에요", 0.947, 0.5],
    [T1, "안녕하세여 네 처음이에여", 0.895, 0.857],
    [T2, "감사함니다 진짜요", 1, 1],
    [T2, "진짜 감사합니다", 0.944, 0.833],
    [T3, "지굼부터요", 0.9, 0.9],
    [T1, "안녕하세요", 0.684, 0.286],
    [T1, "처음이에요", 0.526, 0.2],
    [T2, "진짜요", 0.444, 0.167],
    [T2, "감사합니다", 0.778, 0.333],
    [T3, "지금", 0.5, 0.5],
    [T1, "안녕히 가세요", 0.579, 0.286],
    [T3, "언제부터요", 0.6, 0.6],
    [T3, "hello", 0, 0],
  ])("일치도 %s ← 「%s」 = %s / 마디 %s", (expected, heard, similarity, weakest) => {
    const result = spokenSimilarity(expected, heard);
    expect(result.similarity).toBeCloseTo(similarity, 3);
    expect(result.weakest).toBeCloseTo(weakest, 3);
  });

  test("판정의 similarity는 소수 셋째 자리 — lenient 0.857 · strict 1 · 빈 들음 0", () => {
    expect(judgeSpokenLenient([P], ["처음이예요"]).similarity).toBe(0.857);
    expect(judgeSpokenLenient([T2], ["진짜요 감사합니다"]).similarity).toBe(1);
    expect(judgeSpokenLenient([T1], [""]).similarity).toBe(0);
  });

  test("알려진 한계 — 뜻이 반대인 삽입도 발음이 가까우면 통과한다(문서에 둔다)", () => {
    expect(judgeSpokenLenient([T1], ["안녕하세요 네 처음이 아니에요"]).outcome).toBe("lenient");
  });
});

describe("SP3 판정 묶음", () => {
  test("대안 셋 중 둘째만 통과 → lenient · heard는 그 대안", () => {
    expect(judgeSpokenLenient([T3], ["지구 보더", "지금 부터요", "치즈"])).toEqual({
      outcome: "lenient",
      similarity: 1,
      heard: "지금 부터요",
      expected: T3,
    });
  });

  test("엄격 통과 대안이 있으면 lenient 대안보다 앞선다", () => {
    expect(judgeSpokenLenient([T2], ["감사함니다 진짜요", "진짜요 감사합니다"])).toEqual({
      outcome: "strict",
      similarity: 1,
      heard: "진짜요 감사합니다",
      expected: T2,
    });
  });

  test("정답 둘 중 둘째가 더 가까우면 expected는 둘째", () => {
    const result = judgeSpokenLenient(["감사합니다", "고맙습니다"], ["고맙슴니다"]);
    expect(result).toMatchObject({
      outcome: "lenient",
      expected: "고맙습니다",
      heard: "고맙슴니다",
    });
  });

  test("오답 → heard는 첫 대안, similarity · expected는 가장 가까운 쌍", () => {
    const result = judgeSpokenLenient(["안녕히 가세요", T2], ["감사합니다", "진짜"]);
    expect(result.outcome).toBe("incorrect");
    expect(result.heard).toBe("감사합니다");
    expect(result.expected).toBe(T2);
    expect(result.similarity).toBe(0.778);
  });

  test('대안이 없으면 incorrect · heard "" · similarity 0 · expected 첫 정답', () => {
    expect(judgeSpokenLenient([T1, T2], [])).toEqual({
      outcome: "incorrect",
      similarity: 0,
      heard: "",
      expected: T1,
    });
  });
});

describe("SP4 기준", () => {
  test("문장 0.75 · 마디 하한 0.5", () => {
    expect(SPOKEN_LENIENT_THRESHOLD).toBe(0.75);
    expect(SPOKEN_SEGMENT_FLOOR).toBe(0.5);
  });
});
