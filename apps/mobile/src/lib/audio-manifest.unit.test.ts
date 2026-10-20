import { describe, expect, test } from "vitest";

import {
  AUDIO_MANIFEST_PATH,
  AUDIO_MANIFEST_SCHEMA,
  audioSyncLengthMs,
  parseAudioManifest,
} from "./audio-manifest";
import { MEASURED_MANIFEST_TEXT, manifestTextOf } from "./audio-manifest.test-support";

// `unit` 계층: 정보 파일 원문 → 표, 항목 → 맞출 길이. 순수 함수의 입출력만 봅니다.

const GOOD = { duration_ms: 2299, speech_end_ms: 1763 };
const wrap = (audio: unknown, extra: Record<string, unknown> = {}): string =>
  JSON.stringify({ schema: "audio-manifest-1", generated_at: "t", audio, ...extra });
// 같은 파일에 올바른 항목 하나를 함께 두어 「남은 항목」으로 버림을 봅니다.
const keysOf = (text: string): string[] => [...(parseAudioManifest(text)?.keys() ?? [])];

describe("parseAudioManifest", () => {
  test("AM1. 올바른 파일은 id별 길이 표가 된다", () => {
    const table = parseAudioManifest(
      manifestTextOf({
        "u01-water/pre-3": GOOD,
        "u02-checkin/pre-1": { duration_ms: 2027, speech_end_ms: 2027 },
        "u01-water/d-01": { duration_ms: 1091 },
      }),
    );
    expect(table).not.toBeNull();
    expect(table?.size).toBe(3);
    expect(table?.get("u01-water/pre-3")).toEqual({ durationMs: 2299, speechEndMs: 1763 });
    const noSpeechEnd = table?.get("u01-water/d-01");
    expect(noSpeechEnd).toEqual({ durationMs: 1091 });
    expect(noSpeechEnd !== undefined && "speechEndMs" in noSpeechEnd).toBe(false);
    expect(table?.get("u99-none/x")).toBeUndefined();
    expect(AUDIO_MANIFEST_SCHEMA).toBe("audio-manifest-1");
    expect(AUDIO_MANIFEST_PATH).toBe("audio/manifest.json");
  });

  test("AM2. 메인이 잰 파일 그대로(16항목)를 읽는다", () => {
    const table = parseAudioManifest(MEASURED_MANIFEST_TEXT);
    expect(table?.size).toBe(16);
    expect(table?.get("u03-mina/pre-2")).toEqual({ durationMs: 4894, speechEndMs: 4894 });
    expect(table?.get("u01-water/d-01")).toEqual({ durationMs: 1091, speechEndMs: 882 });
  });

  test.each([
    ["null", null],
    ["빈 문자열", ""],
    ["깨진 JSON", "{"],
    ["배열", "[]"],
    ["null 리터럴", "null"],
    ["숫자", "3"],
    ["schema 없음", JSON.stringify({ audio: {} })],
    ["audio-manifest-2", JSON.stringify({ schema: "audio-manifest-2", audio: {} })],
    ["대소문자 다름", JSON.stringify({ schema: "Audio-Manifest-1", audio: {} })],
    ["audio 없음", JSON.stringify({ schema: "audio-manifest-1" })],
    ["audio가 배열", wrap([])],
    ["audio가 null", wrap(null)],
    ["audio가 문자열", wrap("x")],
  ])("AM3. 파일 단위로 못 쓰면 null이고 던지지 않는다 - %s", (_name, text) => {
    expect(() => parseAudioManifest(text)).not.toThrow();
    expect(parseAudioManifest(text)).toBeNull();
  });

  test.each([
    ["duration 0", { duration_ms: 0 }],
    ["duration 음수", { duration_ms: -1 }],
    ["duration 소수", { duration_ms: 1.5 }],
    ["duration 문자열", { duration_ms: "2299" }],
    ["duration null", { duration_ms: null }],
    ["duration 없음", { speech_end_ms: 882 }],
    ["duration 안전 정수 밖", { duration_ms: 1e20 }],
    ["speech_end 0", { duration_ms: 2299, speech_end_ms: 0 }],
    ["speech_end 음수", { duration_ms: 2299, speech_end_ms: -5 }],
    ["speech_end 소수", { duration_ms: 2299, speech_end_ms: 882.5 }],
    ["speech_end 문자열", { duration_ms: 2299, speech_end_ms: "882" }],
    ["speech_end null", { duration_ms: 2299, speech_end_ms: null }],
    ["값이 숫자", 3],
    ["값이 배열", []],
    ["값이 null", null],
  ])("AM4. 값이 틀린 항목은 그 항목만 버린다 - %s", (_name, bad) => {
    expect(keysOf(wrap({ "u01-water/pre-3": GOOD, "u01-water/bad": bad }))).toEqual([
      "u01-water/pre-3",
    ]);
  });

  test.each([
    ["대문자", "U01/pre-3"],
    ["확장자", "u01-water/pre-3.m4a"],
    ["audio/ 접두", "audio/u01-water/pre-3"],
    ["공백", "u01 water"],
    ["빈 키", ""],
  ])("AM4. id 규약 밖 키는 그 항목만 버린다 - %s", (_name, key) => {
    expect(keysOf(wrap({ "u01-water/pre-3": GOOD, [key]: GOOD }))).toEqual(["u01-water/pre-3"]);
  });

  test("AM5. generated_at · 모르는 키는 무시하고, 빈 audio는 빈 표이며, speech_end가 넘쳐도 버리지 않는다", () => {
    for (const generatedAt of [undefined, 123, "엉뚱한 문자열"]) {
      const text = JSON.stringify({
        schema: "audio-manifest-1",
        generated_at: generatedAt,
        audio: { "u01-water/pre-3": GOOD },
      });
      expect(parseAudioManifest(text)?.size).toBe(1);
    }
    const extra = wrap(
      { "u01-water/pre-3": { ...GOOD, loudness: -16, note: "x" } },
      { future_field: { a: 1 } },
    );
    expect(parseAudioManifest(extra)?.get("u01-water/pre-3")).toEqual({
      durationMs: 2299,
      speechEndMs: 1763,
    });
    const empty = parseAudioManifest(wrap({}));
    expect(empty).not.toBeNull();
    expect(empty?.size).toBe(0);
    const over = parseAudioManifest(
      wrap({ "u01-water/pre-3": { duration_ms: 1000, speech_end_ms: 1200 } }),
    );
    expect(over?.get("u01-water/pre-3")).toEqual({ durationMs: 1000, speechEndMs: 1200 });
  });
});

describe("audioSyncLengthMs", () => {
  test("AM6. speech_end가 duration 이하면 speech_end, 없거나 넘치면 duration, 항목이 없으면 null", () => {
    expect(audioSyncLengthMs({ durationMs: 2299, speechEndMs: 1763 })).toBe(1763);
    expect(audioSyncLengthMs({ durationMs: 2027, speechEndMs: 2027 })).toBe(2027);
    expect(audioSyncLengthMs({ durationMs: 1000 })).toBe(1000);
    expect(audioSyncLengthMs({ durationMs: 1000, speechEndMs: 1200 })).toBe(1000);
    expect(audioSyncLengthMs(null)).toBeNull();
  });
});
