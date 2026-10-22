import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import type { CatalogEntry } from "../lib/episode-catalog";
import { fillPlaceholders } from "../lib/placeholder-fill";
import { catalogActivityItemRefsOf } from "./catalog-activity-join";
import type { CatalogPlannedItem } from "./catalog-activity-join";
import { catalogLessonCastOf, catalogLessonPlanOf } from "./catalog-lesson-plan";
import type { CatalogFill, CatalogLessonPlan, CatalogMappedItem } from "./catalog-lesson-types";

// `unit` 계층: 레슨 계획이 더한 문항 ref 묶음 · 상대 아바타 주소 · 출연진의 입출력만 봅니다.
// 실데이터는 내장 u00 · u01 · u03입니다.

type ReadyEntry = Extract<CatalogEntry, { status: "ready" }>;

const fill: CatalogFill = (text, script) => fillPlaceholders(text, {}, script);
const cdn = (path: string): string => `https://cdn/${path}`;
const noImageUrl = (): null => null;

function catalogOf(bundled: typeof bundledCatalogInput): readonly CatalogEntry[] {
  return buildEpisodeCatalog({ bundled, cache: { manifest: null, episodes: {} } });
}

function readyIn(catalog: readonly CatalogEntry[], episodeId: string): ReadyEntry {
  const entry = catalog.find((candidate) => candidate.id === episodeId);
  if (entry === undefined || entry.status !== "ready") throw new Error(`${episodeId} not ready`);
  return entry;
}

const bundledCatalog = catalogOf(bundledCatalogInput);

function planOf(
  entry: ReadyEntry,
  unitKey: string,
  imageUrlOf: (path: string) => string | null = cdn,
): CatalogLessonPlan {
  const plan = catalogLessonPlanOf(entry, unitKey, fill, imageUrlOf, (path) =>
    imageUrlOf(`audio/${path}`),
  );
  if (plan === null) throw new Error(`no plan: ${entry.id}/${unitKey}`);
  return plan;
}

function wordChoice(itemId: string): CatalogMappedItem {
  return {
    kind: "word-choice",
    itemId,
    question: { prompt: "p", choices: ["가", "나"], answerIndex: 0 },
  };
}

function listening(itemId: string): CatalogMappedItem {
  return {
    kind: "listening",
    itemId,
    question: {
      prompt: "p",
      romanization: "r",
      audio: null,
      choices: ["가", "나"],
      answerIndex: 0,
    },
  };
}

function skipped(itemId: string): CatalogMappedItem {
  return { kind: "skipped", itemId, type: "CLOZE", reason: "malformed" };
}

describe("catalogActivityItemRefsOf (PL1)", () => {
  test("건너뜀은 빠지고 같은 학습형이 이어지면 한 묶음이다", () => {
    const planned: CatalogPlannedItem[] = [
      { mapped: wordChoice("A"), itemType: "CLOZE" },
      { mapped: wordChoice("B"), itemType: "CLOZE_CHOICE" },
      { mapped: skipped("C"), itemType: "CLOZE" },
      { mapped: wordChoice("D"), itemType: "ROLE_LINE" },
      { mapped: listening("E"), itemType: "LISTEN_SELECT" },
      { mapped: wordChoice("F"), itemType: "CULTURE_CHECK" },
    ];

    expect(catalogActivityItemRefsOf(planned)).toEqual([
      [
        { itemId: "A", itemType: "CLOZE" },
        { itemId: "B", itemType: "CLOZE_CHOICE" },
        { itemId: "D", itemType: "ROLE_LINE" },
      ],
      [{ itemId: "E", itemType: "LISTEN_SELECT" }],
      [{ itemId: "F", itemType: "CULTURE_CHECK" }],
    ]);
  });

  test("모두 건너뛰면 묶음이 없다", () => {
    expect(catalogActivityItemRefsOf([{ mapped: skipped("A"), itemType: "CLOZE" }])).toEqual([]);
  });

  test.each(["u00-tutorial", "u01-water", "u03-mina"])(
    "%s 모든 단계에서 묶음 수와 묶음 길이가 활동과 같다",
    (episodeId) => {
      const entry = readyIn(bundledCatalog, episodeId);

      for (const unit of entry.episode.units) {
        const plan = planOf(entry, unit.id);
        expect(plan.itemRefs, unit.id).toBeDefined();
        expect(plan.itemRefs?.length, unit.id).toBe(plan.activities.length);
        plan.activities.forEach((activity, index) => {
          expect(plan.itemRefs?.[index]?.length, `${unit.id}[${index}]`).toBe(
            activity.questions.length,
          );
        });
      }
    },
  );
});

describe("계획의 itemRefs (PL2)", () => {
  test("u00 S13은 문화 확인 하나를 가리킨다", () => {
    const plan = planOf(readyIn(bundledCatalog, "u00-tutorial"), "S13");

    expect(plan.itemRefs).toEqual([[{ itemId: "S13-01", itemType: "CULTURE_CHECK" }]]);
  });

  test("u00 S7은 듣고 만들기 하나를 가리킨다", () => {
    const plan = planOf(readyIn(bundledCatalog, "u00-tutorial"), "S7");

    expect(plan.itemRefs?.flat().map((ref) => ref.itemType)).toContain("LISTEN_BUILD");
  });
});

describe("계획의 counterpartAvatarUrl (PL3)", () => {
  const u00Wire = bundledCatalogInput.episodes["u00-tutorial"] as Record<string, unknown>;
  const withAvatarInput: typeof bundledCatalogInput = {
    ...bundledCatalogInput,
    episodes: {
      ...bundledCatalogInput.episodes,
      "u00-tutorial": { ...u00Wire, counterpart_avatar: "images/avatars/u00.webp" },
    },
  };
  const withAvatar = readyIn(catalogOf(withAvatarInput), "u00-tutorial");

  test("아바타가 있으면 그림 포트가 푼 주소다", () => {
    expect(planOf(withAvatar, "S11").counterpartAvatarUrl).toBe(cdn("images/avatars/u00.webp"));
  });

  test("그림 포트가 못 풀면 null이다", () => {
    expect(planOf(withAvatar, "S11", noImageUrl).counterpartAvatarUrl).toBeNull();
  });

  test("아바타가 없는 에피소드는 null이다", () => {
    const plain = readyIn(bundledCatalog, "u00-tutorial");

    expect(planOf(plain, "S11").counterpartAvatarUrl).toBeNull();
  });
});

describe("계획 안 문화 확인 장면 (PL4)", () => {
  test("u00 S13의 문화 확인 문항이 앞 단계 카드의 장면을 가진다", () => {
    const plan = planOf(readyIn(bundledCatalog, "u00-tutorial"), "S13");
    const activity = plan.activities[0];

    expect(activity?.form).toBe("word-choice");
    if (activity?.form !== "word-choice") return;
    const scene = activity.questions[0]?.culture?.scene;
    expect(scene).not.toBeNull();
    expect(scene?.line.ko).toBe("한국어 잘하시네요!");
    expect(scene?.imageUrl).toContain("cult-u00-jalhasineyo.webp");
  });

  test("u01 CULT의 문화 확인은 장면이 없다", () => {
    const plan = planOf(readyIn(bundledCatalog, "u01-water"), "CULT");
    const checks = plan.activities.flatMap((activity) =>
      activity.form === "word-choice" ? activity.questions : [],
    );

    expect(checks.length).toBeGreaterThan(0);
    for (const question of checks) {
      expect(question.culture?.scene).toBeNull();
    }
  });
});

describe("catalogLessonCastOf (PL6)", () => {
  const basePlan = planOf(readyIn(bundledCatalog, "u00-tutorial"), "S11");

  test("상대는 계획의 이름과 아바타 주소, 나는 학습자 이름이다", () => {
    const plan: CatalogLessonPlan = { ...basePlan, counterpartAvatarUrl: "https://cdn/a.webp" };

    expect(catalogLessonCastOf(plan, "Ana")).toEqual({
      counterpart: { name: plan.counterpartName, imageUrl: "https://cdn/a.webp" },
      me: { name: "Ana" },
    });
    expect(plan.counterpartName).not.toBe("");
  });

  test("아바타 주소가 없으면 imageUrl 키가 없다", () => {
    const plan: CatalogLessonPlan = { ...basePlan, counterpartAvatarUrl: null };

    const cast = catalogLessonCastOf(plan, "Ana");

    expect(cast.counterpart).toEqual({ name: plan.counterpartName });
    expect(cast.counterpart).not.toHaveProperty("imageUrl");
  });

  test("학습자 이름이 비면 name 키가 없다", () => {
    expect(catalogLessonCastOf(basePlan, "")).toMatchObject({ me: {} });
    expect(catalogLessonCastOf(basePlan, "   ").me).not.toHaveProperty("name");
    expect(catalogLessonCastOf(basePlan, "").me).not.toHaveProperty("name");
  });
});
