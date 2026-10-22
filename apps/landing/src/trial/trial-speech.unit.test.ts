import { describe, expect, it } from "vitest";

import { speechAlternativesOf, speechFailureOf, speechSupportOf } from "./trial-speech";

// `unit` 계층: 브라우저 말하기(Web Speech)의 순수 분류 — 오류 까닭 · 대안 · 지원 여부.

describe("speechFailureOf", () => {
  it.each([
    ["no-speech", "no-speech"],
    ["not-allowed", "denied"],
    ["service-not-allowed", "denied"],
    ["language-not-supported", "unsupported"],
    ["aborted", "aborted"],
    ["audio-capture", "unavailable"],
    ["network", "unavailable"],
    ["x", "unavailable"],
  ] as const)("TS1 %s → %s", (error, expected) => {
    expect(speechFailureOf(error)).toBe(expected);
  });
});

describe("speechAlternativesOf", () => {
  it("TS2 첫 결과의 대안을 다듬고 빈 값은 뺀다", () => {
    expect(
      speechAlternativesOf([
        [{ transcript: " 안녕 " }, { transcript: "" }, { transcript: "안녕하세요" }],
      ]),
    ).toEqual(["안녕", "안녕하세요"]);
  });

  it("TS2 결과가 없으면 빈 목록", () => {
    expect(speechAlternativesOf([])).toEqual([]);
    expect(speechAlternativesOf([[]])).toEqual([]);
  });

  it("TS2 ArrayLike(배열이 아닌 목록)도 읽는다", () => {
    const alternatives = { length: 2, 0: { transcript: "네" }, 1: { transcript: " 네요" } };
    expect(speechAlternativesOf({ length: 1, 0: alternatives })).toEqual(["네", "네요"]);
  });
});

describe("speechSupportOf", () => {
  it("TS3 생성자가 없으면 unsupported", () => {
    expect(speechSupportOf({})).toBe("unsupported");
  });

  it("TS3 SpeechRecognition 또는 webkitSpeechRecognition이 있으면 supported", () => {
    expect(speechSupportOf({ SpeechRecognition: class {} })).toBe("supported");
    expect(speechSupportOf({ webkitSpeechRecognition: class {} })).toBe("supported");
  });
});
