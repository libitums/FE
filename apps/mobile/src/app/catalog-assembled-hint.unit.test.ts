import { describe, expect, test } from "vitest";

import type { LearningItem } from "../lib/episode-content.model";
import { listenBuildItemOf, syllableBuildItemOf } from "./catalog-build-map";
import { catalogItemOf } from "./catalog-item-map";
import type { CatalogMappedItem } from "./catalog-lesson-types";
import { shuffledOrder } from "./catalog-shuffle";
import { portOf, syllableBuild, t } from "./catalog-screens.test-support";

// `unit` 계층: 조립 문항 매핑이 싣는 타일 로마자 · 힌트(ADR-0153, 팀 요청 ①②③).

const port = portOf();
const questionOf = (mapped: CatalogMappedItem): Record<string, unknown> =>
  (Reflect.get(mapped, "question") ?? {}) as Record<string, unknown>;

describe("음절 조립 (AHM1~3)", () => {
  const item = syllableBuild({
    tiles: [t("카", "ka"), t("드", "deu"), t("찮", "chan"), t("현", "hyeon")],
  });

  test("AHM1. 모든 타일에 로마자가 있으면 표시 순서의 타일 로마자를 늘 싣는다", () => {
    const question = questionOf(syllableBuildItemOf(item, port));
    const tiles = question.tiles as string[];
    const romanOf: Record<string, string> = { 카: "ka", 드: "deu", 찮: "chan", 현: "hyeon" };
    expect(question.tileReading).toEqual({
      values: tiles.map((tile) => romanOf[tile]),
      shown: "always",
    });
  });

  test("AHM2. 힌트의 흐린 글자는 칸마다 정답 조각이다", () => {
    expect(questionOf(syllableBuildItemOf(item, port)).hint).toEqual({ ghost: ["카", "드"] });
  });

  test("AHM3. 타일 하나라도 로마자가 없으면 타일 로마자를 싣지 않는다(힌트는 선다)", () => {
    const question = questionOf(syllableBuildItemOf(syllableBuild(), port));
    expect(question).not.toHaveProperty("tileReading");
    expect(question.hint).toEqual({ ghost: ["카", "드"] });
  });
});

describe("문장 조립 · 듣고 조립 (AHM4~6)", () => {
  const wordOrder: LearningItem = {
    id: "S6-04",
    event: "R",
    type: "WORD_ORDER",
    prompt: { ko: "문장을 만드세요.", en: "Build the sentence." },
    stimulus: { en: "Thank you. Goodbye." },
    tiles: [t("감사합니다.", "gamsahamnida."), t("안녕히", "annyeonghi"), t("가세요.", "gaseyo.")],
    answers: [
      t("감사합니다. 안녕히 가세요.", "gamsahamnida. annyeonghi gaseyo.", "Thank you. Goodbye."),
    ],
  } as LearningItem;

  test("AHM4. 문장 조립은 조각 로마자를 표시 순서로 늘 싣고, 힌트는 정답 문장 하나다", () => {
    const question = questionOf(catalogItemOf(wordOrder, port));
    const order = shuffledOrder("u01-water/S6-04", 3);
    const romans = ["gamsahamnida.", "annyeonghi", "gaseyo."];
    expect(question.chipReading).toEqual({ values: order.map((i) => romans[i]), shown: "always" });
    expect(question.hint).toEqual({ ghost: ["감사합니다. 안녕히 가세요."] });
  });

  test("AHM5. 듣고 조립은 조각 로마자를 다시 풀기 전용으로 싣고 힌트가 없다", () => {
    const listen = {
      id: "S2-02",
      event: "R",
      type: "LISTEN_BUILD",
      prompt: { ko: "듣고 만드세요.", en: "Listen and build." },
      stimulus: { audio: t("가 나", "ga na", "GaNa"), audioUrl: "level-3/u00/a" },
      tiles: [t("가", "ga"), t("나", "na"), t("다", "da")],
      answers: [t("가 나", "ga na")],
    } as LearningItem;
    const audioPort = { ...port, audioUrlOf: (path: string) => `https://cdn/${path}.m4a` };
    const question = questionOf(
      listenBuildItemOf(listen as Extract<LearningItem, { type: "LISTEN_BUILD" }>, audioPort),
    );
    expect(question.chipReading).toMatchObject({ shown: "review" });
    expect(question).not.toHaveProperty("hint");
  });

  test("AHM6. 정답 소리가 있으면 힌트에 듣기 주소가 실린다", () => {
    const audioPort = { ...port, audioUrlOf: (path: string) => `https://cdn/${path}.m4a` };
    const withAudio = syllableBuild({
      stimulus: { en: "card", audioUrl: "u01-water/s1-04-word", imageUrl: "" },
    });
    const hint = questionOf(syllableBuildItemOf(withAudio, audioPort)).hint as Record<
      string,
      unknown
    >;
    expect(String(hint.listenSource)).toContain("u01-water/s1-04-word");
  });
});
