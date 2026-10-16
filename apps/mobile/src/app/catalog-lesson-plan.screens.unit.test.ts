import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import type { CatalogEntry } from "../lib/episode-catalog";
import type { LearningItem } from "../lib/episode-content.model";
import { fillPlaceholders } from "../lib/placeholder-fill";
import { judgeAssessment } from "../screens/assessment/assessment";
import { catalogLessonPlanOf, catalogPassCriterion } from "./catalog-lesson-plan";
import type { CatalogFill } from "./catalog-lesson-plan";
import {
  clozeChoice,
  cultureCard,
  cultureCheck,
  listenBuild,
  syllableBuild,
} from "./catalog-screens.test-support";

// `unit` 계층: 문화 카드 · 음절 조립이 끼는 단계의 묶음 · 채점 수 · 표시 수 · 건너뜀 수만 봅니다.

type ReadyEntry = Extract<CatalogEntry, { status: "ready" }>;

const catalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const fill: CatalogFill = (text, script) => fillPlaceholders(text, {}, script);
const noImageUrl = (): null => null;

function entryWith(items: readonly LearningItem[]): ReadyEntry {
  const source = catalog.find((candidate) => candidate.id === "u01-water");
  if (source === undefined || source.status !== "ready") throw new Error("u01이 ready가 아닙니다");
  return {
    ...source,
    episode: { ...source.episode, units: [{ id: "S1", order: 1, items: [...items] }] },
  };
}

const planOf = (items: readonly LearningItem[]) => {
  const plan = catalogLessonPlanOf(entryWith(items), "S1", fill, noImageUrl);
  if (plan === null) throw new Error("계획이 없습니다");
  return plan;
};
const shapeOf = (items: readonly LearningItem[]) =>
  planOf(items).activities.map((activity) => [activity.form, activity.questions.length]);

const numbered = (count: number, make: (id: string) => LearningItem, prefix: string) =>
  Array.from({ length: count }, (_, index) => make(`${prefix}${String(index + 1)}`));
const cards = (count: number) => numbered(count, (id) => cultureCard({ id }), "CULT-0");
const checks = (count: number) => numbered(count, (id) => cultureCheck({ id }), "CULT-1");

describe("문화 카드 · 문화 확인 단계의 계획 (PL)", () => {
  test("PL1. 문화 카드 3 + 문화 확인 3은 활동 둘이고 채점 3 · 표시 6 · 건너뜀 0이다", () => {
    const plan = planOf([...cards(3), ...checks(3)]);

    expect(plan.activities.map((activity) => [activity.form, activity.questions.length])).toEqual([
      ["culture-card", 3],
      ["word-choice", 3],
    ]);
    expect(plan.questionCount).toBe(3);
    expect(plan.shownItemCount).toBe(6);
    expect(plan.skippedItemCount).toBe(0);
  });

  test("PL1. 이 단계의 통과 기준은 확인 셋 중 둘이다", () => {
    const plan = planOf([...cards(3), ...checks(3)]);

    expect(catalogPassCriterion(plan.questionCount).minCorrectCount).toBe(2);
  });

  test("PL2. 문화 카드뿐인 단계는 채점 0 · 표시는 카드 수 · 활동 하나이고 빈 결과로 통과한다", () => {
    const plan = planOf(cards(3));

    expect(plan.activities.map((activity) => [activity.form, activity.questions.length])).toEqual([
      ["culture-card", 3],
    ]);
    expect(plan).toMatchObject({ questionCount: 0, shownItemCount: 3, skippedItemCount: 0 });
    expect(judgeAssessment([], catalogPassCriterion(plan.questionCount))).toBe("passed");
  });

  test("PL3. 건너뜀이 사이에 끼면 같은 학습형이 이어진다 — 단어 선택 · 음절 조립 둘 · 단어 선택", () => {
    const items = [
      clozeChoice("S1-01"),
      syllableBuild({ id: "S1-02" }),
      listenBuild("S1-03"),
      syllableBuild({ id: "S1-04" }),
      clozeChoice("S1-05"),
    ];

    expect(shapeOf(items)).toEqual([
      ["word-choice", 1],
      ["syllable-build", 2],
      ["word-choice", 1],
    ]);
    const plan = planOf(items);
    expect(plan).toMatchObject({ questionCount: 4, shownItemCount: 4, skippedItemCount: 1 });
  });

  test("PL3. 음절 조립은 채점 문항으로 센다", () => {
    const plan = planOf([syllableBuild({ id: "A" }), syllableBuild({ id: "B" })]);

    expect(plan).toMatchObject({ questionCount: 2, shownItemCount: 2, skippedItemCount: 0 });
  });
});
