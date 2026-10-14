import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import type { CatalogEntry } from "../lib/episode-catalog";
import type { LearningItem, Option, Text, Word } from "../lib/episode-content.model";
import { fillPlaceholders } from "../lib/placeholder-fill";
import { catalogGlossOf, vocabCardItemOf } from "./catalog-card-map";
import { pictureChoiceItemOf } from "./catalog-choice-map";
import { catalogItemOf } from "./catalog-item-map";
import { englishOf } from "./catalog-item-text";
import type { CatalogFill, CatalogLessonItemPort, CatalogMappedItem } from "./catalog-lesson-types";
import { pairMatchItemOf } from "./catalog-pair-map";

// `unit` 계층: 단어 카드 · 짝 맞추기 · 그림 고르기 매핑과 낱말 뜻 조회의 입출력만 봅니다.

type ReadyEntry = Extract<CatalogEntry, { status: "ready" }>;
type ItemOf<T extends LearningItem["type"]> = Extract<LearningItem, { type: T }>;

const realCatalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});

const fill: CatalogFill = (text, script) => fillPlaceholders(text, {}, script);
const cdn = (path: string): string => `https://cdn/${path}`;

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

function portOf(
  episodeId: string,
  words: readonly Word[],
  imageUrlOf: (path: string) => string | null = cdn,
): CatalogLessonItemPort {
  return { fill, episodeId, glossOf: catalogGlossOf(words, fill), imageUrlOf };
}

const realPort = (episodeId: string, imageUrlOf?: (path: string) => string | null) =>
  portOf(episodeId, readyOf(episodeId).episode.words, imageUrlOf);

const episodeIds = ["u01-water", "u02-checkin", "u03-mina"] as const;

function realItemsOf<T extends LearningItem["type"]>(
  type: T,
): readonly { readonly episodeId: string; readonly item: ItemOf<T> }[] {
  return episodeIds.flatMap((episodeId) =>
    readyOf(episodeId).episode.units.flatMap((unit) =>
      unit.items.flatMap((item) =>
        item.type === type ? [{ episodeId, item: item as ItemOf<T> }] : [],
      ),
    ),
  );
}

const questionOf = (mapped: CatalogMappedItem): Record<string, unknown> | undefined =>
  Reflect.get(mapped, "question") as Record<string, unknown> | undefined;

const skipped = (itemId: string, type: LearningItem["type"], reason: string) => ({
  kind: "skipped",
  itemId,
  type,
  reason,
});

const word = (id: string, glossEn: string): Word => ({
  id,
  ko: "낱말",
  roman: "nalmal",
  glossEn,
  role: "target",
});

// ---- 낱말 뜻 조회 ----

describe("catalogGlossOf", () => {
  const u01Words = readyOf("u01-water").episode.words;

  test("CI-G1. ref로 찾고 없는 ref · 비어 있는 뜻은 null, 같은 id가 둘이면 첫 항목이다", () => {
    const fixture = [word("blank", "   "), word("dup", "first"), word("dup", "second")];

    expect(catalogGlossOf(u01Words, fill)("voca:e70ba1ce")).toBe("water");
    expect(catalogGlossOf(u01Words, fill)(undefined)).toBeNull();
    expect(catalogGlossOf(u01Words, fill)("nope")).toBeNull();
    expect(catalogGlossOf(fixture, fill)("blank")).toBeNull();
    expect(catalogGlossOf(fixture, fill)("dup")).toBe("first");
  });

  test("CI-G2. 뜻은 치환기를 지나고 앞뒤 공백이 걷힌다", () => {
    const fixture = [word("greet", "Hello {이름}"), word("pad", "  padded  ")];

    expect(catalogGlossOf(fixture, fill)("greet")).toBe("Hello ireum");
    expect(catalogGlossOf(fixture, fill)("pad")).toBe("padded");
  });
});

// ---- 단어 카드 ----

const cardItem = (id: string, over: Partial<Omit<ItemOf<"VOCAB_CARD">, "type">> = {}) =>
  ({
    id,
    event: "E",
    type: "VOCAB_CARD",
    context: { ko: "물", roman: "mul" },
    example: { ko: "물 주세요.", roman: "mul juseyo.", en: "Water, please." },
    cardKind: "단어",
    ...over,
  }) satisfies ItemOf<"VOCAB_CARD">;

describe("vocabCardItemOf", () => {
  const fixtureWords = [word("w:water", "water")];
  const fixturePort = portOf("ep", fixtureWords);

  test("CI-V1. 실데이터 u01 S1-02는 표제어 · 로마자 · 뜻 · 예문(번역 포함)을 가진 카드다", () => {
    const mapped = vocabCardItemOf(
      realItem("u01-water", "S1-02") as ItemOf<"VOCAB_CARD">,
      realPort("u01-water"),
    );

    expect(mapped).toEqual({
      kind: "vocab-card",
      itemId: "S1-02",
      question: {
        word: "괜찮아요.",
        romanization: "gwaenchanayo.",
        meaning: "It's okay.",
        example: {
          text: "아니요, 괜찮아요.",
          romanization: "aniyo, gwaenchanayo.",
          translation: "No, I'm fine.",
        },
      },
    });
  });

  test("CI-V2. 예문 번역이 없으면 translation null, 예문이 표제어와 같으면 카드는 예문 없이 선다", () => {
    const noTranslation = vocabCardItemOf(
      realItem("u01-water", "S1-01") as ItemOf<"VOCAB_CARD">,
      realPort("u01-water"),
    );
    const sameAsWord = vocabCardItemOf(
      realItem("u03-mina", "S4-03") as ItemOf<"VOCAB_CARD">,
      realPort("u03-mina"),
    );

    expect(noTranslation.kind).toBe("vocab-card");
    expect(questionOf(noTranslation)?.["example"]).toEqual(
      expect.objectContaining({ text: "물 주세요.", translation: null }),
    );
    expect(sameAsWord.kind).toBe("vocab-card");
    expect(questionOf(sameAsWord)?.["example"]).toBeNull();
  });

  test.each([
    ["ref도 context.en도 없다", cardItem("A"), skipped("A", "VOCAB_CARD", "no-gloss")],
    ["ref가 낱말에 없다", cardItem("B", { ref: "nope" }), skipped("B", "VOCAB_CARD", "no-gloss")],
    [
      "표제어가 공백이다",
      cardItem("D", { ref: "w:water", context: { ko: "  ", roman: "mul" } }),
      skipped("D", "VOCAB_CARD", "malformed"),
    ],
  ] as const)("CI-V3. 건너뜀 — %s", (_name, item, expected) => {
    expect(vocabCardItemOf(item, fixturePort)).toEqual(expected);
  });

  test("CI-V3. ref가 없어도 context.en이 있으면 그 글자가 뜻이다", () => {
    const mapped = vocabCardItemOf(
      cardItem("C", { context: { ko: "물", roman: "mul", en: "ctx" } }),
      fixturePort,
    );

    expect(mapped.kind).toBe("vocab-card");
    expect(questionOf(mapped)?.["meaning"]).toBe("ctx");
  });

  test("CI-V3. ref의 낱말 뜻이 context.en보다 먼저다", () => {
    const mapped = vocabCardItemOf(
      cardItem("C2", { ref: "w:water", context: { ko: "물", roman: "mul", en: "ctx" } }),
      fixturePort,
    );

    expect(questionOf(mapped)?.["meaning"]).toBe("water");
  });

  test("CI-V3. 로마자가 비면 romanization null로, 예문 한글이 비면 example null로 카드가 선다", () => {
    const noRoman = vocabCardItemOf(
      cardItem("E", { ref: "w:water", context: { ko: "물", roman: "" } }),
      fixturePort,
    );
    const noExample = vocabCardItemOf(
      cardItem("F", { ref: "w:water", example: { ko: " " } }),
      fixturePort,
    );

    expect(noRoman.kind).toBe("vocab-card");
    expect(questionOf(noRoman)?.["romanization"]).toBeNull();
    expect(noExample.kind).toBe("vocab-card");
    expect(questionOf(noExample)?.["example"]).toBeNull();
  });

  test("CI-V3. 표제어 · 뜻 · 예문의 자리표시자는 치환기를 지난다", () => {
    const mapped = vocabCardItemOf(
      cardItem("G", {
        ref: "w:greet",
        context: { ko: "{이름}", roman: "{이름}" },
        example: { ko: "저는 {이름}이에요.", roman: "jeoneun ireum.", en: "I'm {이름}." },
      }),
      portOf("ep", [word("w:greet", "Hello {이름}")]),
    );

    expect(mapped).toEqual({
      kind: "vocab-card",
      itemId: "G",
      question: {
        word: "이름",
        romanization: "ireum",
        meaning: "Hello ireum",
        example: {
          text: "저는 이름이에요.",
          romanization: "jeoneun ireum.",
          translation: "I'm ireum.",
        },
      },
    });
  });

  test("CI-V4. 실데이터 카드 28문항이 전부 서고 뜻이 있으며 예문 27 · 번역 16이다", () => {
    const cards = realItemsOf("VOCAB_CARD");
    const mapped = cards.map(({ episodeId, item }) => vocabCardItemOf(item, realPort(episodeId)));
    const questions = mapped.map((entry) => questionOf(entry));

    expect(cards).toHaveLength(28);
    expect(mapped.every((entry) => entry.kind === "vocab-card")).toBe(true);
    expect(questions.every((question) => String(question?.["meaning"] ?? "") !== "")).toBe(true);
    expect(questions.filter((question) => question?.["example"] !== null)).toHaveLength(27);
    expect(
      questions.filter((question) => {
        const example = question?.["example"] as { translation: string | null } | null | undefined;
        return example !== null && example !== undefined && example.translation !== null;
      }),
    ).toHaveLength(16);
  });
});

// ---- 짝 맞추기 ----

const pairItem = (
  id: string,
  tiles: readonly string[],
  pairs: readonly (readonly [string, string])[],
): ItemOf<"PAIR_MATCH"> => ({
  id,
  event: "R",
  type: "PAIR_MATCH",
  prompt: { ko: "이으세요.", en: "Match the pairs." },
  tiles: tiles.map((ko): Text => ({ ko, roman: `r-${ko}` })),
  pairs: pairs.map(([ko, right]) => ({ left: { ko, roman: `r-${ko}` }, right })),
});

describe("pairMatchItemOf", () => {
  const port = portOf("ep", []);
  const expectedMeaning: Record<string, string> = {
    이름: "name",
    안녕하세요: "hi, hello",
    반갑다: "nice to meet, happy",
    어느: "which, how",
  };

  test("CI-P1. 실데이터 u03 S9-04는 뜻 열만 섞인 짝 맞추기 문항이다 — 지시문은 싣지 않는다", () => {
    const mapped = pairMatchItemOf(
      realItem("u03-mina", "S9-04") as ItemOf<"PAIR_MATCH">,
      realPort("u03-mina"),
    );
    const question = questionOf(mapped) as
      | { words: string[]; meanings: string[]; answer: number[] }
      | undefined;

    expect(mapped.kind).toBe("pair-match");
    expect(question?.words).toEqual(["이름", "안녕하세요", "반갑다", "어느"]);
    const contentOrder = ["name", "hi, hello", "nice to meet, happy", "which, how"];
    expect([...(question?.meanings ?? [])].sort()).toEqual([...contentOrder].sort());
    expect(question?.meanings).not.toEqual(contentOrder);
    (question?.words ?? []).forEach((text, w) => {
      expect(question?.meanings[question.answer[w] ?? -1]).toBe(expectedMeaning[text]);
    });
    expect(question !== undefined && "instruction" in question).toBe(false);
  });

  test("CI-P2. 같은 문항을 두 번 매핑하면 같고 입력은 바뀌지 않는다", () => {
    const item = realItem("u03-mina", "S9-04") as ItemOf<"PAIR_MATCH">;
    const snapshot = structuredClone(item);

    const first = pairMatchItemOf(item, realPort("u03-mina"));
    const second = pairMatchItemOf(item, realPort("u03-mina"));

    expect(second).toEqual(first);
    expect(item).toEqual(snapshot);
  });

  test.each([
    ["짝이 하나", pairItem("P1", ["가"], [["가", "a"]])],
    [
      "짝 수와 타일 수가 다르다",
      pairItem(
        "P2",
        ["가", "나", "다"],
        [
          ["가", "a"],
          ["나", "b"],
        ],
      ),
    ],
    [
      "왼쪽 낱말이 공백이다",
      pairItem(
        "P3",
        ["가", "나"],
        [
          [" ", "a"],
          ["나", "b"],
        ],
      ),
    ],
    [
      "오른쪽 뜻이 공백이다",
      pairItem(
        "P4",
        ["가", "나"],
        [
          ["가", "a"],
          ["나", "  "],
        ],
      ),
    ],
    [
      "같은 낱말이 둘이다",
      pairItem(
        "P5",
        ["가", "가"],
        [
          ["가", "a"],
          ["가", "b"],
        ],
      ),
    ],
    ["짝이 없다", pairItem("P6", ["가", "나"], [])],
  ] as const)("CI-P3. 건너뜀 — %s", (_name, item) => {
    expect(pairMatchItemOf(item, port)).toEqual(skipped(item.id, "PAIR_MATCH", "malformed"));
  });

  test("CI-P4. 같은 뜻이 둘이어도 문항이 서고 낱말의 자리표시자는 치환된다", () => {
    const sameMeaning = pairMatchItemOf(
      pairItem(
        "P7",
        ["가", "나", "다"],
        [
          ["가", "x"],
          ["나", "x"],
          ["다", "y"],
        ],
      ),
      port,
    );
    const filled = pairMatchItemOf(
      pairItem(
        "P8",
        ["{이름}", "나"],
        [
          ["{이름}", "name"],
          ["나", "me"],
        ],
      ),
      port,
    );

    expect(sameMeaning.kind).toBe("pair-match");
    const meanings = (questionOf(sameMeaning)?.["meanings"] ?? []) as string[];
    expect(meanings.filter((meaning) => meaning === "x")).toHaveLength(2);
    expect(filled.kind).toBe("pair-match");
    expect(questionOf(filled)?.["words"]).toEqual(["이름", "나"]);
  });
});

// ---- 그림 고르기 ----

const optionOf = (
  id: string,
  ko: string,
  correct: boolean,
  over: Partial<Option> = {},
): Option => ({
  id,
  ko,
  roman: `r-${ko}`,
  en: `en-${ko}`,
  correct,
  ...over,
});

/** 실데이터 u01 S1-05에 바꿀 자리만 얹은 그림 고르기 문항입니다. */
function pictureItem(
  over: {
    imageUrl?: string | null;
    options?: Option[];
    ref?: string | null;
  } = {},
): ItemOf<"IMG_MATCH"> {
  const base = realItem("u01-water", "S1-05") as ItemOf<"IMG_MATCH">;
  const { ref: _ref, ...withoutRef } = base;
  const stimulus = { ...base.stimulus };
  delete stimulus.imageUrl;
  if (over.imageUrl !== null) stimulus.imageUrl = over.imageUrl ?? "images/u01-water/s1-05.jpg";
  const ref = over.ref === undefined ? base.ref : over.ref;
  return {
    ...withoutRef,
    ...(ref === null || ref === undefined ? {} : { ref }),
    stimulus,
    options: over.options ?? base.options,
  };
}

describe("pictureChoiceItemOf", () => {
  const port = realPort("u01-water");
  const withoutCorrectEn = (): Option[] =>
    (realItem("u01-water", "S1-05") as ItemOf<"IMG_MATCH">).options.map((option) => {
      const { en: _en, ...rest } = option;
      return option.correct ? rest : option;
    });

  test("CI-I1. 실데이터 그림 고르기 10문항은 전부 그림이 없어 image-missing으로 건너뛴다", () => {
    const items = realItemsOf("IMG_MATCH");

    expect(items).toHaveLength(10);
    for (const { episodeId, item } of items) {
      expect(pictureChoiceItemOf(item, realPort(episodeId))).toEqual(
        skipped(item.id, "IMG_MATCH", "image-missing"),
      );
    }
  });

  test("CI-I2. 그림 주소가 있으면 정답 낱말의 영어 뜻이 제시문인 그림 문항이 선다", () => {
    const mapped = pictureChoiceItemOf(pictureItem(), port);

    expect(mapped).toEqual({
      kind: "word-choice",
      itemId: "S1-05",
      question: {
        prompt: "water",
        choices: ["카드", "현금", "물", "영수증"],
        answerIndex: 2,
        instruction: "Which word matches the picture?",
        picture: { url: "https://cdn/images/u01-water/s1-05.jpg", answerRomanization: "mul" },
      },
    });
    const keys = Object.keys(questionOf(mapped) ?? {});
    expect(keys).not.toContain("romanization");
    expect(keys).not.toContain("translation");
  });

  test("CI-I3. 그림 주소를 풀 수 없으면 image-missing이다", () => {
    expect(
      pictureChoiceItemOf(
        pictureItem(),
        realPort("u01-water", () => null),
      ),
    ).toEqual(skipped("S1-05", "IMG_MATCH", "image-missing"));
  });

  test("CI-I3. 정답 보기에 영어가 없으면 ref 낱말의 뜻이 제시문이고, ref도 없으면 no-gloss다", () => {
    const viaRef = pictureChoiceItemOf(pictureItem({ options: withoutCorrectEn() }), port);
    const noRef = pictureChoiceItemOf(
      pictureItem({ options: withoutCorrectEn(), ref: null }),
      port,
    );

    expect(viaRef.kind).toBe("word-choice");
    expect(questionOf(viaRef)?.["prompt"]).toBe("water");
    expect(noRef).toEqual(skipped("S1-05", "IMG_MATCH", "no-gloss"));
  });

  test("CI-I3. 정답 보기의 로마자가 비면 answerRomanization null로 문항이 선다", () => {
    const options = [optionOf("o1", "카드", false), optionOf("o2", "물", true, { roman: "" })];

    const mapped = pictureChoiceItemOf(pictureItem({ options }), port);

    expect(mapped.kind).toBe("word-choice");
    expect(questionOf(mapped)?.["picture"]).toEqual({
      url: "https://cdn/images/u01-water/s1-05.jpg",
      answerRomanization: null,
    });
  });

  test.each([
    ["보기가 하나", [optionOf("o1", "물", true)]],
    ["보기 글자가 공백", [optionOf("o1", " ", false), optionOf("o2", "물", true)]],
    ["정답이 없다", [optionOf("o1", "카드", false), optionOf("o2", "물", false)]],
  ] as const)("CI-I3. 건너뜀 — %s", (_name, options) => {
    expect(pictureChoiceItemOf(pictureItem({ options: [...options] }), port)).toEqual(
      skipped("S1-05", "IMG_MATCH", "malformed"),
    );
  });

  test("CI-I4. 판정 순서는 모양 → 그림 → 뜻이다", () => {
    const oneOption = pictureChoiceItemOf(
      pictureItem({ imageUrl: null, options: [optionOf("o1", "물", true)] }),
      port,
    );
    const noPictureNoGloss = pictureChoiceItemOf(
      pictureItem({ imageUrl: null, options: withoutCorrectEn(), ref: null }),
      port,
    );

    expect(oneOption).toEqual(skipped("S1-05", "IMG_MATCH", "malformed"));
    expect(noPictureNoGloss).toEqual(skipped("S1-05", "IMG_MATCH", "image-missing"));
  });
});

// ---- 위임 ----

describe("catalogItemOf — 세 유형", () => {
  test("CI-X1. 세 유형은 각자의 매핑으로 위임되고 screen-pending으로 건너뛰지 않는다", () => {
    const card = realItem("u01-water", "S1-02") as ItemOf<"VOCAB_CARD">;
    const pair = realItem("u03-mina", "S9-04") as ItemOf<"PAIR_MATCH">;
    const picture = realItem("u01-water", "S1-05") as ItemOf<"IMG_MATCH">;

    const cardMapped = catalogItemOf(card, realPort("u01-water"));
    const pairMapped = catalogItemOf(pair, realPort("u03-mina"));
    const pictureMapped = catalogItemOf(picture, realPort("u01-water"));

    expect(cardMapped).toEqual(vocabCardItemOf(card, realPort("u01-water")));
    expect(pairMapped).toEqual(pairMatchItemOf(pair, realPort("u03-mina")));
    expect(pictureMapped).toEqual(pictureChoiceItemOf(picture, realPort("u01-water")));
    expect(cardMapped.kind).toBe("vocab-card");
    expect(pairMapped.kind).toBe("pair-match");
    expect(pictureMapped).toEqual(skipped("S1-05", "IMG_MATCH", "image-missing"));
    for (const mapped of [cardMapped, pairMapped, pictureMapped]) {
      expect(Reflect.get(mapped, "reason")).not.toBe("screen-pending");
    }
  });
});

// ---- 스레드 경계 소스 검사 ----

// ---- 3d-2: 스크립트 셋 — 영어 출처에는 영어 나라 이름, 로마자 출처에는 로마자, 한글 출처에는 한글 ----

const GERMANY = { ko: "독일", roman: "dogil", en: "Germany" } as const;
const germanFill: CatalogFill = (text, script) =>
  fillPlaceholders(text, { country: GERMANY }, script);
const option = (id: string, ko: string, correct: boolean, en?: string) => ({
  id,
  ko,
  roman: `r-${ko}`,
  ...(en === undefined ? {} : { en }),
  correct,
});
const asItem = (value: Record<string, unknown>): LearningItem => value as unknown as LearningItem;

function germanPortOf(words: readonly Word[] = []): CatalogLessonItemPort {
  return {
    fill: germanFill,
    episodeId: "ep",
    glossOf: catalogGlossOf(words, germanFill),
    imageUrlOf: cdn,
  };
}

describe("englishOf", () => {
  test("EN-0. 없거나 빈 문자열은 undefined, 나라는 영어 이름으로 선다", () => {
    expect(englishOf(germanPortOf(), undefined)).toBeUndefined();
    expect(englishOf(germanPortOf(), "   ")).toBeUndefined();
    expect(englishOf(germanPortOf(), " I'm from {나라}. ")).toBe("I'm from Germany.");
  });
});

describe("catalogItemOf — 나라 객체 프로필", () => {
  const fromGermany = {
    ko: "저는 {나라}에서 왔어요.",
    roman: "jeoneun {나라}eseo wasseoyo.",
    en: "I'm from {나라}.",
  };

  test("EN-1. 빈칸 채우기: 지시문 · 번역은 영어, 로마자 줄은 로마자, 문장은 한글이다", () => {
    const mapped = catalogItemOf(
      asItem({
        id: "C1",
        event: "E",
        type: "CLOZE",
        prompt: { ko: "질문", en: "Where is {나라}?" },
        context: fromGermany,
        tiles: [{ ko: "왔어요" }, { ko: "갔어요" }],
        answers: [{ ko: "왔어요" }],
      }),
      germanPortOf(),
    );

    expect(questionOf(mapped)).toMatchObject({
      instruction: "Where is Germany?",
      translation: "I'm from Germany.",
      romanization: "jeoneun dogireseo wasseoyo.",
      prompt: "저는 독일에서 왔어요.",
    });
  });

  test("EN-1. 역할 대사 고르기: 번역은 영어, 로마자 줄은 로마자, 문장은 한글이다", () => {
    const mapped = catalogItemOf(
      asItem({
        id: "R1",
        event: "E",
        type: "ROLE_LINE",
        prompt: { ko: "질문", en: "Answer." },
        context: {
          ko: "{나라}에서 오셨어요?",
          roman: "{나라}eseo osyeosseoyo?",
          en: "Are you from {나라}?",
        },
        options: [option("a", "네", true), option("b", "아니요", false)],
      }),
      germanPortOf(),
    );

    expect(questionOf(mapped)).toMatchObject({
      prompt: "독일에서 오셨어요?",
      romanization: "dogireseo osyeosseoyo?",
      translation: "Are you from Germany?",
    });
  });

  test("EN-1. 문장 순서: 영어 번역이 제시문이다", () => {
    const mapped = catalogItemOf(
      asItem({
        id: "W1",
        event: "E",
        type: "WORD_ORDER",
        prompt: { ko: "질문", en: "Put it in order: {나라}" },
        tiles: [{ ko: "저는" }, { ko: "{나라}에서" }, { ko: "왔어요" }],
        answers: [{ ko: "저는 {나라}에서 왔어요", roman: "x", en: "I'm from {나라}." }],
      }),
      germanPortOf(),
    );

    expect(questionOf(mapped)).toMatchObject({
      prompt: "I'm from Germany.",
      instruction: "Put it in order: Germany",
    });
  });

  test("EN-1. 한국어로 쓰기: 영어 단서에 영어 나라 이름이 서고 정답은 한글이다", () => {
    const mapped = catalogItemOf(
      asItem({
        id: "T1",
        event: "E",
        type: "TRANSLATE_TO_KO",
        prompt: { ko: "질문", en: "Type it." },
        answers: [{ ko: "저는 {나라}에서 왔어요", roman: "x", en: "I'm from {나라}." }],
      }),
      germanPortOf(),
    );

    expect(questionOf(mapped)).toMatchObject({
      cue: "I'm from Germany.",
      answers: ["저는 독일에서 왔어요"],
    });
  });

  test("EN-1. 받아쓰기: 로마자 단서는 로마자, 보조 영어 뜻은 영어다", () => {
    const mapped = catalogItemOf(
      asItem({
        id: "D1",
        event: "E",
        type: "DICTATION",
        prompt: { ko: "질문", en: "Type what you hear." },
        stimulus: {
          audio: {
            ko: "저는 {나라}에서 왔어요",
            roman: "jeoneun {나라}eseo wasseoyo",
            en: "I'm from {나라}.",
          },
        },
        answers: [{ ko: "저는 {나라}에서 왔어요" }],
      }),
      germanPortOf(),
    );

    expect(questionOf(mapped)).toMatchObject({
      cue: "jeoneun dogireseo wasseoyo",
      cueSupport: "I'm from Germany.",
    });
  });

  test("EN-1. 패턴 쓰기: 영어 단서에 영어 나라 이름이 서고 힌트는 한글이다", () => {
    const mapped = catalogItemOf(
      asItem({
        id: "S1",
        event: "E",
        type: "SENT_BUILD",
        prompt: { ko: "질문", en: "Build it." },
        context: { ko: "{나라}에서 왔어요", roman: "r" },
        answers: [{ ko: "저는 {나라}에서 왔어요", roman: "x", en: "I'm from {나라}." }],
      }),
      germanPortOf(),
    );

    expect(questionOf(mapped)).toMatchObject({ cue: "I'm from Germany.", hint: "독일에서 왔어요" });
  });

  test("EN-1. 단어 카드: 낱말 뜻 · 맥락 번역 · 예문 번역은 영어, 로마자는 로마자, 낱말은 한글이다", () => {
    const mapped = catalogItemOf(
      asItem({
        ...cardItem("V1"),
        context: { ko: "{나라}", roman: "{나라}eseo", en: "from {나라}" },
        example: fromGermany,
      }),
      germanPortOf(),
    );

    expect(questionOf(mapped)).toMatchObject({
      word: "독일",
      romanization: "dogireseo",
      meaning: "from Germany",
      example: {
        text: "저는 독일에서 왔어요.",
        romanization: "jeoneun dogireseo wasseoyo.",
        translation: "I'm from Germany.",
      },
    });
  });

  test("EN-1. 단어 카드: ref로 찾은 낱말 뜻(glossEn)은 영어 나라 이름이다", () => {
    const mapped = catalogItemOf(
      asItem({ ...cardItem("V2"), ref: "w:from" }),
      germanPortOf([word("w:from", "from {나라}")]),
    );

    expect(questionOf(mapped)).toMatchObject({ meaning: "from Germany" });
  });

  test("EN-1. 짝 맞추기: 뜻 열은 영어, 낱말 열은 한글이다", () => {
    const mapped = catalogItemOf(
      asItem({
        id: "P1",
        event: "E",
        type: "PAIR_MATCH",
        prompt: { ko: "질문", en: "Match." },
        tiles: [{ ko: "A" }, { ko: "B" }],
        pairs: [
          { left: { ko: "{나라}", roman: "{나라}" }, right: "{나라}" },
          { left: { ko: "가", roman: "ga" }, right: "left" },
        ],
      }),
      germanPortOf(),
    );

    const question = questionOf(mapped);
    expect(question?.["words"]).toEqual(["독일", "가"]);
    expect(question?.["meanings"]).toEqual(expect.arrayContaining(["Germany", "left"]));
  });

  test("EN-1. 그림 고르기: 정답 보기의 영어 뜻이 제시문이고 지시문도 영어다", () => {
    const mapped = catalogItemOf(
      asItem({
        id: "I1",
        event: "E",
        type: "IMG_MATCH",
        prompt: { ko: "질문", en: "Which is {나라}?" },
        stimulus: { imageUrl: "images/a.jpg" },
        options: [option("a", "독일", true, "{나라}"), option("b", "가", false, "other")],
      }),
      germanPortOf(),
    );

    expect(questionOf(mapped)).toMatchObject({
      prompt: "Germany",
      instruction: "Which is Germany?",
    });
  });
});

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

  const targets = [
    join(srcRoot, "app/catalog-card-map.ts"),
    join(srcRoot, "app/catalog-pair-map.ts"),
    ...walk(join(srcRoot, "screens/vocab-card")),
    ...walk(join(srcRoot, "screens/pair-match")),
    join(srcRoot, "screens/word-choice/word-choice-picture.ts"),
    join(srcRoot, "screens/word-choice/use-word-choice-picture.ts"),
    join(srcRoot, "screens/word-choice/WordChoicePicture.tsx"),
  ].filter((path) => isSource(path) && existsSync(path));

  const stripComments = (source: string): string =>
    source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const guardedLib = /\/lib\/(episode-[\w.-]+|placeholder-fill)$/;

  test("CI-X2. 검사 대상에 새 매핑 · 화면 파일이 든다", () => {
    const names = targets.map((path) => relative(srcRoot, path));

    expect(names).toEqual(
      expect.arrayContaining([
        "app/catalog-card-map.ts",
        "app/catalog-pair-map.ts",
        "screens/vocab-card/vocab-card.ts",
        "screens/pair-match/pair-match.ts",
        "screens/word-choice/word-choice-picture.ts",
        "screens/word-choice/use-word-choice-picture.ts",
        "screens/word-choice/WordChoicePicture.tsx",
      ]),
    );
  });

  test("CI-X2. 3a 모듈과 치환기는 import type으로만 가져오고 로케일 비교 · Intl을 쓰지 않는다", () => {
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
