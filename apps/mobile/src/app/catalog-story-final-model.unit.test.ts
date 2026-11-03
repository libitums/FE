import { expect, test } from "vitest";

import type { CatalogEntry } from "../lib/episode-catalog";
import type {
  DialogueLine,
  ItemStory,
  LearningItem,
  LearningUnit,
} from "../lib/episode-content.model";
import { fillPlaceholders } from "../lib/placeholder-fill";
import type { CatalogFill } from "./catalog-lesson-plan";
import {
  catalogStoryFinalPlanOf,
  catalogStoryFinalSourceOf,
  catalogStoryFinalTurnOf,
} from "./catalog-story-final-model";
import type { CatalogStoryFinalPort } from "./catalog-story-final-model";

// `unit` 계층: 여정맵 이야기 파이널(level-3 S8) — 원천 유닛 고르기, 문항 → 턴 변환, 계획.

const fill: CatalogFill = (text, script) =>
  fillPlaceholders(text, { name: "Sam", country: "Canada" }, script);
const imageUrlOf = (path: string): string | null => `https://cdn/${path}`;
const port: CatalogStoryFinalPort = {
  fill,
  episodeId: "u01-water",
  counterpart: "편의점 점원",
  sceneImageUrl: "https://cdn/scene.webp",
  imageUrlOf,
};

const t = (ko: string, en?: string) => ({
  ko,
  roman: `r-${ko}`,
  ...(en === undefined ? {} : { en }),
});

function story(lineKo: string, extra: Partial<ItemStory> = {}): ItemStory {
  return {
    lineId: "D2",
    hintAfterMiss: true,
    lead: [{ speaker: "점원", line: t("봉투 드릴까요?", "Would you like a bag?") }],
    line: t(lineKo, `en-${lineKo}`),
    ...extra,
  };
}

const asItem = (value: Record<string, unknown>): LearningItem => value as unknown as LearningItem;
const option = (ko: string, correct: boolean) => ({ id: ko, ko, roman: `r-${ko}`, correct });

const reply = asItem({
  id: "S8-01",
  type: "REPLY_SELECT",
  event: "R",
  prompt: { ko: "뭐라고 대답할까요?", en: "How do you reply?" },
  stimulus: { text: t("봉투 드릴까요?") },
  context: t("봉투 드릴까요?"),
  options: [option("영수증 드릴까요?", false), option("아니요, 괜찮아요.", true)],
  feedback: { correct: t("맞아요", "Here you say “No, I'm fine.”") },
  story: story("아니요, 괜찮아요."),
});

test("SF1. 모든 문항이 이야기인 마지막 유닛이 원천이고, 없으면 null이다", () => {
  const unit = (id: string, items: LearningItem[]): LearningUnit => ({ id, order: 1, items });
  const plain = asItem({ id: "S1-01", type: "CLOZE", event: "R" });
  expect(catalogStoryFinalSourceOf([unit("S1", [plain]), unit("S8", [reply])])).toBe("S8");
  expect(catalogStoryFinalSourceOf([unit("S1", [plain]), unit("S8", [reply, plain])])).toBeNull();
  expect(catalogStoryFinalSourceOf([unit("S1", [plain]), unit("INT", [])])).toBeNull();
});

test("SF2. 대답 고르기는 choice 턴 — 장면 앞 줄 · 화자 · Say · 정답 문장 · 해설이 선다", () => {
  expect(catalogStoryFinalTurnOf(reply, port)).toEqual({
    id: "S8-01",
    kind: "choice",
    instruction: "How do you reply?",
    speakerName: "점원",
    line: { ko: "봉투 드릴까요?", roman: "r-봉투 드릴까요?", en: "Would you like a bag?" },
    template: null,
    replyTranslation: "en-아니요, 괜찮아요.",
    answer: "아니요, 괜찮아요.",
    correctNote: "Here you say “No, I'm fine.”",
    imageUrl: "https://cdn/scene.webp",
    options: [
      { ko: "영수증 드릴까요?", roman: "r-영수증 드릴까요?" },
      { ko: "아니요, 괜찮아요.", roman: "r-아니요, 괜찮아요." },
    ],
    correctIndex: 1,
  });
});

test("SF3. 빈칸 고르기는 문맥을 틀로 쓰고, 장면 그림이 있으면 그것이다", () => {
  const turn = catalogStoryFinalTurnOf(
    asItem({
      id: "S8-02",
      type: "CLOZE_CHOICE",
      event: "R",
      prompt: { ko: "빈칸", en: "Fill in the blank." },
      context: t("따뜻한 ___ 주세요."),
      options: [option("봉투", false), option("물", true)],
      answers: [t("물")],
      story: story("따뜻한 물 주세요.", { imageUrl: "content/images/u01/pre-6.webp" }),
    }),
    port,
  );
  expect(turn).toMatchObject({
    kind: "choice",
    template: "따뜻한 ___ 주세요.",
    correctIndex: 1,
    correctNote: null,
    imageUrl: "https://cdn/content/images/u01/pre-6.webp",
  });
});

const tilesItem = (type: string, context: string | null, tiles: string[], answer: string) =>
  asItem({
    id: `S8-${type}`,
    type,
    event: "R",
    prompt: { ko: "빈칸", en: "Fill in the blank." },
    ...(context === null ? {} : { context: t(context) }),
    stimulus: {},
    tiles: tiles.map((ko) => t(ko)),
    answers: [t(answer)],
    story: story("아니요, 영수증은 괜찮아요."),
  });

test("SF4. 빈칸 타일은 띄어 잇는 tiles 턴 — 타일은 섞여도 모두 있고 정답 목록이 선다", () => {
  const turn = catalogStoryFinalTurnOf(
    tilesItem("CLOZE", "아니요, ___.", ["영수증은", "괜찮아요", "카드로"], "영수증은 괜찮아요"),
    port,
  );
  if (turn?.kind !== "tiles") throw new Error(String(turn?.kind));
  expect(turn.joiner).toBe(" ");
  expect(turn.template).toBe("아니요, ___.");
  expect(turn.accepted).toEqual(["영수증은 괜찮아요"]);
  expect([...turn.tiles.map((tile) => tile.ko)].sort()).toEqual(["괜찮아요", "영수증은", "카드로"]);
});

test("SF5. 음절 잇기는 붙여 잇고, 문장 잇기는 틀이 없다", () => {
  const syllable = catalogStoryFinalTurnOf(
    tilesItem("SYLLABLE_BUILD", "방이 몇 ___?", ["층", "이", "에", "요"], "층이에요"),
    port,
  );
  const order = catalogStoryFinalTurnOf(
    tilesItem("WORD_ORDER", null, ["네,", "어제"], "네, 어제"),
    port,
  );
  expect(syllable).toMatchObject({ kind: "tiles", joiner: "" });
  expect(order).toMatchObject({ kind: "tiles", joiner: " ", template: null });
});

test("SF6. 따라 쓰기는 정답의 음절(공백 뺌)을 차례로 쓰는 write 턴이다", () => {
  const turn = catalogStoryFinalTurnOf(
    asItem({
      id: "S8-03",
      type: "HANGUL_WRITE",
      event: "R",
      prompt: { ko: "따라 쓰세요.", en: "Trace it." },
      context: t("___ 할게요."),
      answers: [t("카드 로")],
      story: story("카드로 할게요."),
    }),
    port,
  );
  expect(turn).toMatchObject({
    kind: "write",
    syllables: ["카", "드", "로"],
    template: "___ 할게요.",
  });
});

test("SF7. 이름 · 나라 자리를 채우고, 이야기가 없거나 보기가 그릴 수 없으면 null이다", () => {
  const named = catalogStoryFinalTurnOf(
    asItem({
      ...reply,
      options: [option("{이름}(으)로 예약했어요.", true), option("방", false)],
      story: story("{이름}(으)로 예약했어요."),
    }),
    port,
  );
  expect(named).toMatchObject({ answer: "Sam으로 예약했어요." });
  if (named?.kind !== "choice") throw new Error("kind");
  expect(named.options[0].ko).toBe("Sam으로 예약했어요.");
  const { story: _drop, ...noStory } = reply as unknown as Record<string, unknown>;
  expect(catalogStoryFinalTurnOf(asItem(noStory), port)).toBeNull();
  expect(catalogStoryFinalTurnOf(asItem({ ...reply, options: [] }), port)).toBeNull();
});

type ReadyEntry = Extract<CatalogEntry, { status: "ready" }>;

test("SF8. 계획은 원천 유닛의 턴을 순서대로 싣고, 대화 줄 소리 · 건너뛴 수를 단다", () => {
  const dialogue: DialogueLine[] = [
    { seq: 1, role: "counterpart", text: t("봉투 드릴까요?"), audioUrl: "u01/d-01" },
    { seq: 2, role: "player", text: t("아니요, 괜찮아요."), audioUrl: "u01/d-02" },
  ];
  const broken = asItem({ ...reply, id: "S8-09", options: [] });
  const entry = {
    id: "u01-water",
    status: "ready",
    episode: {
      counterpart: " 편의점 점원 ",
      prologue: [],
      dialogue,
      units: [{ id: "S8", order: 9, items: [reply, broken] }],
    },
  } as unknown as ReadyEntry;
  const lineIdAware = { ...entry };
  const plan = catalogStoryFinalPlanOf(lineIdAware, 1, "S8", fill, imageUrlOf, (id) =>
    id === "D2" ? { counterpart: dialogue[0], player: dialogue[1] } : null,
  );
  expect(plan.turns.map((turn) => turn.id)).toEqual(["S8-01"]);
  expect(plan.skippedItemCount).toBe(1);
  expect(plan.turns[0]).toMatchObject({
    counterpartAudioSource: "https://cdn/audio/u01/d-01.m4a",
    replyAudioSource: "https://cdn/audio/u01/d-02.m4a",
  });
});
