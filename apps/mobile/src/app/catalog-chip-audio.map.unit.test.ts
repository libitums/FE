import { describe, expect, test } from "vitest";

import type { LearningItem } from "../lib/episode-content.model";
import { audioPortOf, listenBuildItem, wordOrder } from "./catalog-item-audio.test-support";
import { catalogItemOf } from "./catalog-item-map";
import type { CatalogLessonItemPort, CatalogMappedItem } from "./catalog-lesson-types";
import { opt, t } from "./catalog-screens.test-support";

// `unit` 계층: 레슨 매핑이 단어 고르기 보기 · 조립 조각에 낱말 소리를 싣는다(ADR-0189). 녹음 색인은 대역입니다.

const sourceOf = (id: string): string => `https://cdn/audio/${id}.m4a`;
const prompt = t("고르세요.", undefined, "Pick one.");
const fb = { correct: t("맞아요", undefined, "Right") };

const RECORDED: Record<string, string> = {
  "저는 호주에서 왔어요.": "u03-mina/d-04",
  물이: "u01-water/word-muri",
  "안녕하세요.": "u03-mina/d-01",
  "반가워요.": "u03-mina/d-02",
  가나: "u00/gana",
};

const port = (): CatalogLessonItemPort => ({
  ...audioPortOf(),
  recordedAudioOf: (ko) => (RECORDED[ko.trim()] === undefined ? [] : [RECORDED[ko.trim()]]),
});

const fieldOf = (mapped: CatalogMappedItem, key: string): unknown =>
  mapped.kind === "skipped"
    ? `skipped:${mapped.reason}`
    : (mapped.question as unknown as Record<string, unknown>)[key];

const roleLine: LearningItem = {
  id: "S2-03",
  event: "R",
  type: "ROLE_LINE",
  prompt,
  context: t("어느 나라에서 왔어요?", "eoneu nara", "Where from?"),
  options: [opt("o1", "저는 학생이에요.", false), opt("o2", "저는 호주에서 왔어요.", true)],
  feedback: fb,
};

describe("단어 고르기 보기 소리(choiceAudio)", () => {
  test("CM1. 보기 순서대로 녹음 주소, 녹음 없는 보기는 null", () => {
    expect(fieldOf(catalogItemOf(roleLine, port()), "choiceAudio")).toEqual([
      null,
      sourceOf("u03-mina/d-04"),
    ]);
  });

  test("CM2. 보기 하나도 녹음이 없으면 키가 없다", () => {
    const mapped = catalogItemOf(roleLine, { ...port(), recordedAudioOf: () => [] });
    expect(mapped.kind).toBe("word-choice");
    expect(fieldOf(mapped, "choiceAudio")).toBeUndefined();
  });
});

describe("조립 조각 소리(chipAudio)", () => {
  test("CM3. 문장 순서 조각마다 녹음 주소(섞인 창고 순서 = chips 순서)", () => {
    const mapped = catalogItemOf(wordOrder(), port());
    const chips = fieldOf(mapped, "chips") as readonly string[];
    expect(fieldOf(mapped, "chipAudio")).toEqual(
      chips.map((chip) => (chip === "물이" ? sourceOf("u01-water/word-muri") : null)),
    );
  });

  test("CM4. 대화 순서 조각(줄)도 녹음 주소 — 고정된 첫 줄은 창고에 없어 빠진다", () => {
    const turnOrder: LearningItem = {
      id: "S4-01",
      event: "R",
      type: "TURN_ORDER",
      prompt,
      context: t("대화를 완성하세요.", undefined, "Complete it."),
      tiles: [t("안녕하세요."), t("반가워요."), t("네, 저도요.")],
      answer: [0, 1, 2],
    };
    const mapped = catalogItemOf(turnOrder, port());
    const chips = fieldOf(mapped, "chips") as readonly string[];
    expect(chips).not.toContain("안녕하세요.");
    expect(fieldOf(mapped, "chipAudio")).toEqual(
      chips.map((chip) => (chip === "반가워요." ? sourceOf("u03-mina/d-02") : null)),
    );
  });

  test("CM5. 듣고 조립 조각은 소리를 싣지 않는다 — 듣기 문항이라 낱말 소리가 답을 들려준다", () => {
    expect(fieldOf(catalogItemOf(listenBuildItem(), port()), "chipAudio")).toBeUndefined();
  });
});
