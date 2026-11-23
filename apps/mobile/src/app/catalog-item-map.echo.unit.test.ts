import { describe, expect, test } from "vitest";

import type { LearningItem } from "../lib/episode-content.model";
import { audioPortOf, AUDIO_SOURCE, replySelect } from "./catalog-item-audio.test-support";
import { catalogItemOf } from "./catalog-item-map";
import type { CatalogLessonItemPort, CatalogMappedItem } from "./catalog-lesson-types";
import { opt, t } from "./catalog-screens.test-support";

// `unit` 계층: 레슨 문항 매핑이 자기 음성이 없는 유형에도 정답 뒤 음성을 싣는다(ADR-0172). 색인은 대역입니다.

const prompt = t("고르세요.", undefined, "Pick one.");
const fb = { correct: t("맞아요", undefined, "Right") };
const sourceOf = (id: string): string => `https://cdn/audio/${id}.m4a`;

const RECORDED: Record<string, string> = {
  "저는 호주에서 왔어요.": "u03-mina/d-04",
  "저는 학생이에요.": "u03-mina/d-05",
  "물 주세요.": "u01-water/d-02",
  "미나 씨는 어느 나라에서 왔어요?": "u03-mina/d-03",
  "미나 씨": "u03-mina/s1-02-word",
  "두 개 주세요.": "u01-water/d-06",
  "네, 괜찮아요.": "u05/d-08",
};

const port = (): CatalogLessonItemPort => ({
  ...audioPortOf(),
  recordedAudioOf: (ko) => (RECORDED[ko] === undefined ? [] : [RECORDED[ko]]),
});

const audioOf = (mapped: CatalogMappedItem): unknown =>
  mapped.kind === "skipped"
    ? `skipped:${mapped.reason}`
    : (mapped.question as { audio?: unknown }).audio;

const echo = (id: string) => ({ kind: "answer-echo", source: sourceOf(id) });

const cases: readonly (readonly [string, LearningItem, string])[] = [
  [
    "ROLE_LINE",
    {
      id: "S2-03",
      event: "R",
      type: "ROLE_LINE",
      prompt,
      context: t("어느 나라에서 왔어요?", "eoneu nara", "Where from?"),
      options: [opt("o1", "저는 학생이에요.", false), opt("o2", "저는 호주에서 왔어요.", true)],
      feedback: fb,
    },
    "u03-mina/d-04",
  ],
  [
    "CLOZE",
    {
      id: "S1-06",
      event: "E",
      type: "CLOZE",
      prompt,
      context: t("저는 ___이에요.", "jeoneun ___ieyo.", "I'm a student."),
      tiles: [t("학생", "haksaeng"), t("나라", "nara")],
      answers: [t("학생", "haksaeng")],
    },
    "u03-mina/d-05",
  ],
  [
    "CLOZE_CHOICE",
    {
      id: "C1",
      event: "R",
      type: "CLOZE_CHOICE",
      prompt,
      context: t("___ 주세요.", "___ juseyo.", "Water, please."),
      options: [opt("o1", "물", true), opt("o2", "불", false)],
      answers: [t("물")],
    },
    "u01-water/d-02",
  ],
  [
    "PARTICLE_FILL",
    {
      id: "S5-01",
      event: "R",
      type: "PARTICLE_FILL",
      prompt,
      stimulus: { text: t("미나 씨___ 어느 나라에서 왔어요?", "mina ssi___", "Mina, where from?") },
      options: [opt("o1", "는", true), opt("o2", "은", false)],
      feedback: fb,
    },
    "u03-mina/d-03",
  ],
  [
    "CULTURE_CHECK",
    {
      id: "CULT-04",
      event: "R",
      type: "CULTURE_CHECK",
      prompt,
      context: t("어떻게 부를까요?", "eotteoke", "How do you call her?"),
      options: [opt("o1", "미나야", false), opt("o2", "미나 씨", true)],
      feedback: fb,
    },
    "u03-mina/s1-02-word",
  ],
  [
    "CLOZE_TYPING",
    {
      id: "T1",
      event: "R",
      type: "CLOZE_TYPING",
      prompt,
      context: t("두 ___ 주세요.", "du ___ juseyo.", "Two, please."),
      answers: [t("개", "gae", "piece")],
    },
    "u01-water/d-06",
  ],
  [
    "SENT_BUILD",
    {
      id: "B1",
      event: "R",
      type: "SENT_BUILD",
      prompt,
      context: t("N 주세요"),
      answers: [t("물 주세요.", "mul juseyo.", "Water, please.")],
    },
    "u01-water/d-02",
  ],
];

describe("catalogItemOf — 자기 음성이 없는 유형의 정답 뒤 음성", () => {
  test.each(cases)("IM1. %s는 정답 원문의 녹음을 정답 뒤 음성으로 싣는다", (_type, item, id) => {
    expect(audioOf(catalogItemOf(item, port()))).toEqual(echo(id));
  });

  test.each(cases)("IM2. %s는 색인이 없는 포트면 지금처럼 소리가 없다", (_type, item) => {
    const mapped = catalogItemOf(item, audioPortOf());
    expect(mapped.kind).not.toBe("skipped");
    expect(audioOf(mapped) ?? null).toBeNull();
  });

  test("IM3. REPLY_SELECT는 상대 말 듣기에 정답 대답 음성을 싣는다", () => {
    const item = {
      ...replySelect(),
      options: [opt("o1", "네, 괜찮아요.", true), opt("o2", "혼자예요.", false)],
    };
    expect(audioOf(catalogItemOf(item, port()))).toEqual({
      kind: "listen",
      source: AUDIO_SOURCE,
      ref: { itemId: item.id, itemType: "REPLY_SELECT" },
      echo: { kind: "answer-echo", source: sourceOf("u05/d-08") },
    });
  });
});
