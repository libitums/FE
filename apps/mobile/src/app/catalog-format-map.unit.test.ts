import { describe, expect, test } from "vitest";

import type { LearningItem, Option, Stimulus, Text, TurnTile } from "../lib/episode-content.model";
import { fillPlaceholders } from "../lib/placeholder-fill";
import { catalogItemOf, catalogTurnSpeakersOf } from "./catalog-item-map";
import type { CatalogFill, CatalogLessonItemPort, CatalogMappedItem } from "./catalog-lesson-types";

// `unit` 계층: 새 형식(2026-10-15)에서 늘어난 문항 유형 · 필드의 매핑 결과만 봅니다(순수 함수의 입출력).

const fill: CatalogFill = (text, script) => fillPlaceholders(text, {}, script);
const port: CatalogLessonItemPort = {
  fill,
  episodeId: "u01-water",
  glossOf: () => null,
  imageUrlOf: (path) => `https://cdn/${path}`,
  audioUrlOf: () => null,
};

const t = (ko: string, roman = `r-${ko}`, en?: string): Text =>
  en === undefined ? { ko, roman } : { ko, roman, en };
const ask = { ko: "질문", en: "Question" };
const opt = (id: string, ko: string, correct: boolean, en?: string): Option => ({
  id,
  ko,
  roman: `r-${ko}`,
  ...(en === undefined ? {} : { en }),
  correct,
});
const base = (id: string) => ({ id, event: "R" as const });
const feedback = { correct: { ko: "맞아요" } };

const questionOf = (mapped: CatalogMappedItem): Record<string, unknown> | undefined =>
  Reflect.get(mapped, "question") as Record<string, unknown> | undefined;
const skippedWith = (reason: string) => expect.objectContaining({ kind: "skipped", reason });

// ---- 새 11종의 u01 꼴 문항 ----

const clozeChoice = (): LearningItem => ({
  ...base("S1-15"),
  type: "CLOZE_CHOICE",
  prompt: { ko: "빈칸을 채우세요.", en: "Fill in the blank." },
  context: { ko: "___ 할게요.", roman: "___ halgeyo.", en: "I'll pay by card." },
  options: [
    opt("o1", "봉투로", false, "plastic bag"),
    opt("o2", "주스로", false, "juice"),
    opt("o3", "카드로", true, "card"),
  ],
  answers: [t("카드로", "kadeuro")],
  feedback,
});

const replySelect = (stimulus?: Stimulus): LearningItem => ({
  ...base("S2-05"),
  type: "REPLY_SELECT",
  prompt: { ko: "뭐라고 대답할까요?", en: "How do you reply?" },
  stimulus: stimulus ?? {
    audio: t("삼천 원입니다.", "samcheon wonimnida.", "That's three thousand won."),
  },
  options: [
    opt("o1", "카드로 할게요.", true),
    opt("o2", "아니요, 괜찮아요.", false),
    opt("o3", "따뜻한 물 주세요.", false),
  ],
  feedback,
});

const particleFill = (stimulus?: Stimulus): LearningItem => ({
  ...base("S5-01"),
  type: "PARTICLE_FILL",
  prompt: { ko: "알맞은 조사를 고르세요.", en: "Which particle fits?" },
  stimulus: stimulus ?? { text: t("카드___ 할게요.", "kadeu___ halgeyo.", "I'll pay by card.") },
  options: [opt("o1", "으로", false), opt("o2", "로", true)],
  feedback,
});

const particleSwap = (): LearningItem => ({
  ...base("S5-03"),
  type: "PARTICLE_SWAP",
  prompt: { ko: "조사를 고치세요.", en: "Fix the particle." },
  stimulus: { text: t("봉투이", "bongtui", "plastic bag") },
  options: [opt("o1", "으로", false), opt("o2", "가", true), opt("o3", "은", false)],
  feedback,
});

const minPair = (count: number): LearningItem => ({
  ...base("S5-06"),
  event: "D",
  type: "MIN_PAIR_AB",
  prompt: { ko: "무엇을 들었나요?", en: "Which one did you hear?" },
  stimulus: { audio: t("빵", "ppang") },
  options: [opt("o1", "방", false), opt("o2", "빵", true), opt("o3", "밤", false)].slice(0, count),
  feedback,
});

const turnTiles = (speakers: readonly (TurnTile["speaker"] | null)[]): TurnTile[] =>
  speakers.map((speaker, i) => ({
    ko: `줄${i}`,
    roman: `jul${i}`,
    en: `line ${i}`,
    ...(speaker === null || speaker === undefined ? {} : { speaker }),
  }));

const turnOrder = (tiles: TurnTile[], answer: number[]): LearningItem => ({
  ...base("S2-07"),
  type: "TURN_ORDER",
  prompt: { ko: "대화 순서대로 놓으세요.", en: "Put the conversation in order." },
  context: t("대화 순서대로 놓으세요."),
  tiles,
  answer,
});

describe("새 단어 선택 유형의 매핑", () => {
  test("MAP2. CLOZE_CHOICE는 빈칸 문장을 제시문으로, 보기는 콘텐츠 순서 그대로 낸다", () => {
    const mapped = catalogItemOf(clozeChoice(), port);

    expect(mapped.kind).toBe("word-choice");
    expect(questionOf(mapped)).toEqual({
      prompt: "___ 할게요.",
      romanization: "___ halgeyo.",
      translation: "I'll pay by card.",
      choices: ["봉투로", "주스로", "카드로"],
      answerIndex: 2,
      instruction: "Fill in the blank.",
    });
  });

  test("MAP3. REPLY_SELECT는 상대 말을 글로 보이고 대답 보기를 콘텐츠 순서로 낸다", () => {
    const mapped = catalogItemOf(replySelect(), port);

    expect(mapped.kind).toBe("word-choice");
    expect(questionOf(mapped)).toEqual({
      prompt: "삼천 원입니다.",
      romanization: "samcheon wonimnida.",
      translation: "That's three thousand won.",
      choices: ["카드로 할게요.", "아니요, 괜찮아요.", "따뜻한 물 주세요."],
      answerIndex: 0,
      instruction: "How do you reply?",
    });
  });

  test("MAP3. REPLY_SELECT에 stimulus.audio가 없으면 malformed다", () => {
    expect(catalogItemOf(replySelect({}), port)).toEqual(skippedWith("malformed"));
  });

  test("MAP4. PARTICLE_FILL은 빈칸 문장을 제시문으로, 조사 보기를 낸다", () => {
    const mapped = catalogItemOf(particleFill(), port);

    expect(mapped.kind).toBe("word-choice");
    expect(questionOf(mapped)).toEqual({
      prompt: "카드___ 할게요.",
      romanization: "kadeu___ halgeyo.",
      translation: "I'll pay by card.",
      choices: ["으로", "로"],
      answerIndex: 1,
      instruction: "Which particle fits?",
    });
  });

  test("MAP4. PARTICLE_SWAP은 틀린 구를 제시문으로, 지시문은 Fix the particle.이다", () => {
    const mapped = catalogItemOf(particleSwap(), port);

    expect(mapped.kind).toBe("word-choice");
    expect(questionOf(mapped)).toEqual({
      prompt: "봉투이",
      romanization: "bongtui",
      translation: "plastic bag",
      choices: ["으로", "가", "은"],
      answerIndex: 1,
      instruction: "Fix the particle.",
    });
  });

  test("MAP4. PARTICLE_*에 stimulus.text가 없으면 malformed다", () => {
    expect(catalogItemOf(particleFill({}), port)).toEqual(skippedWith("malformed"));
  });

  test("MAP5. MIN_PAIR_AB는 모양이 맞으면 소리가 없어도 audio null 듣기 문항, 보기 3이면 malformed다", () => {
    expect(catalogItemOf(minPair(2), port)).toMatchObject({
      kind: "listening",
      question: { audio: null },
    });
    expect(catalogItemOf(minPair(3), port)).toEqual(skippedWith("malformed"));
  });
});

describe("대화 조립의 화자", () => {
  test("MAP6. 화자가 있는 문항은 첫 턴이 고정된 첫 줄로, 나머지가 정답 순서의 화자로 칸마다 선다 — 플레이어부터도 그대로다", () => {
    const tiles = turnTiles(["player", "counterpart", "player", "counterpart"]);
    const mapped = catalogItemOf(turnOrder(tiles, [0, 1, 2, 3]), port);

    expect(mapped.kind).toBe("sentence-order");
    expect(questionOf(mapped)?.["dialogue"]).toMatchObject({
      opening: { speaker: "me", text: tiles[0]?.ko },
      speakers: ["counterpart", "me", "counterpart"],
    });
  });

  test("MAP6. 화자가 없는 문항은 짝수 턴 상대 · 홀수 턴 나로 선다 — 첫 턴(상대)은 고정된 첫 줄이다", () => {
    const tiles = turnTiles([null, null, null, null]);
    const mapped = catalogItemOf(turnOrder(tiles, [0, 1, 2, 3]), port);

    expect(questionOf(mapped)?.["dialogue"]).toMatchObject({
      opening: { speaker: "counterpart", text: tiles[0]?.ko },
      speakers: ["me", "counterpart", "me"],
    });
  });

  test("MAP6. 화자가 일부만 있으면 malformed다", () => {
    const tiles = turnTiles(["player", null, "player", "counterpart"]);

    expect(catalogItemOf(turnOrder(tiles, [0, 1, 2, 3]), port)).toEqual(skippedWith("malformed"));
  });

  test("MAP7. 빈 타일이나 정답 순열이 아닌 문항은 화자가 있어도 malformed다", () => {
    const speakers = ["player", "counterpart", "player", "counterpart"] as const;
    const blank = turnTiles(speakers).map((tile, i) => (i === 1 ? { ...tile, ko: "" } : tile));

    expect(catalogItemOf(turnOrder(blank, [0, 1, 2, 3]), port)).toEqual(skippedWith("malformed"));
    expect(catalogItemOf(turnOrder(turnTiles(speakers), [0, 1, 1, 3]), port)).toEqual(
      skippedWith("malformed"),
    );
  });

  test("TS1. 화자가 모두 있으면 그대로(player는 me)이고 같은 화자가 이어져도 그대로다", () => {
    const alternating = turnTiles(["counterpart", "player", "counterpart", "player"]);
    expect(catalogTurnSpeakersOf(alternating, [0, 1, 2, 3])).toEqual([
      "counterpart",
      "me",
      "counterpart",
      "me",
    ]);
    const repeated = turnTiles(["counterpart", "counterpart"]);
    expect(catalogTurnSpeakersOf(repeated, [0, 1])).toEqual(["counterpart", "counterpart"]);
  });

  test("TS1. 화자가 모두 없으면 짝 · 홀이고 섞이면 null이며 정답이 비면 빈 배열이다", () => {
    expect(catalogTurnSpeakersOf(turnTiles([null, null, null]), [0, 1, 2])).toEqual([
      "counterpart",
      "me",
      "counterpart",
    ]);
    expect(catalogTurnSpeakersOf(turnTiles(["player", null]), [0, 1])).toBeNull();
    expect(catalogTurnSpeakersOf(turnTiles(["player", "counterpart"]), [])).toEqual([]);
  });

  test("TS2. 칸의 화자는 타일 배열이 아니라 정답 순서를 따른다", () => {
    const tiles = turnTiles(["counterpart", "player", "player"]);

    expect(catalogTurnSpeakersOf(tiles, [1, 0, 2])).toEqual(["me", "counterpart", "me"]);
    expect(catalogTurnSpeakersOf(tiles, [2, 1, 0])).toEqual(["me", "me", "counterpart"]);
  });

  test("TS3. 같은 입력이면 같은 결과이고 입력은 바뀌지 않는다", () => {
    const tiles = turnTiles(["player", "counterpart", "player"]);
    const answer = [2, 0, 1];
    const snapshot = structuredClone({ tiles, answer });

    expect(catalogTurnSpeakersOf(tiles, answer)).toEqual(catalogTurnSpeakersOf(tiles, answer));
    expect({ tiles, answer }).toEqual(snapshot);
  });
});

describe("단서와 카드의 새 규칙", () => {
  const wordOrder = (
    stimulus: Stimulus | undefined,
    answerEn: string | undefined,
  ): LearningItem => ({
    ...base("S4-01"),
    type: "WORD_ORDER",
    prompt: { ko: "순서대로 놓으세요.", en: "Put the words in order." },
    ...(stimulus === undefined ? {} : { stimulus }),
    tiles: [t("카드로"), t("할게요")],
    answers: [t("카드로 할게요", "kadeuro halgeyo", answerEn)],
  });
  const translateToKo = (
    stimulus: Stimulus | undefined,
    answerEn: string | undefined,
  ): LearningItem => ({
    ...base("S6-01"),
    type: "TRANSLATE_TO_KO",
    prompt: { ko: "한국어로 쓰세요.", en: "Say this in Korean." },
    ...(stimulus === undefined ? {} : { stimulus }),
    answers: [t("이름", "ireum", answerEn)],
  });

  test("MAP8. WORD_ORDER는 stimulus.en을 먼저 제시문으로 쓴다(정답 en과 달라도)", () => {
    const mapped = catalogItemOf(wordOrder({ en: "I'll pay by card" }, "Paying by card"), port);

    expect(questionOf(mapped)?.["prompt"]).toBe("I'll pay by card");
  });

  test("MAP8. stimulus.en이 없으면 정답 en, 둘 다 없으면 prompt.ko가 제시문이다", () => {
    expect(
      questionOf(catalogItemOf(wordOrder(undefined, "Paying by card"), port))?.["prompt"],
    ).toBe("Paying by card");
    expect(questionOf(catalogItemOf(wordOrder({}, undefined), port))?.["prompt"]).toBe(
      "순서대로 놓으세요.",
    );
  });

  test("MAP9. TRANSLATE_TO_KO는 정답에 en이 없어도 stimulus.en을 단서로 타자 입력이 된다", () => {
    const mapped = catalogItemOf(translateToKo({ en: "name" }, undefined), port);

    expect(mapped.kind).toBe("typing");
    expect(questionOf(mapped)?.["cue"]).toBe("name");
  });

  test("MAP9. stimulus.en과 정답 en이 다르면 stimulus.en이 단서이고 둘 다 없으면 no-source다", () => {
    expect(questionOf(catalogItemOf(translateToKo({ en: "warm" }, "hot"), port))?.["cue"]).toBe(
      "warm",
    );
    expect(questionOf(catalogItemOf(translateToKo(undefined, "hot"), port))?.["cue"]).toBe("hot");
    expect(catalogItemOf(translateToKo({}, undefined), port)).toEqual(skippedWith("no-source"));
  });

  test("MAP10. 예문이 없는 VOCAB_CARD는 example null인 카드로 선다", () => {
    const card: LearningItem = {
      ...base("S3-04"),
      event: "E",
      type: "VOCAB_CARD",
      context: t("이름이 어떻게 되세요?", "ireumi eotteoke doeseyo?", "May I have your name?"),
      cardKind: "단어",
    };
    const mapped = catalogItemOf(card, port);

    expect(mapped.kind).toBe("vocab-card");
    expect(questionOf(mapped)).toMatchObject({ example: null, meaning: "May I have your name?" });
  });
});

describe("유형별 결과 표와 결정성", () => {
  const nonSpeech = (type: LearningItem["type"], extra: Record<string, unknown>): LearningItem =>
    ({ ...base(`X-${type}`), type, prompt: ask, ...extra }) as unknown as LearningItem;
  const opts3 = [opt("o1", "가", true), opt("o2", "나", false), opt("o3", "다", false)];
  const stim = { audio: t("듣기", "deutgi", "Listening"), text: t("글", "geul", "Text") };

  const cases: readonly (readonly [LearningItem, string])[] = [
    [clozeChoice(), "word-choice"],
    [replySelect(), "word-choice"],
    [particleFill(), "word-choice"],
    [particleSwap(), "word-choice"],
    [minPair(2), "listening"],
    [nonSpeech("CULTURE_CHECK", { context: t("문맥"), options: opts3, feedback }), "word-choice"],
    [nonSpeech("CULTURE_CARD", { context: t("문맥"), stimulus: stim, feedback }), "culture-card"],
    [
      nonSpeech("LISTEN_BUILD", {
        stimulus: stim,
        tiles: [t("가"), t("나")],
        answers: [t("가 나")],
      }),
      "audio-missing",
    ],
    [
      nonSpeech("SYLLABLE_BUILD", {
        stimulus: { en: "card" },
        tiles: [t("카"), t("드")],
        answers: [t("카드")],
      }),
      "syllable-build",
    ],
    [nonSpeech("SHADOW", { stimulus: stim, answers: [t("따라 말하기")] }), "read-aloud"],
    [
      nonSpeech("SPEAK_WORD", {
        stimulus: { imageUrl: "images/a.jpg" },
        answers: [t("단어", "danyeo", "word")],
      }),
      "speak-word",
    ],
  ];

  const labelled = cases.map(([item, expected]) => [item.type, item, expected] as const);

  test.each(labelled)("MAP1′. 새 유형 %s의 결과는 표와 같다", (_type, item, expected) => {
    const mapped = catalogItemOf(item, port);
    const actual = mapped.kind === "skipped" ? mapped.reason : mapped.kind;
    expect(actual).toBe(expected);
  });

  test.each(labelled)(
    "MAP12. 새 유형 %s를 두 번 매핑하면 같고 입력은 바뀌지 않는다",
    (_type, item) => {
      const snapshot = structuredClone(item);

      expect(catalogItemOf(item, port)).toEqual(catalogItemOf(item, port));
      expect(item).toEqual(snapshot);
    },
  );

  test("LB1. LISTEN_BUILD는 타일 · 정답이 비어 있어도(모양 검사 없이) audio-missing으로 건너뛴다", () => {
    const empty = nonSpeech("LISTEN_BUILD", { stimulus: stim, tiles: [], answers: [] });

    expect(catalogItemOf(empty, port)).toEqual({
      kind: "skipped",
      itemId: "X-LISTEN_BUILD",
      type: "LISTEN_BUILD",
      reason: "audio-missing",
    });
  });

  test("MAP1. 스킵 결과는 어떤 유형이든 itemId · type을 싣는다", () => {
    const mapped = catalogItemOf(
      nonSpeech("LISTEN_BUILD", { stimulus: stim, tiles: [], answers: [] }),
      port,
    );

    expect(mapped).toEqual({
      kind: "skipped",
      itemId: "X-LISTEN_BUILD",
      type: "LISTEN_BUILD",
      reason: "audio-missing",
    });
  });
});

describe("기존 13종의 결과 표 (MAP1)", () => {
  const raw = (type: string, extra: Record<string, unknown>): LearningItem =>
    ({ ...base(`X-${type}`), type, prompt: ask, ...extra }) as unknown as LearningItem;
  const opts3 = [opt("o1", "가", true), opt("o2", "나", false), opt("o3", "다", false)];
  const opts4 = [...opts3, opt("o4", "라", false)];
  const speaker = (ko: string, who: "player" | "counterpart") => ({ ...t(ko), speaker: who });
  const pairs = [
    { left: t("가"), right: "a" },
    { left: t("나"), right: "b" },
  ];

  const cases: readonly (readonly [LearningItem, string])[] = [
    [raw("VOCAB_CARD", { context: t("물", "mul", "water"), cardKind: "단어" }), "vocab-card"],
    [
      raw("CLOZE", {
        context: t("___ 문맥"),
        tiles: [t("가"), t("나"), t("다")],
        answers: [t("가")],
      }),
      "word-choice",
    ],
    [
      raw("IMG_MATCH", {
        stimulus: { imageUrl: "images/a.jpg" },
        options: [opt("o1", "가", true, "a"), opt("o2", "나", false)],
      }),
      "word-choice",
    ],
    [
      raw("WORD_ORDER", { tiles: [t("가"), t("나")], answers: [t("가 나", "ga na", "ga na")] }),
      "sentence-order",
    ],
    [
      raw("LISTEN_SELECT", { stimulus: { audio: t("듣기", "deutgi") }, options: opts4 }),
      "listening",
    ],
    [
      raw("TURN_ORDER", {
        context: t("문맥"),
        tiles: [speaker("가", "counterpart"), speaker("나", "player")],
        answer: [0, 1],
      }),
      "sentence-order",
    ],
    [raw("ROLE_LINE", { context: t("상대 대사"), options: opts3, feedback }), "word-choice"],
    [raw("TRANSLATE_TO_KO", { answers: [t("정답", "jeongdap", "answer")] }), "typing"],
    [raw("TRANSLATE_TO_EN", { stimulus: { text: t("글") }, options: opts4 }), "word-choice"],
    [
      raw("DICTATION", { stimulus: { audio: t("받아쓰기", "badasseugi") }, answers: [t("정답")] }),
      "typing",
    ],
    [
      raw("SENT_BUILD", { context: t("패턴"), answers: [t("정답", "jeongdap", "answer")] }),
      "typing",
    ],
    [raw("PAIR_MATCH", { tiles: [t("가"), t("나")], pairs }), "pair-match"],
    [
      raw("ROLEPLAY_TURN", {
        context: t("상대 대사"),
        stimulus: {},
        tiles: [t("내")],
        answers: [t("내")],
        feedback,
        roleplay: { lineId: "D2", tilesGloss: [] },
      }),
      "malformed",
    ],
  ];

  const labelled = cases.map(([item, expected]) => [item.type, item, expected] as const);

  test.each(labelled)("MAP1. 기존 유형 %s의 결과는 지금과 같다", (_type, item, expected) => {
    const mapped = catalogItemOf(item, port);
    const actual = mapped.kind === "skipped" ? mapped.reason : mapped.kind;
    expect(actual).toBe(expected);
  });

  test("MAP1. 기존 표는 13종을 한 번씩 덮는다", () => {
    expect(new Set<string>(cases.map(([item]) => item.type)).size).toBe(13);
  });
});
