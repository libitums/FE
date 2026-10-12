import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import type { CatalogEntry } from "../lib/episode-catalog";
import type { EpisodeCut, LearningItem, Text } from "../lib/episode-content.model";
import { fillPlaceholders } from "../lib/placeholder-fill";
import { catalogMapSectionsOf } from "../screens/journey-map/catalog-map";
import {
  catalogFinalPlanFor,
  catalogFinalPlanOf,
  catalogRoleplayTurnOf,
} from "./catalog-final-model";
import type { CatalogFill } from "./catalog-lesson-plan";
import type { EpisodeContent } from "./episode-content";

// `unit` 계층: 최종 테스트 문항 → 턴 모델 변환과 계획 메모의 입출력만 봅니다.

type ReadyEntry = Extract<CatalogEntry, { status: "ready" }>;

const realCatalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});

const fill: CatalogFill = (text, script) => fillPlaceholders(text, {}, script);
const imageUrlOf = (path: string): string | null => `https://cdn/${path}`;

function readyOf(episodeId: string): ReadyEntry {
  const entry = realCatalog.find((candidate) => candidate.id === episodeId);
  if (entry === undefined || entry.status !== "ready") {
    throw new Error(`${episodeId} 가 ready가 아닙니다`);
  }
  return entry;
}

/** 최종 테스트 문항의 도메인 모양입니다 — 디코더가 정한 필드만 흉내 냅니다. */
type RoleplayShape = {
  readonly id: string;
  readonly tiles: readonly Text[];
  readonly answers: readonly Text[];
  readonly context: Text;
  readonly stimulus: { readonly imageUrl?: string };
};
const shapeOf = (item: LearningItem): RoleplayShape => item as unknown as RoleplayShape;
const asItem = (value: Record<string, unknown>): LearningItem => value as unknown as LearningItem;

function realTurns(episodeId: string): readonly RoleplayShape[] {
  return readyOf(episodeId).episode.finalTest.items.map(shapeOf);
}

const port = {
  fill,
  episodeId: "u01-water",
  sceneImageUrl: null,
  imageUrlOf,
} as const;

/** 정상인 최소 RP 문항입니다. `overrides`로 한 군데씩 망가뜨립니다. */
function rpItem(overrides: Record<string, unknown> = {}): LearningItem {
  return asItem({
    id: "RP-01",
    type: "ROLEPLAY_TURN",
    event: "R",
    prompt: { ko: "뭐라고 말할까요?", en: "What do you say?" },
    context: { ko: "상대 대사", roman: "sangdae daesa", en: "Other line" },
    stimulus: { text: { ko: "내 대사", roman: "nae daesa", en: "My line" } },
    tiles: [
      { ko: "내", roman: "nae" },
      { ko: "대사", roman: "daesa" },
    ],
    answers: [{ ko: "내 대사", roman: "nae daesa", en: "My line" }],
    feedback: { correct: { ko: "맞아요" } },
    roleplay: { lineId: "D1", tilesGloss: [] },
    ...overrides,
  });
}

describe("catalogFinalPlanOf — 실데이터", () => {
  test("FM1. u01은 점원 · 세 턴이고 첫 턴이 대사 · 지시문 · 정답 · 그림을 갖춘다", () => {
    const plan = catalogFinalPlanOf(readyOf("u01-water"), 1, fill, imageUrlOf);

    expect(plan.counterpartName).toBe("편의점 점원");
    expect(plan.ordinal).toBe(1);
    expect(plan.episodeId).toBe("u01-water");
    expect(plan.turns).toHaveLength(3);
    expect(plan.skippedItemCount).toBe(0);
    expect(plan.turns[0]).toMatchObject({
      line: { ko: "봉투 드릴까요?", roman: "bongtu deurilkkayo?", en: "Would you like a bag?" },
      instruction: "What do you say?",
      accepted: ["아니요, 괜찮아요."],
      replyTranslation: "No, I'm fine.",
    });
  });

  test("FM1. 타일은 원래 순서와 다르게 섞여 있고 모든 턴이 마지막 그림 컷을 쓴다", () => {
    const plan = catalogFinalPlanOf(readyOf("u01-water"), 1, fill, imageUrlOf);
    const first = plan.turns[0];

    expect(first?.tiles.map((tile) => tile.ko)).toHaveLength(2);
    expect(first?.tiles.map((tile) => tile.ko)).not.toEqual(["아니요,", "괜찮아요."]);
    expect(plan.turns.map((turn) => turn.imageUrl)).toEqual(
      Array(3).fill("https://cdn/images/u01-water/pre-6.jpg"),
    );
  });

  test("FM2. {이름}은 치환되고 원래 순서로 이은 타일이 첫 정답이다", () => {
    const plan = catalogFinalPlanOf(readyOf("u02-checkin"), 2, fill, imageUrlOf);
    const turn = plan.turns[0];
    const original = realTurns("u02-checkin")[0]?.tiles.map((tile) => fill(tile.ko, "ko")) ?? [];

    const visible = turn?.tiles.map((tile) => tile.ko) ?? [];

    expect(visible).toContain("이름으로");
    expect([...visible].sort()).toEqual([...original].sort());
    expect(turn?.accepted).toEqual(["이름으로 예약했어요."]);
    expect(original.join(" ")).toBe(turn?.accepted[0]);
  });

  test("FM3. 정답이 둘인 턴은 받는 정답이 둘이다", () => {
    const plan = catalogFinalPlanOf(readyOf("u03-mina"), 3, fill, imageUrlOf);

    expect(plan.turns[1]?.accepted).toHaveLength(2);
  });

  test("FM7. 세 에피소드의 13턴이 전부 제시되고 타일 수가 원래와 같다", () => {
    let total = 0;
    for (const [index, episodeId] of ["u01-water", "u02-checkin", "u03-mina"].entries()) {
      const plan = catalogFinalPlanOf(readyOf(episodeId), index + 1, fill, imageUrlOf);
      const originals = realTurns(episodeId);

      expect(plan.turns).toHaveLength(originals.length);
      expect(plan.skippedItemCount).toBe(0);
      plan.turns.forEach((turn, turnIndex) => {
        expect(turn.tiles).toHaveLength(originals[turnIndex]?.tiles.length ?? -1);
      });
      total += plan.turns.length;
    }

    expect(total).toBe(13);
  });
});

describe("catalogRoleplayTurnOf", () => {
  test("FM4. 정상 문항은 턴이 된다", () => {
    const turn = catalogRoleplayTurnOf(rpItem(), port);

    expect(turn).not.toBeNull();
    expect(turn?.accepted).toEqual(["내 대사"]);
    expect(turn?.tiles).toHaveLength(2);
  });

  test("FM4. 타일을 원래 순서로 이은 문장이 어느 정답과도 다르면 null이다", () => {
    const item = rpItem({ answers: [{ ko: "다른 말", roman: "dareun mal" }] });

    expect(catalogRoleplayTurnOf(item, port)).toBeNull();
  });

  test("FM4. 정답이 없으면 null이다", () => {
    expect(catalogRoleplayTurnOf(rpItem({ answers: [] }), port)).toBeNull();
  });

  test("FM4. 상대 대사 ko가 비면 null이다", () => {
    const item = rpItem({ context: { ko: "  ", roman: "x" } });

    expect(catalogRoleplayTurnOf(item, port)).toBeNull();
  });

  test("FM4. 타일 ko가 비면 null이다", () => {
    const item = rpItem({
      tiles: [
        { ko: "", roman: "" },
        { ko: "내 대사", roman: "nae daesa" },
      ],
    });

    expect(catalogRoleplayTurnOf(item, port)).toBeNull();
  });

  test("FM4. RP가 아닌 문항은 null이다", () => {
    const item = asItem({
      id: "S1-01",
      type: "VOCAB_CARD",
      event: "E",
      context: { ko: "문맥", roman: "r" },
      example: { ko: "예문", roman: "r" },
      cardKind: "단어",
    });

    expect(catalogRoleplayTurnOf(item, port)).toBeNull();
  });

  test("FM5. 턴 그림이 있으면 표지 컷 그림보다 앞선다", () => {
    const item = rpItem({
      stimulus: { text: { ko: "내 대사", roman: "r" }, imageUrl: "images/turn.jpg" },
    });

    const turn = catalogRoleplayTurnOf(item, { ...port, sceneImageUrl: "https://cdn/scene.jpg" });

    expect(turn?.imageUrl).toBe("https://cdn/images/turn.jpg");
  });

  test("FM5. 턴 그림이 없으면 표지 컷 그림을, 둘 다 없으면 null을 쓴다", () => {
    expect(
      catalogRoleplayTurnOf(rpItem(), { ...port, sceneImageUrl: "https://cdn/scene.jpg" })
        ?.imageUrl,
    ).toBe("https://cdn/scene.jpg");
    expect(catalogRoleplayTurnOf(rpItem(), port)?.imageUrl).toBeNull();
  });
});

describe("catalogFinalPlanOf — 건너뜀과 그림", () => {
  const cutOf = (index: number, imageUrl?: string): EpisodeCut => ({
    kind: "narration",
    index,
    narration: { ko: "지문", roman: "jimun" },
    imageBrief: "brief",
    ...(imageUrl === undefined ? {} : { imageUrl }),
  });

  function entryWith(items: LearningItem[], prologue: EpisodeCut[]): ReadyEntry {
    const base = readyOf("u01-water");
    return {
      ...base,
      episode: {
        ...base.episode,
        prologue,
        finalTest: { id: "RP", order: 99, items },
      },
    };
  }

  test("FM4. 그릴 수 없는 턴은 건너뛰고 건너뜀 수로 센다", () => {
    const broken = rpItem({ id: "RP-02", answers: [] });
    const entry = entryWith([rpItem(), broken, rpItem({ id: "RP-03" })], [cutOf(1)]);

    const plan = catalogFinalPlanOf(entry, 1, fill, imageUrlOf);

    expect(plan.turns).toHaveLength(2);
    expect(plan.skippedItemCount).toBe(1);
    expect(plan.turns.map((turn) => turn.id)).toEqual(["RP-01", "RP-03"]);
  });

  test("FM5. 장면 그림은 그림이 있는 마지막 컷이다", () => {
    const entry = entryWith(
      [rpItem()],
      [cutOf(1, "images/a.jpg"), cutOf(2, "images/b.jpg"), cutOf(3)],
    );

    expect(catalogFinalPlanOf(entry, 1, fill, imageUrlOf).turns[0]?.imageUrl).toBe(
      "https://cdn/images/b.jpg",
    );
  });

  test("FM5. 표지 컷에 그림이 없으면 턴 그림도 없다", () => {
    const entry = entryWith([rpItem()], [cutOf(1), cutOf(2)]);

    expect(catalogFinalPlanOf(entry, 1, fill, imageUrlOf).turns[0]?.imageUrl).toBeNull();
  });

  test("FM5. 그림 주소를 만들 수 없으면 턴 그림은 null이다", () => {
    const entry = entryWith([rpItem()], [cutOf(1, "images/a.jpg")]);

    expect(catalogFinalPlanOf(entry, 1, fill, () => null).turns[0]?.imageUrl).toBeNull();
  });
});

describe("catalogFinalPlanFor — 메모", () => {
  const contentOf = (catalog: readonly CatalogEntry[]): EpisodeContent => ({
    catalog,
    imageUrlOf,
    fillText: fillPlaceholders,
  });

  test("FM6. 같은 ready 항목이면 같은 계획 참조를 돌려준다", () => {
    const content = contentOf(realCatalog);
    const sections = catalogMapSectionsOf(realCatalog);

    const first = catalogFinalPlanFor(content, sections, "u01-water");
    const second = catalogFinalPlanFor(content, sections, "u01-water");

    expect(first).not.toBeNull();
    expect(second).toBe(first);
  });

  test("FM6. 없는 id와 준비 안 된 id는 null이다", () => {
    const catalog: readonly CatalogEntry[] = [
      ...realCatalog,
      { status: "pending", id: "u04-x", order: 4, title: "제목", version: "v1" },
    ];
    const content = contentOf(catalog);
    const sections = catalogMapSectionsOf(catalog);

    expect(catalogFinalPlanFor(content, sections, "nope")).toBeNull();
    expect(catalogFinalPlanFor(content, sections, "u04-x")).toBeNull();
  });

  test("FM6. 에피소드 번호는 구획 자리에서 온다", () => {
    const content = contentOf(realCatalog);
    const sections = catalogMapSectionsOf(realCatalog);

    expect(catalogFinalPlanFor(content, sections, "u02-checkin")?.ordinal).toBe(2);
  });
});
