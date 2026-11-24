import { describe, expect, test } from "vitest";

import type { QuestionAudio } from "./question-audio";
import { answerReplayOf, chipSoundAt, sentenceReplayOf } from "./sentence-replay";

// `unit` 계층: 다시 듣기 단추 상태와 칩 소리 주소의 순수 판정(ADR-0188).

const SOURCE = "https://cdn/audio/u01-water/d-01.m4a";
const ECHO = "https://cdn/audio/u01-water/echo.m4a";
const listen: QuestionAudio = {
  kind: "listen",
  source: SOURCE,
  ref: { itemId: "L1", itemType: "LISTEN_BUILD" },
};

describe("sentenceReplayOf", () => {
  test("SR1. 주소가 있으면 누를 수 있는 단추(그 주소)", () => {
    expect(sentenceReplayOf(SOURCE)).toEqual({ kind: "available", source: SOURCE });
  });

  test.each([null, undefined, ""])("SR2. 주소가 %s이면 회색", (source) => {
    expect(sentenceReplayOf(source)).toEqual({ kind: "unavailable" });
  });
});

describe("answerReplayOf — 레슨 판정 뒤 정답 문장", () => {
  test("SR3. 판정 전에는 단추가 없다(정답을 미리 들려주지 않음)", () => {
    expect(answerReplayOf({ kind: "answer-echo", source: ECHO }, false)).toBeNull();
    expect(answerReplayOf(undefined, false)).toBeNull();
  });

  test("SR4. 판정 뒤 정답 음성이 있으면 그 주소", () => {
    expect(answerReplayOf({ kind: "answer-echo", source: ECHO, speechMs: 900 }, true)).toEqual({
      kind: "available",
      source: ECHO,
    });
  });

  test("SR5. 판정 뒤 소리가 없으면 회색", () => {
    expect(answerReplayOf(undefined, true)).toEqual({ kind: "unavailable" });
    expect(answerReplayOf(null, true)).toEqual({ kind: "unavailable" });
  });

  test("SR6. 듣기 갈래에 정답 음성이 실려 있으면 그 정답 음성", () => {
    expect(
      answerReplayOf({ ...listen, echo: { kind: "answer-echo", source: ECHO } }, true),
    ).toEqual({ kind: "available", source: ECHO });
  });

  test("SR7. 정답 음성 없는 듣기 갈래는 단추가 없다 — 위 줄 듣기 조작이 다시 듣기를 집니다", () => {
    expect(answerReplayOf(listen, true)).toBeNull();
  });
});

describe("chipSoundAt", () => {
  test("SR8. 칩의 소리 주소 · 소리 없는 칩은 null", () => {
    const chipAudio = [SOURCE, null, ECHO];
    expect(chipSoundAt(chipAudio, 0)).toBe(SOURCE);
    expect(chipSoundAt(chipAudio, 1)).toBeNull();
    expect(chipSoundAt(chipAudio, 2)).toBe(ECHO);
  });

  test("SR9. 목록이 없거나 범위 밖이면 null", () => {
    expect(chipSoundAt(undefined, 0)).toBeNull();
    expect(chipSoundAt([SOURCE], 1)).toBeNull();
    expect(chipSoundAt([SOURCE], -1)).toBeNull();
  });
});
