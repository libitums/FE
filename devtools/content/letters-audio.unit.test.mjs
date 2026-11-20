// `unit` 계층: 글자 소리 업로드 준비의 순수 함수(ADR-0172). `node --test devtools/content/*.test.mjs`.
import assert from "node:assert/strict";
import { test } from "node:test";

import { LETTER_SOUND_SYLLABLES, letterAudioIdOf } from "../../apps/mobile/src/lib/letters/jamo.ts";
import {
  elevenLabsRequestOf,
  letterSoundEntries,
  mergeAudioManifest,
  sha256SumsText,
  speechTimingOf,
} from "./letters-audio.mjs";

test("LAU1. 앱 목록 41개 → id · 버킷 경로 · 낭독 글자", () => {
  const entries = letterSoundEntries(LETTER_SOUND_SYLLABLES, letterAudioIdOf);
  assert.equal(entries.length, 41);
  assert.deepEqual(entries[0], {
    id: "letters/ga",
    syllable: "가",
    file: "ga.m4a",
    path: "audio/letters/ga.m4a",
  });
  assert.deepEqual(
    entries.slice(-2).map((entry) => entry.path),
    ["audio/letters/neo.m4a", "audio/letters/do.m4a"],
  );
  assert.equal(new Set(entries.map((entry) => entry.id)).size, 41);
  assert.ok(entries.some((entry) => entry.id === "letters/a" && entry.syllable === "아"));
});

test("LAU2. id가 없는 음절 · 겹치는 id는 멈춘다", () => {
  assert.throws(() => letterSoundEntries(["밥"], letterAudioIdOf), /밥/);
  assert.throws(() => letterSoundEntries(["가", "가"], letterAudioIdOf), /letters\/ga/);
});

const LIVE = `${JSON.stringify(
  {
    schema: "audio-manifest-1",
    generated_at: "2026-11-19T00:00:00Z",
    audio: {
      "level-3/u01-water/d-01": { duration_ms: 1091, speech_end_ms: 882 },
      "letters/ga": { duration_ms: 1, speech_end_ms: 1 },
    },
  },
  null,
  2,
)}\n`;

test("LAU3. 음성 정보 파일 합치기 — 기존 항목 그대로, letters 항목은 새 값, 시각 갱신, 2칸 들여쓰기 + 끝 줄바꿈", () => {
  const merged = mergeAudioManifest(
    LIVE,
    {
      "letters/ga": { duration_ms: 640, speech_end_ms: 560 },
      "letters/na": { duration_ms: 610, speech_end_ms: 530 },
    },
    "2026-11-20T09:00:00Z",
  );
  assert.ok(merged.endsWith("}\n"));
  const root = JSON.parse(merged);
  assert.equal(root.schema, "audio-manifest-1");
  assert.equal(root.generated_at, "2026-11-20T09:00:00Z");
  assert.deepEqual(Object.keys(root.audio), ["level-3/u01-water/d-01", "letters/ga", "letters/na"]);
  assert.deepEqual(root.audio["level-3/u01-water/d-01"], { duration_ms: 1091, speech_end_ms: 882 });
  assert.deepEqual(root.audio["letters/ga"], { duration_ms: 640, speech_end_ms: 560 });
  assert.equal(merged, `${JSON.stringify(root, null, 2)}\n`);
});

test("LAU4. 합치기는 스키마가 다르거나 letters 밖 id · 양의 정수가 아닌 값이면 멈춘다", () => {
  const timing = { "letters/ga": { duration_ms: 640, speech_end_ms: 560 } };
  assert.throws(() => mergeAudioManifest("{", timing, "t"), /JSON/);
  assert.throws(
    () => mergeAudioManifest(JSON.stringify({ schema: "x", audio: {} }), timing, "t"),
    /schema/,
  );
  assert.throws(
    () => mergeAudioManifest(LIVE, { "u01-water/d-01": { duration_ms: 1 } }, "t"),
    /letters\//,
  );
  assert.throws(
    () => mergeAudioManifest(LIVE, { "letters/ga": { duration_ms: 0 } }, "t"),
    /duration_ms/,
  );
  assert.throws(
    () => mergeAudioManifest(LIVE, { "letters/ga": { duration_ms: 500, speech_end_ms: 600 } }, "t"),
    /speech_end_ms/,
  );
});

test("LAU5. 말소리 끝 — 끝까지 이어지는 마지막 무음의 시작, 없으면 길이", () => {
  const log = [
    "[Parsed_silencedetect_0 @ 0x1] silence_start: 0",
    "[Parsed_silencedetect_0 @ 0x1] silence_end: 0.05 | silence_duration: 0.05",
    "[Parsed_silencedetect_0 @ 0x1] silence_start: 0.5604",
    "[Parsed_silencedetect_0 @ 0x1] silence_end: 0.64 | silence_duration: 0.0796",
  ].join("\n");
  assert.deepEqual(speechTimingOf(640, log), { duration_ms: 640, speech_end_ms: 560 });
  // 끝에 닫히지 않은 무음(ffmpeg는 끝까지 이어지면 silence_end를 쓰지 않기도 함).
  assert.deepEqual(speechTimingOf(700, "silence_start: 0.61"), {
    duration_ms: 700,
    speech_end_ms: 610,
  });
  // 중간 무음만 있고 끝은 말소리.
  assert.deepEqual(
    speechTimingOf(900, "silence_start: 0.2\nsilence_end: 0.4 | silence_duration: 0.2"),
    { duration_ms: 900, speech_end_ms: 900 },
  );
  assert.deepEqual(speechTimingOf(640, ""), { duration_ms: 640, speech_end_ms: 640 });
  assert.throws(() => speechTimingOf(0, ""), /duration/);
});

test("LAU6. sha256 목록 — `sha256  경로` 줄, 경로 순", () => {
  assert.equal(
    sha256SumsText([
      { path: "audio/letters/na.m4a", sha256: "b".repeat(64) },
      { path: "audio/letters/ga.m4a", sha256: "a".repeat(64) },
    ]),
    `${"a".repeat(64)}  audio/letters/ga.m4a\n${"b".repeat(64)}  audio/letters/na.m4a\n`,
  );
  assert.throws(() => sha256SumsText([{ path: "x", sha256: "nope" }]), /sha256/);
});

test("LAU7. ElevenLabs 요청 — 목소리 · 모델 · 키 머리, 키가 없으면 멈추고 메시지에 키 값을 싣지 않는다", () => {
  const request = elevenLabsRequestOf({
    text: "가",
    voiceId: "voice123",
    modelId: "eleven_multilingual_v2",
    apiKey: "secret-key",
  });
  assert.equal(
    request.url,
    "https://api.elevenlabs.io/v1/text-to-speech/voice123?output_format=mp3_44100_128",
  );
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.headers["xi-api-key"], "secret-key");
  assert.equal(request.init.headers["content-type"], "application/json");
  assert.deepEqual(JSON.parse(request.init.body), {
    text: "가",
    model_id: "eleven_multilingual_v2",
  });
  assert.throws(
    () => elevenLabsRequestOf({ text: "가", voiceId: "v", modelId: "m", apiKey: "" }),
    /ELEVENLABS_API_KEY/,
  );
  assert.throws(
    () => elevenLabsRequestOf({ text: "가", voiceId: "../x", modelId: "m", apiKey: "k" }),
    (error) => /VOICE_ID/.test(error.message) && !error.message.includes("../x"),
  );
});
