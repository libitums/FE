import { describe, expect, test } from "vitest";

import { fillPlaceholders, type LearnerProfile } from "./placeholder-fill";

// `unit` 계층: 순수 함수 `fillPlaceholders`의 입출력만 봅니다.

type Row = [text: string, profile: LearnerProfile, expected: string];

const KO_ROWS: Row[] = [
  ["{이름}(으)로 예약했어요.", { name: "민지" }, "민지로 예약했어요."],
  ["{이름}(으)로 예약했어요.", { name: "은정" }, "은정으로 예약했어요."],
  ["{이름}(으)로 예약했어요.", { name: "하늘" }, "하늘로 예약했어요."],
  ["{이름}(으)로 예약했어요.", { name: "Anna" }, "Anna로 예약했어요."],
  ["{이름}(으)로 예약했어요.", { name: "John" }, "John으로 예약했어요."],
  ["저는 {이름}이에요.", { name: "민지" }, "저는 민지예요."],
  ["저는 {이름}이에요.", { name: "은정" }, "저는 은정이에요."],
  ["{이름}은/는요?", { name: "민지" }, "민지는요?"],
  ["{이름}은/는요?", { name: "은정" }, "은정은요?"],
  ["저는 {나라}에서 왔어요.", { country: "스위스" }, "저는 스위스에서 왔어요."],
  ["{나라}은/는 멀어요.", { country: "한국" }, "한국은 멀어요."],
  ["{이름}(으)로 예약했어요.", {}, "이름으로 예약했어요."],
  ["{이름}(으)로 예약했어요.", { name: "  " }, "이름으로 예약했어요."],
];

const ROMAN_ROWS: Row[] = [
  ["{이름}(eu)ro yeyakaesseoyo.", { name: "민지" }, "민지ro yeyakaesseoyo."],
  ["{이름}(eu)ro yeyakaesseoyo.", { name: "은정" }, "은정euro yeyakaesseoyo."],
  ["jeoneun {이름}ieyo.", { name: "은정" }, "jeoneun 은정ieyo."],
  ["jeoneun {이름}ieyo.", { name: "민지" }, "jeoneun 민지yeyo."],
  ["{이름}eun/neunyo?", { name: "민지" }, "민지neunyo?"],
];

describe("fillPlaceholders", () => {
  test.each(KO_ROWS)("P1. ko %s / %j -> %s", (text, profile, expected) => {
    expect(fillPlaceholders(text, profile, "ko")).toBe(expected);
  });

  test.each(ROMAN_ROWS)("P2. roman %s / %j -> %s", (text, profile, expected) => {
    expect(fillPlaceholders(text, profile, "roman")).toBe(expected);
  });

  test("P2. roman 기본값은 ireum · nara", () => {
    expect(fillPlaceholders("{이름}!", {}, "roman")).toBe("ireum!");
    expect(fillPlaceholders("{나라}!", { country: " " }, "roman")).toBe("nara!");
  });

  test("P3. 토큰이 없는 문자열은 그대로이고 토큰 둘은 한 문장에서 모두 바뀐다", () => {
    expect(fillPlaceholders("안녕하세요.", { name: "민지" }, "ko")).toBe("안녕하세요.");
    expect(
      fillPlaceholders("{이름}은/는 {나라}에서 왔어요.", { name: "민지", country: "스위스" }, "ko"),
    ).toBe("민지는 스위스에서 왔어요.");
  });

  test.each([
    ["{이름} (으)로", "민지 (으)로"],
    ["{이름} 은/는", "민지 은/는"],
  ])("P4. 조사 표기가 토큰과 떨어져 있으면 바꾸지 않는다 (%s)", (text, expected) => {
    expect(fillPlaceholders(text, { name: "민지" }, "ko")).toBe(expected);
  });

  test.each([
    ["{이름}이/가", "민지", "민지가"],
    ["{이름}이/가", "은정", "은정이"],
    ["{이름}을/를", "민지", "민지를"],
    ["{이름}을/를", "은정", "은정을"],
  ])("P5. ko %s / %s -> %s", (text, name, expected) => {
    expect(fillPlaceholders(text, { name }, "ko")).toBe(expected);
  });

  test.each([
    ["{이름}i/ga", "민지", "민지ga"],
    ["{이름}i/ga", "은정", "은정i"],
    ["{이름}eul/reul", "민지", "민지reul"],
    ["{이름}eul/reul", "은정", "은정eul"],
  ])("P5. roman %s / %s -> %s", (text, name, expected) => {
    expect(fillPlaceholders(text, { name }, "roman")).toBe(expected);
  });

  // 이름 끝의 문장 부호 · 공백 · 이모지는 받침 판정에서 건너뛴다(값 표시는 그대로).
  test.each([
    ["{이름}(으)로", "민지!", "민지!로"],
    ["{이름}(으)로", "은정 ", "은정으로"], // 값의 앞뒤 공백은 표시에서도 걷는다
    ["{이름}은/는", "John.", "John.은"],
    ["{이름}은/는", "Anna😊", "Anna😊는"],
  ])("P6. ko %s / %j -> %s (끝 기호 건너뜀)", (text, name, expected) => {
    expect(fillPlaceholders(text, { name }, "ko")).toBe(expected);
  });
});
