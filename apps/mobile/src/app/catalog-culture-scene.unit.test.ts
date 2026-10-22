import { describe, expect, test, vi } from "vitest";

import { decodeEpisode } from "../lib/episode-content";
import type { LearningItem, LearningUnit } from "../lib/episode-content.model";
import { bundledCatalogInput } from "../lib/episode-bundled";
import {
  catalogCultureCardFor,
  catalogCultureSceneOf,
  cultureCheckItemOf,
  quotedLineOf,
} from "./catalog-culture-map";
import type { CatalogLessonItemPort, CultureCardItem } from "./catalog-lesson-types";
import { cultureCard, cultureCheck, portOf, t } from "./catalog-screens.test-support";

// `unit` 계층: 문화 확인의 짝 문화 카드 · 대사 · 장면 · 문항 매핑의 입출력만 봅니다(순수 함수).
// 실데이터는 내장 u00 · u01입니다.

function unitsOf(episodeId: keyof typeof bundledCatalogInput.episodes): readonly LearningUnit[] {
  const result = decodeEpisode(bundledCatalogInput.episodes[episodeId]);
  if (!result.ok) throw new Error(`bundled episode failed to decode: ${episodeId}`);
  return result.episode.units;
}

function itemOf(units: readonly LearningUnit[], unitId: string, itemId: string): LearningItem {
  const found = units.find((unit) => unit.id === unitId)?.items.find((item) => item.id === itemId);
  if (found === undefined) throw new Error(`missing item ${unitId}/${itemId}`);
  return found;
}

function cardOf(units: readonly LearningUnit[], unitId: string, itemId: string): CultureCardItem {
  const item = itemOf(units, unitId, itemId);
  if (item.type !== "CULTURE_CARD") throw new Error(`not a culture card: ${itemId}`);
  return item;
}

function checkOf(units: readonly LearningUnit[], unitId: string, itemId: string) {
  const item = itemOf(units, unitId, itemId);
  if (item.type !== "CULTURE_CHECK") throw new Error(`not a culture check: ${itemId}`);
  return item;
}

const u00Units = unitsOf("u00-tutorial");
const u01Units = unitsOf("u01-water");

// 테스트 안 상수 — u00 S12 카드가 감싼 대사입니다.
const quoted = {
  ko: "한국어 잘하시네요!",
  roman: "hangugeo jalhasineyo!",
  en: "Your Korean is so good!",
};

function unit(id: string, order: number, items: LearningItem[]): LearningUnit {
  return { id, order, items };
}

function card(id: string): LearningItem {
  return cultureCard({ id });
}

function check(id: string): LearningItem {
  return cultureCheck({ id });
}

describe("catalogCultureCardFor (CM1 ~ CM3)", () => {
  test("CM1. u00 S13-01의 짝은 바로 앞 단계 S12-01이다", () => {
    expect(catalogCultureCardFor(u00Units, "S13", "S13-01")?.id).toBe("S12-01");
  });

  test("CM2. u01 CULT-04 · 05 · 06의 짝은 같은 단계 CULT-01 · 02 · 03이다", () => {
    expect(catalogCultureCardFor(u01Units, "CULT", "CULT-04")?.id).toBe("CULT-01");
    expect(catalogCultureCardFor(u01Units, "CULT", "CULT-05")?.id).toBe("CULT-02");
    expect(catalogCultureCardFor(u01Units, "CULT", "CULT-06")?.id).toBe("CULT-03");
  });

  test("CM3. 카드보다 확인이 많으면 마지막 카드와 짝이다", () => {
    const units = [
      unit("C", 1, [card("A-1"), card("A-2"), check("K-1"), check("K-2"), check("K-3")]),
    ];

    expect(catalogCultureCardFor(units, "C", "K-3")?.id).toBe("A-2");
    expect(catalogCultureCardFor(units, "C", "K-1")?.id).toBe("A-1");
  });

  test("CM3. 같은 단계에도 바로 앞 단계에도 카드가 없으면 null이다", () => {
    const units = [unit("A", 1, [check("K-1")]), unit("B", 2, [check("K-2")])];

    expect(catalogCultureCardFor(units, "B", "K-2")).toBeNull();
  });

  test("CM3. 카드가 바로 앞이 아니라 둘 전 단계에 있으면 null이다", () => {
    const units = [
      unit("A", 1, [card("A-1")]),
      unit("B", 2, [check("B-0")]),
      unit("C", 3, [check("K-1")]),
    ];

    expect(catalogCultureCardFor(units, "C", "K-1")).toBeNull();
  });

  test("CM3. 모르는 단계나 문항이면 null이다", () => {
    expect(catalogCultureCardFor(u01Units, "NOPE", "CULT-04")).toBeNull();
    expect(catalogCultureCardFor(u01Units, "CULT", "NOPE")).toBeNull();
  });
});

describe("quotedLineOf (CM4)", () => {
  test("u00 카드 제목은 따옴표를 벗긴 대사 셋이다", () => {
    const context = cardOf(u00Units, "S12", "S12-01").context;
    expect(context).toBeDefined();
    if (context === undefined) return;

    expect(quotedLineOf(context)).toEqual(quoted);
  });

  test("u01 주제 제목은 대사가 아니라 null이다", () => {
    const context = cardOf(u01Units, "CULT", "CULT-01").context;
    expect(context).toBeDefined();
    if (context === undefined) return;

    expect(quotedLineOf(context)).toBeNull();
  });

  test("여는 괄호만 있고 닫는 괄호가 없으면 null이다", () => {
    expect(quotedLineOf(t("「한국어 잘하시네요!", "x", "y"))).toBeNull();
    expect(quotedLineOf(t("「1+1」 스티커", "x", "y"))).toBeNull();
  });

  test("영어의 바깥 따옴표(곧은 것 · 굽은 것)를 벗긴다", () => {
    const straight = quotedLineOf(t("「안녕」", "「annyeong」", '"Hello!"'));
    const curly = quotedLineOf(t("「안녕」", "「annyeong」", "“Hello!”"));

    expect(straight).toEqual({ ko: "안녕", roman: "annyeong", en: "Hello!" });
    expect(curly).toEqual({ ko: "안녕", roman: "annyeong", en: "Hello!" });
  });
});

describe("catalogCultureSceneOf (CM5)", () => {
  const u00Card = cardOf(u00Units, "S12", "S12-01");
  const u00Port: CatalogLessonItemPort = { ...portOf(), episodeId: "u00-tutorial" };

  test("대사 카드는 그림 주소와 대사로 장면을 만든다", () => {
    const imageUrlOf = vi.fn((path: string) => `https://cdn/${path}`);
    const scene = catalogCultureSceneOf(u00Card, { ...u00Port, imageUrlOf });

    expect(u00Card.stimulus.imageUrl).toContain("cult-u00-jalhasineyo.webp");
    expect(imageUrlOf).toHaveBeenCalledWith(u00Card.stimulus.imageUrl);
    expect(scene).toEqual({
      imageUrl: `https://cdn/${u00Card.stimulus.imageUrl}`,
      line: { ko: quoted.ko, romanization: quoted.roman, meaning: quoted.en },
    });
  });

  test("그림을 못 풀면 imageUrl만 null이고 대사는 그대로다", () => {
    const scene = catalogCultureSceneOf(u00Card, { ...u00Port, imageUrlOf: () => null });

    expect(scene?.imageUrl).toBeNull();
    expect(scene?.line.ko).toBe(quoted.ko);
  });

  test("대사가 아닌 카드와 카드 없음은 null이다", () => {
    expect(catalogCultureSceneOf(cardOf(u01Units, "CULT", "CULT-01"), u00Port)).toBeNull();
    expect(catalogCultureSceneOf(null, u00Port)).toBeNull();
  });
});

describe("cultureCheckItemOf (CM6, CM7)", () => {
  function questionOf(mapped: unknown): Record<string, unknown> {
    return Reflect.get(mapped as object, "question") as Record<string, unknown>;
  }

  test("CM6. u00 S13 — 장면 · 지시문 · 해설 · 보기 뜻을 싣는다", () => {
    const item = checkOf(u00Units, "S13", "S13-01");
    const pair = cardOf(u00Units, "S12", "S12-01");
    const port: CatalogLessonItemPort = {
      ...portOf(),
      episodeId: "u00-tutorial",
      cultureCardOf: (itemId) => (itemId === item.id ? pair : null),
    };

    const question = questionOf(cultureCheckItemOf(item, port));

    expect(question["instruction"]).toBe("What do you say?");
    expect(question["culture"]).toMatchObject({
      scene: { line: { ko: quoted.ko, romanization: quoted.roman, meaning: quoted.en } },
      explanation: { en: item.feedback?.correct.en, ko: item.feedback?.correct.ko },
    });
    expect(question["choiceTranslations"]).toEqual([
      "Thanks for the meal!",
      "Hello!",
      "Thank you!",
    ]);
    expect(question["choices"]).toEqual(["잘 먹겠습니다!", "안녕하세요!", "감사합니다!"]);
    expect(question["answerIndex"]).toBe(2);
  });

  test("CM7. 포트에 짝 카드 조회가 없으면 장면 없이 질문 카드다", () => {
    const item = checkOf(u01Units, "CULT", "CULT-04");

    const question = questionOf(cultureCheckItemOf(item, portOf()));

    expect(question["instruction"]).toBe(item.prompt.en);
    expect(question["culture"]).toMatchObject({
      scene: null,
      explanation: { en: item.feedback?.correct.en, ko: item.feedback?.correct.ko },
    });
  });

  test("CM7. 짝 카드가 대사가 아니면 u01 CULT-04도 장면이 없다", () => {
    const item = checkOf(u01Units, "CULT", "CULT-04");
    const pair = cardOf(u01Units, "CULT", "CULT-01");
    const port: CatalogLessonItemPort = { ...portOf(), cultureCardOf: () => pair };

    const question = questionOf(cultureCheckItemOf(item, port));

    expect(questionOf(cultureCheckItemOf(item, port))["culture"]).toMatchObject({ scene: null });
    expect(question["instruction"]).toBe(item.prompt.en);
  });
});
