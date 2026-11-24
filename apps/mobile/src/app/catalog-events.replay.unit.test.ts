import { describe, expect, test } from "vitest";

import { lessonSoundUsedEventOf, storySentenceReplayedEventOf } from "./catalog-events";

// `unit` 계층: 다시 듣기 · 칩 소리 측정 이벤트의 모양(ADR-0188, 이름 규칙 ADR-0029).

describe("storySentenceReplayedEventOf", () => {
  test.each(["prologue", "epilogue", "interlude"] as const)(
    "RE1. 이야기 컷(%s)의 다시 듣기 — surface story_cut · stage",
    (stage) => {
      expect(storySentenceReplayedEventOf("u01-water", stage)).toEqual({
        name: "sentence_audio_replayed",
        episodeId: "u01-water",
        surface: "story_cut",
        stage,
      });
    },
  );
});

describe("lessonSoundUsedEventOf", () => {
  test("RE2. 레슨 판정 뒤 다시 듣기 — surface lesson_answer · unitKey", () => {
    expect(lessonSoundUsedEventOf("u01-water", "S3", { kind: "answer-replayed" })).toEqual({
      name: "sentence_audio_replayed",
      episodeId: "u01-water",
      surface: "lesson_answer",
      unitKey: "S3",
    });
  });

  test.each(["word_choice", "sentence_order"] as const)(
    "RE3. 칩 소리(%s) — choice_chip_sound_played",
    (surface) => {
      expect(lessonSoundUsedEventOf("u02-checkin", "S5", { kind: "chip-sound", surface })).toEqual({
        name: "choice_chip_sound_played",
        episodeId: "u02-checkin",
        unitKey: "S5",
        surface,
      });
    },
  );
});
