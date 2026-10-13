import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, test } from "vitest";

import type { AnswerResult } from "../lib/answer-result";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import type { CatalogEntry } from "../lib/episode-catalog";
import type { LearningItem, Option, Text } from "../lib/episode-content.model";
import { fillPlaceholders } from "../lib/placeholder-fill";
import type { LearnerProfile } from "../lib/placeholder-fill";
import { judgeAssessment } from "../screens/assessment/assessment";
import { catalogMapSectionsOf } from "../screens/journey-map/catalog-map";
import {
  catalogActivitiesOf,
  catalogActivityPositionOf,
  catalogActivityScoring,
  catalogItemOf,
  catalogLessonPlanFor,
  catalogLessonPlanOf,
  catalogPassCriterion,
  shuffledOrder,
} from "./catalog-lesson-plan";
import type { CatalogActivity, CatalogFill, CatalogMappedItem } from "./catalog-lesson-plan";
import { noLearnerProfile } from "./catalog-cover-wiring";
import { catalogFinalPlanFor } from "./catalog-final-model";
import type { EpisodeContent } from "./episode-content";

// `unit` 계층: 문항 → 학습형 문항 매핑 · 구간 묶기 · 판정 기준 · 결정적 순서 · 계획 메모의 입출력만 봅니다.

type ReadyEntry = Extract<CatalogEntry, { status: "ready" }>;

const realCatalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});

const fill: CatalogFill = (text, script) => fillPlaceholders(text, {}, script);
const port = {
  fill,
  episodeId: "u01-water",
  glossOf: () => null,
  imageUrlOf: () => null,
} as const;

const noImageUrl = (): null => null;

function readyOf(episodeId: string): ReadyEntry {
  const entry = realCatalog.find((candidate) => candidate.id === episodeId);
  if (entry === undefined || entry.status !== "ready") {
    throw new Error(`${episodeId} 가 ready가 아닙니다`);
  }
  return entry;
}

function realItem(episodeId: string, itemId: string): LearningItem {
  for (const unit of readyOf(episodeId).episode.units) {
    const found = unit.items.find((candidate) => candidate.id === itemId);
    if (found !== undefined) return found;
  }
  throw new Error(`${episodeId}/${itemId} 가 없습니다`);
}

function contentOf(catalog: readonly CatalogEntry[]): EpisodeContent {
  return {
    catalog,
    imageUrlOf: (path) => `https://cdn/${path}`,
    fillText: fillPlaceholders,
  };
}

/** 매핑 결과에서 문항 본체를 꺼냅니다(건너뜀이면 undefined). */
const questionOf = (mapped: CatalogMappedItem): Record<string, unknown> | undefined =>
  Reflect.get(mapped, "question") as Record<string, unknown> | undefined;

// ---- 최소 픽스처 ----

const t = (ko: string, roman = `r-${ko}`, en?: string): Text =>
  en === undefined ? { ko, roman } : { ko, roman, en };
const ask = { ko: "질문", en: "Question" };
const opt = (id: string, ko: string, correct: boolean): Option => ({
  id,
  ko,
  roman: `r-${ko}`,
  correct,
});
const base = (id: string) => ({ id, event: "R" as const });

const vocabCard = (id: string): LearningItem => ({
  ...base(id),
  type: "VOCAB_CARD",
  context: t("문맥"),
  example: t("예문"),
  cardKind: "단어",
});
const imgMatch = (id: string): LearningItem => ({
  ...base(id),
  type: "IMG_MATCH",
  prompt: ask,
  stimulus: { imageBrief: "brief" },
  options: [opt("o1", "가", true), opt("o2", "나", false)],
});
const pairMatch = (id: string): LearningItem => ({
  ...base(id),
  type: "PAIR_MATCH",
  prompt: ask,
  tiles: [t("A"), t("B")],
  pairs: [{ left: t("A"), right: "a" }],
});
const cloze = (id: string, tiles: Text[], answers: Text[]): LearningItem => ({
  ...base(id),
  type: "CLOZE",
  prompt: { ko: "빈칸을 채우세요.", en: "Fill in the blank." },
  context: t("___로 할게요."),
  tiles,
  answers,
});
// 최종 테스트 문항의 도메인 모양은 디코더 쪽이 정하므로 모양만 흉내 낸 값을 문항으로 다룹니다.
const roleplay = (id: string): LearningItem =>
  ({
    ...base(id),
    type: "ROLEPLAY_TURN",
    prompt: ask,
    context: t("상대 대사"),
    stimulus: {},
    tiles: [t("내"), t("대사")],
    answers: [t("내 대사")],
    feedback: { correct: { ko: "맞아요" } },
    roleplay: { lineId: "D1", tilesGloss: [] },
  }) as unknown as LearningItem;
const listenSelect = (
  id: string,
  options: Option[] | undefined,
  withAudio = true,
): LearningItem => ({
  ...base(id),
  type: "LISTEN_SELECT",
  prompt: ask,
  stimulus: withAudio ? { audio: t("듣기", "deutgi", "Listening") } : {},
  ...(options === undefined ? {} : { options }),
});
const wordOrder = (id: string, tiles: Text[], answers: Text[]): LearningItem => ({
  ...base(id),
  type: "WORD_ORDER",
  prompt: ask,
  tiles,
  answers,
});
const turnOrder = (id: string, tiles: Text[], answer: number[]): LearningItem => ({
  ...base(id),
  type: "TURN_ORDER",
  prompt: ask,
  context: t("문맥", "munmaek"),
  tiles,
  answer,
});
const translateToKo = (id: string, answers: Text[]): LearningItem => ({
  ...base(id),
  type: "TRANSLATE_TO_KO",
  prompt: ask,
  answers,
});

const skippedWith = (reason: string) => ({ kind: "skipped", reason });

// ---- shuffledOrder ----

const isPermutation = (order: readonly number[], length: number): boolean =>
  order.length === length && [...order].sort((a, b) => a - b).every((value, i) => value === i);

describe("shuffledOrder", () => {
  test("LP1. 길이 0 · 1은 자명하고 2 이상은 항등이 아닌 순열이며 두 번 불러도 같다", () => {
    expect(shuffledOrder("a", 0)).toEqual([]);
    expect(shuffledOrder("a", 1)).toEqual([0]);

    const two = shuffledOrder("u01-water/RP-01", 2);
    expect(two).toHaveLength(2);
    expect(isPermutation(two, 2)).toBe(true);
    expect(two).not.toEqual([0, 1]);

    const five = shuffledOrder("x", 5);
    expect(isPermutation(five, 5)).toBe(true);
    expect(five).not.toEqual([0, 1, 2, 3, 4]);
    expect(shuffledOrder("x", 5)).toEqual(five);
    expect(shuffledOrder("u01-water/RP-01", 2)).toEqual(two);
  });

  test("LP2. 길이 2 ~ 6 · 씨앗 50개 모두 항등이 아닌 순열이다", () => {
    for (let length = 2; length <= 6; length += 1) {
      for (let i = 0; i < 50; i += 1) {
        const order = shuffledOrder(`s${i}`, length);
        expect(isPermutation(order, length)).toBe(true);
        expect(order).not.toEqual(Array.from({ length }, (_, index) => index));
      }
    }
  });
});

// ---- catalogItemOf ----

describe("catalogItemOf — 건너뜀", () => {
  test("LP3. 레슨 안의 ROLEPLAY_TURN은 malformed로 건너뛴다", () => {
    expect(catalogItemOf(roleplay("RP-01"), port)).toEqual({
      kind: "skipped",
      itemId: "RP-01",
      type: "ROLEPLAY_TURN",
      reason: "malformed",
    });
  });
});

describe("catalogItemOf — 빈칸 채우기는 단어 선택이다", () => {
  test("LP-CZ1. 실데이터 CLOZE는 빈칸 문장을 제시문으로, 타일을 보기로 한다", () => {
    const item = realItem("u01-water", "S1-04");
    if (item.type !== "CLOZE") throw new Error("CLOZE가 아닙니다");

    const mapped = catalogItemOf(item, port);

    expect(mapped.kind).toBe("word-choice");
    const question = questionOf(mapped) as {
      prompt: string;
      choices: string[];
      answerIndex: number;
    };
    expect(question.prompt).toBe("___로 할게요.");
    expect([...question.choices].sort()).toEqual(item.tiles.map((tile) => tile.ko).sort());
    expect(question.choices).toHaveLength(3);
    expect(question.choices[question.answerIndex]).toBe("카드");
  });

  test("LP-CZ2. 정답이 타일에 없으면 malformed로 건너뛴다", () => {
    const item = cloze("C", [t("가"), t("나"), t("다")], [t("라")]);

    expect(catalogItemOf(item, port)).toMatchObject(skippedWith("malformed"));
  });

  test("LP-CZ3. 타일이 없으면 건너뛴다", () => {
    expect(catalogItemOf(cloze("C", [], [t("가")]), port).kind).toBe("skipped");
  });

  test("LP-CZ4. 정답이 둘째 타일이면 그 자리를 가리킨다", () => {
    const mapped = catalogItemOf(cloze("C", [t("가"), t("나"), t("다")], [t("나")]), port);
    const question = questionOf(mapped) as { choices: string[]; answerIndex: number };

    expect(mapped.kind).toBe("word-choice");
    expect(question.choices[question.answerIndex]).toBe("나");
  });
});

describe("catalogItemOf — 듣기", () => {
  test("LP4. 실데이터 LISTEN_SELECT는 오디오가 없어 audio-missing으로 건너뛴다", () => {
    const item = realItem("u02-checkin", "S3-01");
    if (item.type !== "LISTEN_SELECT") throw new Error("모양 불일치");

    expect(catalogItemOf(item, port)).toEqual({
      kind: "skipped",
      itemId: "S3-01",
      type: "LISTEN_SELECT",
      reason: "audio-missing",
    });
  });

  test("LP4. 실데이터의 어느 듣기 문항도 계획에 듣기 구간으로 서지 않는다", () => {
    let listenItems = 0;
    for (const entry of realCatalog) {
      if (entry.status !== "ready") continue;
      for (const unit of entry.episode.units) {
        const plan = catalogLessonPlanOf(entry, unit.id, fill, noImageUrl);
        expect(plan?.activities.some((activity) => activity.form === "listening")).toBe(false);
        for (const item of unit.items) {
          if (item.type !== "LISTEN_SELECT" || item.options === undefined) continue;
          listenItems += 1;
          expect(catalogItemOf(item, { ...port, episodeId: entry.id })).toMatchObject(
            skippedWith("audio-missing"),
          );
        }
      }
    }
    expect(listenItems).toBeGreaterThan(0);
  });

  test("LP5. 보기가 없으면 no-options로 건너뛴다", () => {
    expect(catalogItemOf(realItem("u02-checkin", "S5-17"), port)).toMatchObject(
      skippedWith("no-options"),
    );
  });

  test("LP5. 보기가 셋이면 malformed로 건너뛴다", () => {
    const three = [opt("o1", "가", true), opt("o2", "나", false), opt("o3", "다", false)];

    expect(catalogItemOf(listenSelect("L", three), port)).toMatchObject(skippedWith("malformed"));
  });

  test("LP5. 오디오 대본이 없으면 malformed로 건너뛴다", () => {
    const four = ["가", "나", "다", "라"].map((ko, i) => opt(`o${i}`, ko, i === 0));

    expect(catalogItemOf(listenSelect("L", four, false), port)).toMatchObject(
      skippedWith("malformed"),
    );
  });

  test("LP5. 모양이 맞아도(보기가 둘) 오디오가 없으면 audio-missing으로 건너뛴다", () => {
    const two = [opt("o1", "가", false), opt("o2", "나", true)];

    expect(catalogItemOf(listenSelect("L", two), port)).toMatchObject(skippedWith("audio-missing"));
  });

  test("LP5. 모양이 틀린 듣기는 오디오 사유보다 먼저 no-options · malformed로 건너뛴다", () => {
    const four = ["가", "나", "다", "라"].map((ko, i) => opt(`o${i}`, ko, i === 0));

    expect(catalogItemOf(listenSelect("L", undefined), port)).toMatchObject(
      skippedWith("no-options"),
    );
    expect(catalogItemOf(listenSelect("L", four, false), port)).toMatchObject(
      skippedWith("malformed"),
    );
  });
});

describe("catalogItemOf — 단어 선택", () => {
  test("LP6. 실데이터 ROLE_LINE은 상대 대사를 제시문으로 한다", () => {
    const item = realItem("u02-checkin", "S3-04");
    if (item.type !== "ROLE_LINE") throw new Error("모양 불일치");

    const mapped = catalogItemOf(item, port);

    expect(mapped).toMatchObject({
      kind: "word-choice",
      question: {
        prompt: "이름이 어떻게 되세요?",
        romanization: "ireumi eotteoke doeseyo?",
        translation: "May I have your name?",
        choices: item.options.map((option) => option.ko),
        answerIndex: 0,
        instruction: "What do you say?",
      },
    });
    expect(questionOf(mapped)?.["choices"]).toHaveLength(3);
  });

  test("LP7. 실데이터 TRANSLATE_TO_EN은 영어 보기를 두고 뜻 줄을 싣지 않는다", () => {
    const item = realItem("u02-checkin", "S9-01");
    if (item.type !== "TRANSLATE_TO_EN") throw new Error("모양 불일치");

    const mapped = catalogItemOf(item, port);

    expect(mapped).toMatchObject({
      kind: "word-choice",
      question: {
        prompt: "일주일",
        romanization: "iljuil",
        choices: item.options.map((option) => option.ko),
        answerIndex: 2,
      },
    });
    expect(questionOf(mapped)?.["choices"]).toEqual([
      "to stay (at a hotel)",
      "a few days, what date",
      "one week",
      "passport",
    ]);
    expect(questionOf(mapped)).not.toHaveProperty("translation");
  });
});

describe("catalogItemOf — 문장 순서", () => {
  test("LP8. WORD_ORDER는 섞인 타일이고 정답 순서로 이으면 정답 문장이다", () => {
    const item = realItem("u02-checkin", "S1-12");
    if (item.type !== "WORD_ORDER") throw new Error("모양 불일치");

    const mapped = catalogItemOf(item, port);
    const question = questionOf(mapped) as {
      chips: string[];
      answerOrder: number[];
      prompt: string;
      instruction: string;
    };

    expect(mapped.kind).toBe("sentence-order");
    expect([...question.chips].sort()).toEqual(item.tiles.map((tile) => tile.ko).sort());
    expect(question.chips).not.toEqual(item.tiles.map((tile) => tile.ko));
    expect(question.answerOrder.map((index) => question.chips[index]).join(" ")).toBe(
      "여권 여기 있어요.",
    );
    expect(question.prompt).toBe("Here's my passport.");
    expect(question.instruction).toBe("Build the sentence.");
  });

  test("LP8. 타일을 이은 문장이 정답과 다르면 malformed로 건너뛴다", () => {
    const item = wordOrder("W", [t("가"), t("나")], [t("다라")]);

    expect(catalogItemOf(item, port)).toMatchObject(skippedWith("malformed"));
  });

  test("LP8. 타일이 없으면 건너뛴다", () => {
    expect(catalogItemOf(wordOrder("W", [], [t("가")]), port).kind).toBe("skipped");
  });

  test("LP9. TURN_ORDER는 원래 정답 순서대로 읽히는 대화 조립 문항이다 — 지시문 말풍선 · 보조 글이 없다", () => {
    const item = realItem("u02-checkin", "S3-02");
    if (item.type !== "TURN_ORDER") throw new Error("모양 불일치");

    const mapped = catalogItemOf(item, port);
    const question = questionOf(mapped) as {
      chips: string[];
      answerOrder: number[];
      prompt: string;
      instruction: string;
      dialogue?: true;
      support?: unknown;
    };

    expect(mapped.kind).toBe("sentence-order");
    expect(question.answerOrder.map((index) => question.chips[index])).toEqual(
      item.answer.map((index) => item.tiles[index]?.ko),
    );
    expect(question.chips).not.toEqual(item.tiles.map((tile) => tile.ko));
    expect(question.dialogue).toBe(true);
    expect(question.support).toBeUndefined();
    expect(question.instruction).toBe(item.prompt.en);
  });

  test("LP9. 대화 조립은 TURN_ORDER에만 붙는다 — WORD_ORDER는 기존 문장 순서다", () => {
    const mapped = catalogItemOf(wordOrder("W", [t("가"), t("나")], [t("가 나")]), port);

    expect(mapped.kind).toBe("sentence-order");
    expect(questionOf(mapped)?.["dialogue"]).toBeUndefined();
  });

  test("LP9. answer 길이가 타일 수와 다르면 malformed로 건너뛴다", () => {
    const item = turnOrder("T", [t("가"), t("나"), t("다")], [0, 1]);

    expect(catalogItemOf(item, port)).toMatchObject(skippedWith("malformed"));
  });

  test("LP9. answer가 순열이 아니면 malformed로 건너뛴다", () => {
    const item = turnOrder("T", [t("가"), t("나")], [0, 0]);

    expect(catalogItemOf(item, port)).toMatchObject(skippedWith("malformed"));
  });
});

describe("catalogItemOf — 타자 입력", () => {
  test("LP10. 실데이터 DICTATION은 로마자 단서와 영어 뜻을 보이고 한글은 숨긴다", () => {
    expect(catalogItemOf(realItem("u02-checkin", "S6-01"), port)).toEqual({
      kind: "typing",
      itemId: "S6-01",
      question: {
        id: "S6-01",
        kind: "dictation",
        instruction: "Type what you hear.",
        cue: "yeogwon yeogi isseoyo.",
        cueSupport: "Here's my passport.",
        hint: null,
        answers: ["여권 여기 있어요.", "여권 여기 있어요"],
        audioSource: null,
      },
    });
  });

  test("LP11. 영어 원문이 있는 TRANSLATE_TO_KO는 영어를 단서로 한다", () => {
    const mapped = catalogItemOf(realItem("u02-checkin", "S4-13"), port);

    expect(mapped).toMatchObject({
      kind: "typing",
      question: { kind: "translation", cue: "I'm staying a week.", cueSupport: null, hint: null },
    });
    expect(questionOf(mapped)?.["answers"]).toContain("일주일 묵어요.");
  });

  test("LP11. 영어 원문이 없으면 no-source, 정답에 숫자가 있으면 untypeable로 건너뛴다", () => {
    expect(catalogItemOf(realItem("u02-checkin", "S4-11"), port)).toMatchObject(
      skippedWith("no-source"),
    );
    expect(catalogItemOf(realItem("u02-checkin", "S9-06"), port)).toMatchObject(
      skippedWith("untypeable"),
    );
  });

  test("LP12. 실데이터 SENT_BUILD는 영어 단서와 패턴 안내를 단다", () => {
    const item = realItem("u02-checkin", "S8-04");
    if (item.type !== "SENT_BUILD") throw new Error("모양 불일치");

    const mapped = catalogItemOf(item, port);

    expect(mapped).toMatchObject({
      kind: "typing",
      question: { kind: "pattern", cue: "What's the wifi password?", hint: item.context.ko },
    });
    expect(item.context.ko).toContain("{명사}");
  });

  test("LP12. 영어가 없는 SENT_BUILD는 no-source로 건너뛴다", () => {
    expect(catalogItemOf(realItem("u03-mina", "S8-03"), port)).toMatchObject(
      skippedWith("no-source"),
    );
  });

  test("LP13. 자리표시자는 정답 · 단서에서 로마자와 한글 각각으로 치환된다", () => {
    const item = translateToKo("T", [
      t("저는 {이름}이에요.", "jeoneun {이름}ieyo.", "I'm {이름}."),
    ]);

    const mapped = catalogItemOf(item, port);

    expect(mapped).toMatchObject({
      kind: "typing",
      question: { answers: ["저는 이름이에요."], cue: "I'm ireum." },
    });
  });
});

// ---- catalogActivitiesOf ----

describe("catalogActivitiesOf", () => {
  const word = (n: number): CatalogMappedItem => ({
    kind: "word-choice",
    itemId: `W${n}`,
    question: { prompt: `w${n}`, choices: ["a", "b"], answerIndex: 0 },
  });
  const listen = (n: number): CatalogMappedItem => ({
    kind: "listening",
    itemId: `L${n}`,
    question: {
      prompt: `l${n}`,
      romanization: `l${n}`,
      audioSource: null,
      choices: ["a", "b"],
      answerIndex: 0,
    },
  });
  const order = (n: number): CatalogMappedItem => ({
    kind: "sentence-order",
    itemId: `O${n}`,
    question: { prompt: `o${n}`, chips: ["a", "b"], answerOrder: [0, 1] },
  });
  const skip = (n: number): CatalogMappedItem => ({
    kind: "skipped",
    itemId: `X${n}`,
    type: "VOCAB_CARD",
    reason: "malformed",
  });

  const shape = (activities: readonly CatalogActivity[]) =>
    activities.map((activity) => `${activity.form}:${activity.questions.length}`);

  test("LP14. 같은 학습형이 이어지는 구간으로 묶고 건너뜀은 뺀다", () => {
    const items = [
      skip(1),
      word(1),
      word(2),
      skip(2),
      listen(1),
      order(1),
      skip(3),
      order(2),
      listen(2),
      listen(3),
      listen(4),
      order(3),
    ];

    expect(shape(catalogActivitiesOf(items))).toEqual([
      "word-choice:2",
      "listening:1",
      "sentence-order:2",
      "listening:3",
      "sentence-order:1",
    ]);
  });

  test("LP14. 문항 순서가 구간 안에서 유지된다", () => {
    const [first] = catalogActivitiesOf([word(1), word(2), word(3)]);

    expect((first?.questions ?? []).map((question) => Reflect.get(question, "prompt"))).toEqual([
      "w1",
      "w2",
      "w3",
    ]);
  });

  test("LP14. 빈 입력이나 건너뜀뿐인 입력은 구간이 없다", () => {
    expect(catalogActivitiesOf([])).toEqual([]);
    expect(catalogActivitiesOf([skip(1), skip(2)])).toEqual([]);
  });
});

// ---- catalogLessonPlanOf ----

const lessonLetter: Record<CatalogActivity["form"], string> = {
  listening: "L",
  "sentence-order": "O",
  "word-choice": "W",
  typing: "T",
  "vocab-card": "C",
  "pair-match": "P",
};

function runsOf(activities: readonly CatalogActivity[]): string {
  return activities
    .map((activity) => `${lessonLetter[activity.form]}${activity.questions.length}`)
    .join("");
}

// 유닛 × 에피소드 24칸 — [에피소드, 키, 표시 문항 수, 채점 문항 수, 건너뛴 문항 수, 구간(학습형 글자 + 문항 수)].
// 단어 카드(C)는 표시에는 세고 채점에는 세지 않는다. 빈칸 채우기(CLOZE)는 단어 선택(W)으로 선다. 소리 없는
// 듣기는 audio-missing으로, 그림 없는 그림 고르기는 image-missing으로 건너뛰어 구간이 없고, 그 자리 양옆의
// 같은 학습형은 한 구간으로 이어진다(E-2).
const planTable = [
  ["u01-water", "S1", 6, 3, 2, "C3W3"],
  ["u01-water", "S3", 6, 6, 4, "W3O3"],
  ["u01-water", "S4", 9, 4, 1, "C5W2T1W1"],
  ["u01-water", "S5", 6, 6, 5, "W1O1W2O2"],
  ["u01-water", "S6", 12, 12, 0, "T12"],
  ["u01-water", "S7", 6, 6, 0, "T2W2T2"],
  ["u01-water", "S8", 6, 6, 0, "W2T1W3"],
  ["u01-water", "S9", 9, 9, 3, "W2T1W2T2W1T1"],
  ["u02-checkin", "S1", 14, 8, 2, "C6W4O1W3"],
  ["u02-checkin", "S3", 10, 10, 5, "O2W2O2W3O1"],
  ["u02-checkin", "S4", 10, 5, 3, "C5W4T1"],
  ["u02-checkin", "S5", 10, 10, 7, "W1O1W2O1W1O2W1O1"],
  ["u02-checkin", "S6", 19, 19, 0, "T19"],
  ["u02-checkin", "S7", 12, 12, 0, "W1T1W1T1O1W2T2W1T2"],
  ["u02-checkin", "S8", 7, 7, 0, "W3T2W2"],
  ["u02-checkin", "S9", 15, 15, 4, "W1T2W4T3W2T1W2"],
  ["u03-mina", "S1", 9, 5, 1, "C4W4O1"],
  ["u03-mina", "S3", 5, 5, 3, "O2W1O1W1"],
  ["u03-mina", "S4", 6, 1, 3, "C5T1"],
  ["u03-mina", "S5", 8, 8, 5, "W2O1W1O2W1O1"],
  ["u03-mina", "S6", 14, 14, 0, "T14"],
  ["u03-mina", "S7", 6, 6, 3, "T1W3T2"],
  ["u03-mina", "S8", 5, 5, 1, "W5"],
  ["u03-mina", "S9", 10, 10, 3, "W1P1W2T1P1W2T1W1"],
] as const;

describe("catalogLessonPlanOf — 실데이터", () => {
  test.each(planTable)(
    "LP15′. %s %s → 표시 %i · 채점 %i · 건너뜀 %i · 구간 %s",
    (episodeId, key, shown, graded, skipped, runs) => {
      const plan = catalogLessonPlanOf(readyOf(episodeId), key, fill, noImageUrl);

      expect(plan).not.toBeNull();
      expect(plan?.episodeId).toBe(episodeId);
      expect(plan?.unitKey).toBe(key);
      expect(plan?.shownItemCount).toBe(shown);
      expect(plan?.questionCount).toBe(graded);
      expect(plan?.skippedItemCount).toBe(skipped);
      expect(runsOf(plan?.activities ?? [])).toBe(runs);
    },
  );

  test("LP15′. 그림 주소가 없는 실데이터에서는 어느 단어 선택 문항에도 picture 키가 없다", () => {
    for (const [episodeId, key] of planTable) {
      const plan = catalogLessonPlanOf(readyOf(episodeId), key, fill, noImageUrl);
      for (const activity of plan?.activities ?? []) {
        if (activity.form !== "word-choice") continue;
        for (const question of activity.questions) {
          expect("picture" in question).toBe(false);
        }
      }
    }
  });

  test("LP15. 모든 유닛이 계획되고 표에 빠진 칸이 없다", () => {
    const planned = realCatalog.flatMap((entry) =>
      entry.status === "ready" ? entry.episode.units.map((unit) => `${entry.id}/${unit.id}`) : [],
    );

    expect(planTable.map(([episodeId, key]) => `${episodeId}/${key}`)).toEqual(planned);
  });

  test("LP15. u01 S3의 구간 문항 수는 3,3이다 — 듣기가 빠져 양옆의 문장 순서가 한 구간이 된다", () => {
    const plan = catalogLessonPlanOf(readyOf("u01-water"), "S3", fill, noImageUrl);

    expect(plan?.activities.map((activity) => activity.questions.length)).toEqual([3, 3]);
  });

  test("LP-0. 실데이터에는 보일 문항이 0개인 유닛이 없다 — u01 S1은 카드 셋 뒤 단어 선택 셋이 선다", () => {
    const plan = catalogLessonPlanOf(readyOf("u01-water"), "S1", fill, noImageUrl);

    expect(plan?.questionCount).toBe(3);
    expect(plan?.activities.map((activity) => activity.form)).toEqual([
      "vocab-card",
      "word-choice",
    ]);
    for (const [episodeId, key, shown, graded] of planTable) {
      const found = catalogLessonPlanOf(readyOf(episodeId), key, fill, noImageUrl);
      expect(found?.shownItemCount).toBe(shown);
      expect(found?.questionCount).toBe(graded);
      expect(shown).toBeGreaterThan(0);
    }
  });

  test("LP-0. 보일 문항이 없는 유닛은 구간 0 · 표시 0 · 채점 0 · 건너뜀 전부다", () => {
    const base = readyOf("u01-water");
    const onlyCards: ReadyEntry = {
      ...base,
      episode: {
        ...base.episode,
        units: [{ id: "S1", order: 1, items: [vocabCard("V1"), imgMatch("I1"), pairMatch("P1")] }],
      },
    };

    const plan = catalogLessonPlanOf(onlyCards, "S1", fill, noImageUrl);

    expect(plan).toMatchObject({
      activities: [],
      questionCount: 0,
      shownItemCount: 0,
      skippedItemCount: 3,
    });
  });

  test("LP16. 없는 키와 최종 테스트 키는 계획이 없다", () => {
    expect(catalogLessonPlanOf(readyOf("u01-water"), "S2", fill, noImageUrl)).toBeNull();
    expect(catalogLessonPlanOf(readyOf("u01-water"), "RP", fill, noImageUrl)).toBeNull();
  });
});

describe("catalogActivityPositionOf", () => {
  const positions = (episodeId: string, key: string) => {
    const plan = catalogLessonPlanOf(readyOf(episodeId), key, fill, noImageUrl);
    if (plan === null) throw new Error("no plan");
    return plan.activities.map((_, index) => catalogActivityPositionOf(plan, index));
  };

  test("LP-E1. 활동의 오프셋은 앞 활동들의 문항 수 합이고 전체는 계획 문항 수다", () => {
    expect(positions("u01-water", "S3")).toEqual([
      { offset: 0, total: 6, last: false },
      { offset: 3, total: 6, last: true },
    ]);
    expect(positions("u02-checkin", "S3")).toEqual([
      { offset: 0, total: 10, last: false },
      { offset: 2, total: 10, last: false },
      { offset: 4, total: 10, last: false },
      { offset: 6, total: 10, last: false },
      { offset: 9, total: 10, last: true },
    ]);
  });

  test("LP-E1. 마지막 활동만 last이고 활동 하나뿐인 유닛은 오프셋 0 · 마지막이다", () => {
    for (const [episodeId, key, , , , runs] of planTable) {
      const found = positions(episodeId, key);
      expect(found.map((position) => position?.last)).toEqual(
        found.map((_, index) => index === found.length - 1),
      );
      expect(found[0]?.offset).toBe(0);
      expect(found.length).toBe((runs.match(/[A-Z]/g) ?? []).length);
    }
    expect(positions("u01-water", "S6")).toEqual([{ offset: 0, total: 12, last: true }]);
  });

  test("LP-E1. 마지막 활동의 오프셋 + 문항 수는 전체와 같다", () => {
    const plan = catalogLessonPlanOf(readyOf("u02-checkin"), "S9", fill, noImageUrl);
    const lastIndex = (plan?.activities.length ?? 0) - 1;
    const last = plan?.activities[lastIndex];

    const position = plan === null ? null : catalogActivityPositionOf(plan, lastIndex);

    expect((position?.offset ?? 0) + (last?.questions.length ?? 0)).toBe(plan?.shownItemCount);
  });

  test("LP-E1. 없는 활동 순번은 위치가 없다", () => {
    const plan = catalogLessonPlanOf(readyOf("u01-water"), "S3", fill, noImageUrl);

    expect(plan === null ? 1 : catalogActivityPositionOf(plan, 2)).toBeNull();
    expect(plan === null ? 1 : catalogActivityPositionOf(plan, -1)).toBeNull();
  });
});

describe("catalogPassCriterion", () => {
  test.each([
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 2],
    [4, 3],
    [5, 3],
    [10, 6],
    [12, 8],
    [15, 9],
    [20, 12],
  ] as const)("LP17. 채점 문항 %i개 → 정답 %i개 이상(60%% 올림, 최소 1)", (count, minCorrect) => {
    expect(catalogPassCriterion(count)).toEqual({ minCorrectCount: minCorrect });
  });

  test("LP17. 문항이 하나라도 있으면 기준은 1 이상이다", () => {
    for (let count = 1; count <= 40; count += 1) {
      expect(catalogPassCriterion(count).minCorrectCount).toBeGreaterThanOrEqual(1);
    }
  });

  test("LP17. 3문항 중 2개를 맞히면 통과하고 1개면 실패한다", () => {
    const criterion = catalogPassCriterion(3);

    expect(judgeAssessment(["correct", "correct", "incorrect"], criterion)).toBe("passed");
    expect(judgeAssessment(["correct", "incorrect", "incorrect"], criterion)).toBe("failed");
  });

  test("LP17. 15문항은 9개부터 통과이고 2개만 맞혀서는 통과하지 못한다", () => {
    const criterion = catalogPassCriterion(15);
    const results = (correct: number): AnswerResult[] =>
      Array.from({ length: 15 }, (_, i) => (i < correct ? "correct" : "incorrect"));

    expect(judgeAssessment(results(9), criterion)).toBe("passed");
    expect(judgeAssessment(results(8), criterion)).toBe("failed");
    expect(judgeAssessment(results(2), criterion)).toBe("failed");
  });

  test("LP17. 문항이 없는 유닛은 빈 결과로 통과한다", () => {
    expect(judgeAssessment([], catalogPassCriterion(0))).toBe("passed");
  });
});

describe("catalogLessonPlanFor — 메모", () => {
  test("LP18. 같은 콘텐츠로 두 번 부르면 같은 참조다", () => {
    const content = contentOf(realCatalog);

    const first = catalogLessonPlanFor(content, "u01-water", "S3", noLearnerProfile);
    const second = catalogLessonPlanFor(content, "u01-water", "S3", noLearnerProfile);

    expect(first).not.toBeNull();
    expect(second).toBe(first);
  });

  test("LP18. 같은 ready 항목을 담은 다른 콘텐츠 객체도 같은 참조다", () => {
    const first = catalogLessonPlanFor(contentOf(realCatalog), "u01-water", "S3", noLearnerProfile);
    const second = catalogLessonPlanFor(
      contentOf([...realCatalog]),
      "u01-water",
      "S3",
      noLearnerProfile,
    );

    expect(first).not.toBeNull();
    expect(second).toBe(first);
  });

  test("LP18. 다른 항목 객체(새 버전)는 다른 참조다", () => {
    const original = catalogLessonPlanFor(
      contentOf(realCatalog),
      "u01-water",
      "S3",
      noLearnerProfile,
    );
    const copy: CatalogEntry[] = [{ ...readyOf("u01-water") }, ...realCatalog.slice(1)];

    const fromCopy = catalogLessonPlanFor(contentOf(copy), "u01-water", "S3", noLearnerProfile);

    expect(fromCopy).not.toBeNull();
    expect(fromCopy).not.toBe(original);
    expect(fromCopy).toEqual(original);
  });

  test("LP18. 키마다 다른 계획이고 없는 id · 준비 안 된 id는 null이다", () => {
    const content = contentOf([
      ...realCatalog,
      { status: "pending", id: "u04-x", order: 4, title: "제목", version: "v1" },
    ]);

    const s3 = catalogLessonPlanFor(content, "u01-water", "S3", noLearnerProfile);
    const s4 = catalogLessonPlanFor(content, "u01-water", "S4", noLearnerProfile);

    expect(s3?.unitKey).toBe("S3");
    expect(s4?.unitKey).toBe("S4");
    expect(catalogLessonPlanFor(content, "nope", "S3", noLearnerProfile)).toBeNull();
    expect(catalogLessonPlanFor(content, "u04-x", "S1", noLearnerProfile)).toBeNull();
    expect(catalogLessonPlanFor(content, "u01-water", "RP", noLearnerProfile)).toBeNull();
  });
});

describe("catalogLessonPlanFor — 프로필 참조가 메모 키다", () => {
  const emma: LearnerProfile = { name: "Emma" };
  const liam: LearnerProfile = { name: "Liam" };

  test("MK-1. 같은 항목 · 같은 프로필 참조 · 같은 키는 같은 계획 참조다", () => {
    const content = contentOf(realCatalog);

    const first = catalogLessonPlanFor(content, "u02-checkin", "S3", emma);
    const second = catalogLessonPlanFor(content, "u02-checkin", "S3", emma);

    expect(first).not.toBeNull();
    expect(second).toBe(first);
  });

  test("MK-2. 다른 프로필 참조는 다른 계획 참조다", () => {
    const content = contentOf(realCatalog);

    const forEmma = catalogLessonPlanFor(content, "u02-checkin", "S3", emma);
    const forLiam = catalogLessonPlanFor(content, "u02-checkin", "S3", liam);

    expect(forEmma).not.toBeNull();
    expect(forLiam).not.toBeNull();
    expect(forLiam).not.toBe(forEmma);
  });

  // 이름이 화면에 서는 곳은 실데이터에서 최종 테스트(RP)뿐입니다 - 레슨 문항에는 이름 토큰이 없습니다.
  test("MK-2. 최종 테스트 계획의 대사 글자에 그 이름이 선다", () => {
    const content = contentOf(realCatalog);
    const sections = catalogMapSectionsOf(realCatalog);

    const forEmma = catalogFinalPlanFor(content, sections, "u02-checkin", emma);
    const forLiam = catalogFinalPlanFor(content, sections, "u02-checkin", liam);

    expect(forEmma).not.toBeNull();
    expect(forLiam).not.toBe(forEmma);
    expect(JSON.stringify(forEmma)).toContain("Emma");
    expect(JSON.stringify(forEmma)).not.toContain("Liam");
    expect(JSON.stringify(forLiam)).toContain("Liam");
    expect(JSON.stringify(forLiam)).not.toContain("Emma");
  });

  test("MK-2. 첫 프로필로 다시 부르면 첫 계획 참조가 돌아온다", () => {
    const content = contentOf(realCatalog);

    const forEmma = catalogLessonPlanFor(content, "u02-checkin", "S3", emma);
    catalogLessonPlanFor(content, "u02-checkin", "S3", liam);

    expect(catalogLessonPlanFor(content, "u02-checkin", "S3", emma)).toBe(forEmma);
  });

  test("MK-3. noLearnerProfile로 부른 계획은 빈 프로필 치환과 글자가 같다", () => {
    const content = contentOf(realCatalog);
    const entry = readyOf("u02-checkin");

    const memoized = catalogLessonPlanFor(content, "u02-checkin", "S3", noLearnerProfile);
    const direct = catalogLessonPlanOf(
      entry,
      "S3",
      (text, script) => fillPlaceholders(text, {}, script),
      content.imageUrlOf,
    );

    expect(memoized).not.toBeNull();
    expect(memoized).toEqual(direct);
  });

  test("MK-4. 정답에 {이름}이 든 타자 문항은 프로필에 따라 문항 수가 달라진다", () => {
    const base = readyOf("u02-checkin");
    const units = base.episode.units.map((unit) =>
      unit.id === "S3"
        ? {
            ...unit,
            items: [
              translateToKo("T", [t("저는 {이름}이에요.", "jeoneun {이름}ieyo.", "I'm {이름}.")]),
            ],
          }
        : unit,
    );
    const entry: CatalogEntry = { ...base, episode: { ...base.episode, units } };
    const content = contentOf([entry]);

    const blank = catalogLessonPlanFor(content, "u02-checkin", "S3", noLearnerProfile);
    const named = catalogLessonPlanFor(content, "u02-checkin", "S3", emma);

    expect(blank).toMatchObject({ shownItemCount: 1, skippedItemCount: 0 });
    expect(named).toMatchObject({ shownItemCount: 0, skippedItemCount: 1 });
  });
});

describe("순수성", () => {
  test("LP19. 입력을 바꾸지 않고 같은 입력이면 같은 결과다", () => {
    const entry = readyOf("u02-checkin");
    const snapshot = structuredClone(entry);

    const first = catalogLessonPlanOf(entry, "S3", fill, noImageUrl);
    const second = catalogLessonPlanOf(entry, "S3", fill, noImageUrl);

    expect(entry).toEqual(snapshot);
    expect(second).toEqual(first);
  });

  test("LP19. 문항 매핑도 입력을 바꾸지 않고 결정적이다", () => {
    const item = realItem("u02-checkin", "S3-02");
    const snapshot = structuredClone(item);

    const first = catalogItemOf(item, port);
    const second = catalogItemOf(item, port);

    expect(item).toEqual(snapshot);
    expect(second).toEqual(first);
  });
});

// ---- 계획의 두 수 — 채점 문항 수와 표시 문항 수 ----

const cdn = (path: string): string => `https://cdn/${path}`;

/** 뜻을 찾을 수 있는 카드 문항입니다(u01 낱말 `물`의 ref). */
const glossCard = (id: string): LearningItem => ({
  ...base(id),
  type: "VOCAB_CARD",
  ref: "voca:e70ba1ce",
  context: t("물", "mul"),
  example: t("물 주세요.", "mul juseyo."),
  cardKind: "단어",
});

const choiceCloze = (id: string): LearningItem => cloze(id, [t("가"), t("나")], [t("가")]);

/** u01 에피소드의 낱말을 그대로 두고 S1 한 유닛만 주어진 문항으로 갈아 끼운 ready 항목입니다. */
function entryWithS1(items: readonly LearningItem[]): ReadyEntry {
  const source = readyOf("u01-water");
  return {
    ...source,
    episode: { ...source.episode, units: [{ id: "S1", order: 1, items: [...items] }] },
  };
}

const repeated = (count: number, make: (id: string) => LearningItem, prefix: string) =>
  Array.from({ length: count }, (_, index) => make(`${prefix}${String(index + 1)}`));

describe("catalogActivityScoring", () => {
  test("LP-G1. 단어 카드만 채점하지 않고 나머지 다섯은 채점한다", () => {
    expect(catalogActivityScoring).toEqual({
      listening: "graded",
      "sentence-order": "graded",
      "word-choice": "graded",
      typing: "graded",
      "vocab-card": "ungraded",
      "pair-match": "graded",
    });
    expect(Object.keys(catalogActivityScoring).sort()).toEqual(Object.keys(lessonLetter).sort());
  });
});

describe("catalogLessonPlanOf — 채점 문항 수와 표시 문항 수", () => {
  test.each([
    ["카드 0장", 0, 3],
    ["카드 3장", 3, 6],
    ["카드 30장", 30, 33],
  ] as const)(
    "LP-G2. 채점 3문항 앞의 %s — 통과 기준은 카드 수와 상관없이 2다",
    (_name, cards, shown) => {
      const items = [...repeated(cards, glossCard, "V"), ...repeated(3, choiceCloze, "W")];

      const plan = catalogLessonPlanOf(entryWithS1(items), "S1", fill, noImageUrl);

      expect(plan?.questionCount).toBe(3);
      expect(plan?.shownItemCount).toBe(shown);
      expect(catalogPassCriterion(plan?.questionCount ?? 0).minCorrectCount).toBe(2);
    },
  );

  test("LP-G3. 카드뿐인 유닛은 활동 하나(카드 둘) · 채점 0 · 표시 2 · 건너뜀 0이고 빈 결과로 통과한다", () => {
    const plan = catalogLessonPlanOf(
      entryWithS1(repeated(2, glossCard, "V")),
      "S1",
      fill,
      noImageUrl,
    );

    expect(plan?.activities.map((activity) => [activity.form, activity.questions.length])).toEqual([
      ["vocab-card", 2],
    ]);
    expect(plan).toMatchObject({ questionCount: 0, shownItemCount: 2, skippedItemCount: 0 });
    expect(judgeAssessment([], catalogPassCriterion(plan?.questionCount ?? -1))).toBe("passed");
  });

  test("LP-G4. 실데이터 24유닛 모두 표시 + 건너뜀 = 문항 수이고 카드 수 = 표시 − 채점이다", () => {
    let checked = 0;
    for (const entry of realCatalog) {
      if (entry.status !== "ready") continue;
      for (const unit of entry.episode.units) {
        const plan = catalogLessonPlanOf(entry, unit.id, fill, noImageUrl);
        const cards = (plan?.activities ?? [])
          .filter((activity) => activity.form === "vocab-card")
          .reduce((sum, activity) => sum + activity.questions.length, 0);

        expect((plan?.shownItemCount ?? -1) + (plan?.skippedItemCount ?? -1)).toBe(
          unit.items.length,
        );
        expect(plan?.questionCount).toBeLessThanOrEqual(plan?.shownItemCount ?? -1);
        expect((plan?.shownItemCount ?? 0) - (plan?.questionCount ?? 0)).toBe(cards);
        checked += 1;
      }
    }
    expect(checked).toBe(24);
  });

  test("LP-G5. u01 S1의 활동 위치는 카드를 센 분모 6에서 시작한다", () => {
    const plan = catalogLessonPlanOf(readyOf("u01-water"), "S1", fill, noImageUrl);

    expect(
      plan === null ? [] : [0, 1].map((index) => catalogActivityPositionOf(plan, index)),
    ).toEqual([
      { offset: 0, total: 6, last: false },
      { offset: 3, total: 6, last: true },
    ]);
  });

  test("LP-G8. 그림 주소가 얹힌 문항은 옆의 빈칸 채우기와 한 단어 선택 구간에 선다", () => {
    const source = readyOf("u01-water");
    const units = source.episode.units.map((unit) =>
      unit.id === "S1"
        ? {
            ...unit,
            items: unit.items.map((item) =>
              item.type === "IMG_MATCH" && item.id === "S1-05"
                ? {
                    ...item,
                    stimulus: { ...item.stimulus, imageUrl: "images/u01-water/s1-05.jpg" },
                  }
                : item,
            ),
          }
        : unit,
    );
    const entry: ReadyEntry = { ...source, episode: { ...source.episode, units } };

    const plan = catalogLessonPlanOf(entry, "S1", fill, cdn);
    const choice = plan?.activities[1];
    const hasPicture = (choice?.questions ?? []).map((question) => "picture" in question);

    expect(
      plan?.activities.map((activity) => `${activity.form}:${activity.questions.length}`),
    ).toEqual(["vocab-card:3", "word-choice:4"]);
    expect(plan).toMatchObject({ shownItemCount: 7, questionCount: 4, skippedItemCount: 1 });
    expect(hasPicture).toEqual([false, true, false, false]);
  });
});

describe("catalogActivitiesOf — 새 학습형 구간", () => {
  const card = (n: number): CatalogMappedItem => ({
    kind: "vocab-card",
    itemId: `C${n}`,
    question: { word: `c${n}`, romanization: null, meaning: `m${n}`, example: null },
  });
  const pair = (n: number): CatalogMappedItem => ({
    kind: "pair-match",
    itemId: `P${n}`,
    question: { words: ["a", "b"], meanings: ["x", "y"], answer: [0, 1] },
  });
  const word = (n: number, withPicture: boolean): CatalogMappedItem => ({
    kind: "word-choice",
    itemId: `W${n}`,
    question: {
      prompt: `w${n}`,
      choices: ["a", "b"],
      answerIndex: 0,
      ...(withPicture
        ? { picture: { url: cdn(`p${String(n)}.jpg`), answerRomanization: null } }
        : {}),
    },
  });

  test("LP-G6. 같은 학습형끼리 구간이 되고 그림 문항은 옆의 단어 선택과 한 구간이다", () => {
    const items = [
      card(1),
      card(2),
      word(1, false),
      pair(1),
      pair(2),
      word(2, true),
      word(3, false),
      card(3),
    ];

    expect(
      catalogActivitiesOf(items).map((activity) => `${activity.form}:${activity.questions.length}`),
    ).toEqual(["vocab-card:2", "word-choice:1", "pair-match:2", "word-choice:2", "vocab-card:1"]);
  });
});

describe("catalogLessonPlanFor — 그림 주소 함수와 메모", () => {
  test("LP-G7. imageUrlOf만 다른 두 콘텐츠도 같은 ready 항목이면 같은 계획 참조다", () => {
    const first = contentOf(realCatalog);
    const second: EpisodeContent = { ...first, imageUrlOf: () => null };

    const a = catalogLessonPlanFor(first, "u01-water", "S1", noLearnerProfile);
    const b = catalogLessonPlanFor(second, "u01-water", "S1", noLearnerProfile);

    expect(a).not.toBeNull();
    expect(b).toBe(a);
  });
});

// ---- 스레드 경계 소스 검사 ----

describe("스레드 경계 소스 검사", () => {
  const srcRoot = resolve(process.cwd(), "src");

  function walk(dir: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
  }

  const isSource = (path: string): boolean =>
    /\.tsx?$/.test(path) && !/\.test(-support)?\.tsx?$/.test(path);

  const files = [
    "app/catalog-lesson-plan.ts",
    "app/catalog-card-map.ts",
    "app/catalog-pair-map.ts",
    "app/catalog-final-model.ts",
    "app/catalog-lesson-wiring.ts",
    "app/catalog-wiring.ts",
    "app/render-catalog.tsx",
    "app/catalog-events.ts",
  ]
    .map((name) => join(srcRoot, name))
    .filter((path) => existsSync(path));
  const targets = [
    ...files,
    ...walk(join(srcRoot, "screens/typing")),
    ...walk(join(srcRoot, "screens/catalog-final")),
  ].filter(isSource);

  const stripComments = (source: string): string =>
    source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const guardedLib = /\/lib\/(episode-[\w.-]+|placeholder-fill)$/;

  test("LP20. 검사 대상에 계획 · 최종 모델 · 이벤트와 새 화면 폴더가 든다", () => {
    const names = targets.map((path) => relative(srcRoot, path));

    expect(names).toEqual(
      expect.arrayContaining([
        "app/catalog-lesson-plan.ts",
        "app/catalog-final-model.ts",
        "app/catalog-events.ts",
        "screens/typing/typing.ts",
        "screens/catalog-final/catalog-final.ts",
      ]),
    );
  });

  test("LP20. 3a 모듈과 치환기는 import type으로만 가져오고 로케일 비교 · Intl을 쓰지 않는다", () => {
    const violations: string[] = [];
    for (const path of targets) {
      const source = stripComments(readFileSync(path, "utf8"));
      for (const match of source.matchAll(/import\s+(type\s+)?([^;]*?)\s+from\s+"([^"]+)"/g)) {
        if (guardedLib.test(match[3] ?? "") && match[1] === undefined) {
          violations.push(`${relative(srcRoot, path)}: ${match[3]}`);
        }
      }
      if (/localeCompare|\bIntl\b/.test(source)) {
        violations.push(`${relative(srcRoot, path)}: localeCompare/Intl`);
      }
    }

    expect(violations).toEqual([]);
  });
});
