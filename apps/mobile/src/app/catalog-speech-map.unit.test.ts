import { describe, expect, test } from "vitest";

import type { LearningItem, Stimulus, Text } from "../lib/episode-content.model";
import type { FillScript } from "../lib/placeholder-fill";
import { readAloudItemOf, speakWordItemOf } from "./catalog-speech-map";
import type { CatalogLessonItemPort, CatalogMappedItem } from "./catalog-lesson-types";

// `unit` 계층: 말하기 두 유형(SHADOW · SPEAK_WORD)의 매핑 입출력만 봅니다(순수 함수).

type ShadowItem = Extract<LearningItem, { type: "SHADOW" }>;
type SpeakWordItem = Extract<LearningItem, { type: "SPEAK_WORD" }>;

const identityFill = (text: string): string => text;
const portOf = (overrides: Partial<CatalogLessonItemPort> = {}): CatalogLessonItemPort => ({
  fill: identityFill,
  episodeId: "u01-water",
  glossOf: () => null,
  imageUrlOf: (path) => `https://cdn/${path}`,
  ...overrides,
});

const t = (ko: string, roman?: string, en?: string): Text => ({
  ko,
  ...(roman === undefined ? {} : { roman }),
  ...(en === undefined ? {} : { en }),
});

const shadow = (answers: Text[], stimulus: Stimulus = {}, id = "S5-09"): ShadowItem => ({
  id,
  event: "E",
  type: "SHADOW",
  prompt: { ko: "듣고 따라 말하세요.", en: "Listen and repeat." },
  stimulus,
  answers,
});

const speakWord = (
  answers: Text[],
  stimulus: Stimulus = { imageUrl: "content/images/items/card.jpg" },
  extra: { ref?: string; prompt?: Text } = {},
): SpeakWordItem => ({
  id: "S6-06",
  event: "R",
  type: "SPEAK_WORD",
  prompt: extra.prompt ?? { ko: "그림을 보고 말하세요.", en: "Say the word for the picture." },
  stimulus,
  answers,
  ...(extra.ref === undefined ? {} : { ref: extra.ref }),
});

const questionOf = (mapped: CatalogMappedItem): Record<string, unknown> | undefined =>
  Reflect.get(mapped, "question") as Record<string, unknown> | undefined;
const keysOf = (mapped: CatalogMappedItem): string[] =>
  Object.keys(questionOf(mapped) ?? {}).sort();

describe("readAloudItemOf — SHADOW", () => {
  const cardItem = (): ShadowItem =>
    shadow([t("카드로 할게요.", "kadeuro halgeyo.", "I'll pay by card.")], {
      text: t("카드로 할게요.", "kadeuro halgeyo.", "I'll pay by card."),
      audio: t("카드로 할게요.", "kadeuro halgeyo.", "I'll pay by card."),
      audioUrl: "",
      imageUrl: "",
    });

  test("RAM1. u01 S5-09 꼴은 부호를 그대로 둔 문장 · 로마자 · 영어 세 줄이다", () => {
    const mapped = readAloudItemOf(cardItem(), portOf());

    expect(mapped).toEqual({
      kind: "read-aloud",
      itemId: "S5-09",
      question: {
        sentence: "카드로 할게요.",
        romanization: "kadeuro halgeyo.",
        translation: "I'll pay by card.",
      },
    });
  });

  test("RAM1. 질문 키는 세 줄뿐이고 prompt.en(Listen and repeat.)은 싣지 않는다", () => {
    const mapped = readAloudItemOf(cardItem(), portOf());

    expect(keysOf(mapped)).toEqual(["romanization", "sentence", "translation"]);
    expect(JSON.stringify(questionOf(mapped))).not.toContain("Listen and repeat");
  });

  test("RAM2. 세 줄은 모두 answers[0]에서 온다 — stimulus.text의 자리표시자 영어가 새지 않는다", () => {
    const item = shadow(
      [t("안녕하세요, 저는 은지예요.", "annyeonghaseyo, jeoneun eunjiyeyo.", "Hello, I'm Eunji.")],
      {
        text: t("안녕하세요, 저는 은지예요.", "stimulus-roman", "Hello, I'm {이름}."),
        audio: t("안녕하세요, 저는 은지예요.", "audio-roman", "Hello, I'm Eunji."),
      },
      "S5-10",
    );

    expect(questionOf(readAloudItemOf(item, portOf()))).toEqual({
      sentence: "안녕하세요, 저는 은지예요.",
      romanization: "annyeonghaseyo, jeoneun eunjiyeyo.",
      translation: "Hello, I'm Eunji.",
    });
  });

  test("RAM3. answers가 비면 stimulus.text의 세 줄을 쓴다", () => {
    const item = shadow([], { text: t("물 주세요.", "mul juseyo.", "Water, please.") });

    expect(questionOf(readAloudItemOf(item, portOf()))).toEqual({
      sentence: "물 주세요.",
      romanization: "mul juseyo.",
      translation: "Water, please.",
    });
  });

  test("RAM3. answers[0].ko가 공백뿐이면 stimulus.text의 세 줄을 쓴다", () => {
    const item = shadow([t("   ", "answer-roman", "answer-en")], {
      text: t("물 주세요.", "mul juseyo.", "Water, please."),
    });

    expect(questionOf(readAloudItemOf(item, portOf()))).toEqual({
      sentence: "물 주세요.",
      romanization: "mul juseyo.",
      translation: "Water, please.",
    });
  });

  test("RAM3. 두 묶음 모두 한국어가 비면 malformed로 건너뛴다", () => {
    expect(readAloudItemOf(shadow([], {}), portOf())).toEqual({
      kind: "skipped",
      itemId: "S5-09",
      type: "SHADOW",
      reason: "malformed",
    });
    expect(readAloudItemOf(shadow([t(" ")], { text: t("  ", "r", "e") }), portOf())).toMatchObject({
      kind: "skipped",
      reason: "malformed",
    });
  });

  test("RAM4. 자리표시자는 줄마다 알맞은 스크립트로 치환되고 앞뒤 공백이 걷힌다", () => {
    const scripted = (text: string, script: FillScript): string =>
      text.replace(
        "{n}",
        script === "ko" ? "은지" : script === "roman" ? "Eunji-roman" : "Eunji-en",
      );
    const item = shadow([t("  저는 {n}예요.  ", "  jeoneun {n}yeyo.  ", "  I'm {n}.  ")]);

    expect(questionOf(readAloudItemOf(item, portOf({ fill: scripted })))).toEqual({
      sentence: "저는 은지예요.",
      romanization: "jeoneun Eunji-romanyeyo.",
      translation: "I'm Eunji-en.",
    });
  });

  test("RAM5. 로마자 · 영어가 없거나 공백이면 각각 null이고 문장은 선다", () => {
    expect(questionOf(readAloudItemOf(shadow([t("네.")]), portOf()))).toEqual({
      sentence: "네.",
      romanization: null,
      translation: null,
    });
    expect(questionOf(readAloudItemOf(shadow([t("네.", "  ", "  ")]), portOf()))).toEqual({
      sentence: "네.",
      romanization: null,
      translation: null,
    });
    expect(questionOf(readAloudItemOf(shadow([t("네.", "ne.")]), portOf()))).toEqual({
      sentence: "네.",
      romanization: "ne.",
      translation: null,
    });
  });

  test("RAM6. 같은 문항을 두 번 매핑하면 같고 입력은 바뀌지 않는다", () => {
    const item = cardItem();
    const snapshot = structuredClone(item);

    expect(readAloudItemOf(item, portOf())).toEqual(readAloudItemOf(item, portOf()));
    expect(item).toEqual(snapshot);
  });
});

describe("speakWordItemOf — SPEAK_WORD", () => {
  const cardWord = (): SpeakWordItem =>
    speakWord([t("카드", "kadeu", "card")], {
      imageBrief: "a credit card",
      audioUrl: "",
      imageUrl: "content/images/items/card.jpg",
    });

  test("SWM1. u01 S6-06 꼴은 그림 주소 · 영어 뜻 · 정답 · 로마자 · 지시문이다", () => {
    expect(speakWordItemOf(cardWord(), portOf())).toEqual({
      kind: "speak-word",
      itemId: "S6-06",
      question: {
        pictureUrl: "https://cdn/content/images/items/card.jpg",
        meaning: "card",
        answers: ["카드"],
        romanization: "kadeu",
        instruction: "Say the word for the picture.",
      },
    });
  });

  test("SWM2. 정답이 0개이거나 전부 공백이면 그림 · 뜻이 있어도 malformed다", () => {
    expect(speakWordItemOf(speakWord([]), portOf())).toMatchObject({
      kind: "skipped",
      reason: "malformed",
    });
    expect(speakWordItemOf(speakWord([t(" ", "r", "card"), t("")]), portOf())).toMatchObject({
      kind: "skipped",
      reason: "malformed",
    });
  });

  test("SWM2. 그림 주소가 없거나 풀 수 없으면 뜻이 있어도 image-missing이다", () => {
    expect(speakWordItemOf(speakWord([t("카드", "kadeu", "card")], {}), portOf())).toMatchObject({
      kind: "skipped",
      reason: "image-missing",
    });
    expect(speakWordItemOf(cardWord(), portOf({ imageUrlOf: () => null }))).toMatchObject({
      kind: "skipped",
      reason: "image-missing",
    });
  });

  test("SWM2. 정답이 비면 그림이 없어도 malformed가 image-missing보다 먼저다", () => {
    expect(speakWordItemOf(speakWord([], {}), portOf())).toMatchObject({ reason: "malformed" });
  });

  test("SWM2. 뜻이 answers[0].en에도 glossOf에도 없으면 no-gloss다", () => {
    expect(speakWordItemOf(speakWord([t("카드", "kadeu")]), portOf())).toMatchObject({
      kind: "skipped",
      reason: "no-gloss",
    });
  });

  test("SWM3. 뜻은 answers[0].en이 먼저이고 없으면 glossOf(ref)다", () => {
    const glossOf = (ref: string | undefined): string | null =>
      ref === "voca:card" ? "gloss card" : null;

    expect(
      questionOf(
        speakWordItemOf(
          speakWord([t("카드", "kadeu", "card")], undefined, { ref: "voca:card" }),
          portOf({ glossOf }),
        ),
      ),
    ).toMatchObject({ meaning: "card" });
    expect(
      questionOf(
        speakWordItemOf(
          speakWord([t("카드", "kadeu")], undefined, { ref: "voca:card" }),
          portOf({ glossOf }),
        ),
      ),
    ).toMatchObject({ meaning: "gloss card" });
  });

  test("SWM4. 여러 정답은 빈 값을 빼고 순서를 지키며 로마자는 answers[0]의 것이다", () => {
    const item = speakWord([t("카드", "kadeu", "card"), t(" "), t("카드요", "kadeuyo")]);

    expect(questionOf(speakWordItemOf(item, portOf()))).toMatchObject({
      answers: ["카드", "카드요"],
      romanization: "kadeu",
    });
  });

  test("SWM4. 로마자가 없으면 null이고 prompt.en이 공백이면 instruction 키가 없다", () => {
    const item = speakWord([{ ko: "카드", en: "card" }], undefined, {
      prompt: { ko: "그림을 보고 말하세요.", en: "   " },
    });
    const question = questionOf(speakWordItemOf(item, portOf()));

    expect(question).toMatchObject({ romanization: null });
    expect(question).not.toHaveProperty("instruction");
  });

  test("SWM5. image_brief · audio_url은 어떤 키로도 실리지 않는다", () => {
    const mapped = speakWordItemOf(
      speakWord([t("카드", "kadeu", "card")], {
        imageBrief: "a credit card",
        audioUrl: "content/audio/card.mp3",
        imageUrl: "content/images/items/card.jpg",
      }),
      portOf(),
    );

    expect(keysOf(mapped)).toEqual([
      "answers",
      "instruction",
      "meaning",
      "pictureUrl",
      "romanization",
    ]);
    expect(JSON.stringify(questionOf(mapped))).not.toContain("credit card");
    expect(JSON.stringify(questionOf(mapped))).not.toContain("audio");
  });

  test("SWM6. 같은 문항을 두 번 매핑하면 같고 입력은 바뀌지 않는다", () => {
    const item = cardWord();
    const snapshot = structuredClone(item);

    expect(speakWordItemOf(item, portOf())).toEqual(speakWordItemOf(item, portOf()));
    expect(item).toEqual(snapshot);
  });
});
