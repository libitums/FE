import { describe, expect, test } from "vitest";

import type { LearningItem } from "../lib/episode-content.model";
import { catalogItemOf } from "./catalog-item-map";
import type { CatalogMappedItem } from "./catalog-lesson-types";
import { opt, portOf, t } from "./catalog-screens.test-support";

// `unit` 계층: 측정 `selectedAnswer`가 쓰는 원문 배열(치환 전) — 학습자 이름 · 나라가 분석 도구로 가지 않게(#449 리뷰 C1).

const nameFill = (text: string) => text.replaceAll("{이름}", "Max").replaceAll("{나라}", "Brazil");
const port = portOf({ fill: (text) => nameFill(text) });
const questionOf = (mapped: CatalogMappedItem): Record<string, unknown> =>
  (Reflect.get(mapped, "question") ?? {}) as Record<string, unknown>;

describe("치환 전 원문 (SS1 · SS2)", () => {
  test("SS1. 대답 고르기 보기는 화면에 치환된 글자, 원문 배열에는 {이름}이 그대로 남는다", () => {
    const item = {
      id: "S8-03",
      event: "R",
      type: "REPLY_SELECT",
      prompt: { ko: "대답하세요.", en: "Reply." },
      stimulus: { audio: t("성함이요?", "seonghamiyo?", "Your name?") },
      options: [opt("o1", "{이름}(으)로 예약했어요.", true), opt("o2", "네, 맞아요.", false)],
    } as unknown as LearningItem;
    const question = questionOf(catalogItemOf(item, port));
    expect(question.choices).toEqual(["Max(으)로 예약했어요.", "네, 맞아요."]);
    expect(question.choicesSource).toEqual(["{이름}(으)로 예약했어요.", "네, 맞아요."]);
  });

  test("SS2. 문장 조립 조각 원문은 표시 순서이고 {이름}이 그대로 남는다", () => {
    const item = {
      id: "S8-01",
      event: "R",
      type: "WORD_ORDER",
      prompt: { ko: "문장을 만드세요.", en: "Build." },
      stimulus: { en: "I booked under my name." },
      tiles: [t("{이름}(으)로"), t("예약했어요.")],
      answers: [t("{이름}(으)로 예약했어요.", undefined, "I booked under my name.")],
    } as unknown as LearningItem;
    const question = questionOf(catalogItemOf(item, port));
    const chips = question.chips as string[];
    const source = question.chipsSource as string[];
    expect(chips).toContain("Max(으)로");
    expect(source).toEqual(chips.map((chip) => chip.replace("Max", "{이름}")));
    expect(source.join(" ")).not.toContain("Max");
  });
});
