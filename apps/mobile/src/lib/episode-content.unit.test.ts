import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

import { describe, expect, test } from "vitest";

import {
  decodeEpisode,
  type DecodeIssue,
  type DecodeResult,
  type Episode,
} from "./episode-content";
import { KNOWN_ITEM_TYPES } from "./episode-content.schema";
import { bundledCatalogInput } from "./episode-bundled";
import { legacyCatalogInput } from "./episode-legacy.test-support";
import { minimalRoleplayTurnWire } from "./episode-content.test-support";

// `unit` 계층: 순수 함수 `decodeEpisode`의 입출력만 봅니다 (ADR-0006 D4).
// 와이어 모양은 `docs/specs/episode-content-json-contract.md` §2 ~ §8을 따릅니다.
// 스키마(`deliveryEpisodeSchema`)는 직접 부르지 않고 디코더 경계로만 검증합니다.

type Wire = Record<string, unknown>;
type ItemType = (typeof KNOWN_ITEM_TYPES)[number];

const t2 = (ko: string): Wire => ({ ko, roman: `r-${ko}` });
const t3 = (ko: string): Wire => ({ ko, roman: `r-${ko}`, en: `e-${ko}` });
const prompt = (): Wire => ({ ko: "질문", en: "question" });

function options(count: number): Wire[] {
  return Array.from({ length: count }, (_, i) => {
    const option: Wire = {
      id: `o${i + 1}`,
      ko: `보기${i + 1}`,
      roman: `bogi${i + 1}`,
      correct: i === 0,
    };
    return i === 0 ? option : { ...option, why_wrong: "이 자리에 맞는 말이 아니다" };
  });
}

function without(source: Wire, key: string): Wire {
  return Object.fromEntries(Object.entries(source).filter(([name]) => name !== key));
}

/** 타입마다 최소 유효 문항(와이어 모양)을 만듭니다. `extra`는 마지막에 덮어씁니다. */
function item(type: ItemType, id: string, extra: Wire = {}): Wire {
  const base: Wire = { id, type, mode: "choice", event: "R" };
  const bodies: Record<ItemType, Wire> = {
    VOCAB_CARD: {
      mode: "card",
      event: "E",
      context: t2("문맥"),
      example: t2("예문"),
      card_kind: "단어",
    },
    CLOZE: {
      mode: "tiles",
      prompt: prompt(),
      context: t2("___ 문맥"),
      tiles: [t2("가"), t2("나"), t2("다")],
      answers: [t2("가")],
    },
    IMG_MATCH: {
      prompt: prompt(),
      stimulus: { image_brief: "brief" },
      options: options(4),
    },
    WORD_ORDER: {
      mode: "tiles",
      prompt: prompt(),
      tiles: [t2("가"), t2("나"), t2("다")],
      answers: [t3("가 나 다")],
    },
    LISTEN_SELECT: {
      prompt: prompt(),
      stimulus: { audio: t3("듣기") },
      options: options(4),
    },
    TURN_ORDER: {
      mode: "tiles",
      prompt: prompt(),
      context: t2("문맥"),
      tiles: [t3("A"), t3("B"), t3("C"), t3("D")],
      answers: [t2("A | B | C | D")],
    },
    ROLE_LINE: {
      prompt: prompt(),
      context: t3("상대 대사"),
      options: options(3),
      feedback: { correct: { ko: "맞아요" }, wrong_option: "o2" },
    },
    TRANSLATE_TO_KO: {
      mode: "typing",
      prompt: prompt(),
      answers: [t3("정답")],
    },
    TRANSLATE_TO_EN: {
      prompt: prompt(),
      stimulus: { text: t2("문장") },
      options: options(4),
    },
    DICTATION: {
      mode: "typing",
      prompt: prompt(),
      stimulus: { audio: t3("받아쓰기") },
      answers: [t3("정답")],
    },
    SENT_BUILD: {
      mode: "typing",
      prompt: prompt(),
      context: t2("패턴"),
      answers: [t3("정답")],
    },
    PAIR_MATCH: {
      mode: "match",
      prompt: prompt(),
      tiles: [t2("A"), t2("B"), t2("C"), t2("D")],
      tiles_gloss_en: "a / b / c / d",
      answers: [t2("A=a | B=b | C=c | D=d")],
    },
    ROLEPLAY_TURN: minimalRoleplayTurnWire(id),
    CLOZE_CHOICE: {
      prompt: prompt(),
      context: t3("___ 문맥"),
      options: options(4),
      answers: [t3("정답")],
      feedback: { correct: { ko: "맞아요" } },
    },
    REPLY_SELECT: {
      prompt: prompt(),
      stimulus: { audio: t3("상대 말") },
      options: options(3),
      feedback: { correct: { ko: "맞아요" } },
    },
    MIN_PAIR_AB: {
      event: "D",
      prompt: prompt(),
      stimulus: { audio: t3("빵") },
      options: options(2),
      feedback: { correct: { ko: "맞아요" } },
    },
    PARTICLE_FILL: {
      prompt: prompt(),
      stimulus: { text: t3("봉투___") },
      options: options(2),
      feedback: { correct: { ko: "맞아요" } },
    },
    PARTICLE_SWAP: {
      prompt: prompt(),
      stimulus: { text: t3("봉투이") },
      options: options(3),
      feedback: { correct: { ko: "맞아요" } },
    },
    CULTURE_CHECK: {
      prompt: prompt(),
      context: t3("문화 문맥"),
      options: options(3),
      feedback: { correct: { ko: "맞아요" } },
    },
    CULTURE_CARD: {
      mode: "card",
      event: "E",
      context: t3("문화 카드"),
      stimulus: { text: t3("문화 본문") },
      feedback: { correct: { ko: "맞아요" } },
    },
    LISTEN_BUILD: {
      mode: "tiles",
      prompt: prompt(),
      stimulus: { audio: t3("듣기") },
      tiles: [t2("가"), t2("나"), t2("다")],
      answers: [t3("가 나 다")],
    },
    SYLLABLE_BUILD: {
      mode: "tiles",
      prompt: prompt(),
      stimulus: { en: "card" },
      tiles: [t2("카"), t2("드")],
      answers: [t3("카드")],
    },
    SHADOW: {
      mode: "speech",
      event: "E",
      prompt: prompt(),
      stimulus: { text: t3("따라 말하기") },
      answers: [t3("따라 말하기")],
    },
    SPEAK_WORD: {
      mode: "speech",
      prompt: prompt(),
      stimulus: { image_brief: "brief" },
      answers: [t3("단어")],
    },
  };
  return { ...base, ...bodies[type], ...extra };
}

const roleLine = (id: string, extra: Wire = {}): Wire => item("ROLE_LINE", id, extra);
const step = (id: string, order: number, items: Wire[]): Wire => ({ id, order, items });
const rpStep = (order: number): Wire => step("RP", order, [item("ROLEPLAY_TURN", "RP-01")]);

function cut(index: number, extra: Wire = {}): Wire {
  return {
    index,
    kind: "pre",
    cut_kind: "narration",
    narration: t3("지문"),
    image_brief: "brief",
    image_url: "",
    ...extra,
  };
}

function dialogueLine(seq: number, extra: Wire = {}): Wire {
  return {
    seq,
    role: seq % 2 === 1 ? "counterpart" : "player",
    text: t3(`대사${seq}`),
    audio_url: "",
    ...extra,
  };
}

/** 스텝 S1(order 1, ROLE_LINE 1) + RP(order 2) · 컷 1+1 · 대화 2 · 단어 1 · 패턴 1 인 최소 에피소드. */
function minimalEpisode(overrides: Wire = {}): Wire {
  return {
    schema: "delivery-2",
    unit_id: "u99-unit",
    title: "최소 에피소드",
    day: 1,
    time_of_day: "낮",
    place: "최소 에피소드",
    counterpart: "미나",
    pre_cuts: [cut(1)],
    dialogue: [dialogueLine(1), dialogueLine(2)],
    post_cuts: [cut(1, { kind: "post" })],
    steps: [step("S1", 1, [roleLine("S1-01")]), rpStep(2)],
    words: [{ id: "voca:1", ko: "물", roman: "mul", gloss_en: "water", role: "target" }],
    patterns: [{ id: "patt:1", ko: "{명사} 주세요", roman: "juseyo", gloss_en: "please give me" }],
    ...overrides,
  };
}

/** S1의 문항 하나만 바꾼 에피소드. */
const withItem = (it: Wire): Wire => minimalEpisode({ steps: [step("S1", 1, [it]), rpStep(2)] });

function failed(result: DecodeResult): DecodeIssue[] {
  if (result.ok) {
    throw new Error("실패여야 하는데 ok === true 입니다");
  }
  return result.errors;
}

function passed(result: DecodeResult): { episode: Episode; warnings: DecodeIssue[] } {
  if (!result.ok) {
    throw new Error(`성공이어야 하는데 실패했습니다: ${JSON.stringify(result.errors)}`);
  }
  return result;
}

const codeAndPath = (issues: DecodeIssue[]) => issues.map(({ code, path }) => ({ code, path }));

function unitItem(episode: Episode, unit = 0, index = 0) {
  const found = episode.units[unit]?.items[index];
  if (found === undefined) {
    throw new Error(`units[${unit}].items[${index}] 가 없습니다`);
  }
  return found;
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectKeys);
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([key, child]) => [key, ...collectKeys(child)]);
  }
  return [];
}

describe("decodeEpisode", () => {
  test("U1. 최소 에피소드는 성공하고 id · 유닛 · 최종 테스트가 맞다", () => {
    const { episode, warnings } = passed(decodeEpisode(minimalEpisode()));
    expect(episode.id).toBe("u99-unit");
    expect(episode.units).toHaveLength(1);
    expect(episode.finalTest.id).toBe("RP");
    expect(warnings).toEqual([]);
  });

  test('U2. schema가 "delivery-1"이면 schema-mismatch 하나만 돌려준다', () => {
    const errors = failed(decodeEpisode(minimalEpisode({ schema: "delivery-1" })));
    expect(codeAndPath(errors)).toEqual([{ code: "schema-mismatch", path: "schema" }]);
  });

  test("U3. title이 없으면 invalid-shape path title", () => {
    const errors = failed(decodeEpisode(without(minimalEpisode(), "title")));
    expect(codeAndPath(errors)).toContainEqual({ code: "invalid-shape", path: "title" });
  });

  test("U3b. title_en은 앞뒤 공백을 걷어 titleEn으로 싣고, 없거나 비면 키가 없다", () => {
    expect(
      passed(decodeEpisode(minimalEpisode({ title_en: "  Buying Water " }))).episode,
    ).toMatchObject({ titleEn: "Buying Water" });
    for (const wire of [
      minimalEpisode(),
      minimalEpisode({ title_en: "   " }),
      minimalEpisode({ title_en: null }),
    ]) {
      expect(passed(decodeEpisode(wire)).episode).not.toHaveProperty("titleEn");
    }
  });

  test("U4. 모르는 문항 type은 unknown-item-type 하나, path는 type, message에 값", () => {
    const errors = failed(decodeEpisode(withItem(roleLine("S1-01", { type: "QUIZ" }))));
    expect(errors).toHaveLength(1);
    expect(errors[0]?.code).toBe("unknown-item-type");
    expect(errors[0]?.path).toBe("steps[0].items[0].type");
    expect(errors[0]?.message).toContain("QUIZ");
  });

  test("U4. 모르는 type이 있으면 다른 구조 오류와 섞이지 않는다", () => {
    const input = without(withItem({ id: "S1-01", type: "QUIZ" }), "title");
    const errors = failed(decodeEpisode(input));
    expect(codeAndPath(errors)).toEqual([
      { code: "unknown-item-type", path: "steps[0].items[0].type" },
    ]);
  });

  test.each([
    ["정답이 하나도 없다", options(3).map((o) => ({ ...o, correct: false }))],
    ["정답이 둘이다", options(3).map((o, i) => ({ ...o, correct: i < 2 }))],
  ])("U5. options의 correct가 정확히 1개가 아니면 option-correct-count (%s)", (_name, opts) => {
    const errors = failed(decodeEpisode(withItem(roleLine("S1-01", { options: opts }))));
    expect(codeAndPath(errors)).toContainEqual({
      code: "option-correct-count",
      path: "steps[0].items[0].options",
    });
  });

  test.each([
    ["숫자", 42],
    ["null", null],
    ["문자열", "delivery-2"],
    ["빈 배열", []],
    ["undefined", undefined],
  ])("U6. 객체가 아닌 입력(%s)은 예외 없이 schema-mismatch", (_name, input) => {
    const errors = failed(decodeEpisode(input));
    expect(errors[0]?.code).toBe("schema-mismatch");
  });

  test("U7. TURN_ORDER 문자열 정답이 tiles 인덱스 배열이 된다", () => {
    const input = withItem(
      item("TURN_ORDER", "S1-01", {
        tiles: [t3("B"), t3("D"), t3("A"), t3("C")],
        answers: [t2("A | B | C | D")],
      }),
    );
    const found = unitItem(passed(decodeEpisode(input)).episode);
    expect(found.type).toBe("TURN_ORDER");
    expect(found).toHaveProperty("answer", [2, 0, 3, 1]);
    expect("answers" in found).toBe(false);
  });

  test.each([
    ["정답 조각이 tiles에 없다", [t3("A"), t3("B"), t3("C"), t3("D")], "A | B | C | X"],
    ["조각 수가 tiles 수와 다르다", [t3("A"), t3("B"), t3("C"), t3("D")], "A | B | C"],
    ["tiles에 중복 타일이 있다", [t3("A"), t3("A"), t3("B"), t3("C")], "A | A | B | C"],
  ])("U8. TURN_ORDER 정답을 풀 수 없으면 string-answer-malformed (%s)", (_name, tiles, answer) => {
    const input = withItem(item("TURN_ORDER", "S1-01", { tiles, answers: [t2(answer)] }));
    const errors = failed(decodeEpisode(input));
    expect(codeAndPath(errors)).toContainEqual({
      code: "string-answer-malformed",
      path: "steps[0].items[0].answers",
    });
  });

  test("U9. PAIR_MATCH 문자열 정답이 pairs 배열이 된다 (정답 문자열의 순서, = 뒤 쉼표 보존)", () => {
    const input = withItem(
      item("PAIR_MATCH", "S1-01", {
        tiles: [t2("반갑다"), t2("이름"), t2("어느"), t2("안녕하세요")],
        answers: [t2("이름=name | 안녕하세요=hi, hello | 반갑다=nice | 어느=which")],
      }),
    );
    const found = unitItem(passed(decodeEpisode(input)).episode);
    expect(found).toHaveProperty("pairs.length", 4);
    expect(found).toHaveProperty("pairs.0.left.ko", "이름");
    expect(found).toHaveProperty("pairs.1.left.ko", "안녕하세요");
    expect(found).toHaveProperty("pairs.1.left.roman", "r-안녕하세요");
    expect(found).toHaveProperty("pairs.1.right", "hi, hello");
    expect("answers" in found).toBe(false);
    expect("tiles_gloss_en" in found).toBe(false);
    expect("tilesGlossEn" in found).toBe(false);
  });

  test.each([
    ["조각에 =가 없다", "A=a | B | C=c | D=d"],
    ["left가 tiles에 없다", "A=a | B=b | C=c | X=x"],
  ])("U10. PAIR_MATCH 정답을 풀 수 없으면 string-answer-malformed (%s)", (_name, answer) => {
    const input = withItem(item("PAIR_MATCH", "S1-01", { answers: [t2(answer)] }));
    const errors = failed(decodeEpisode(input));
    expect(errors.map((e) => e.code)).toContain("string-answer-malformed");
  });

  test("U11. 빈 문자열 audio_url · image_url · ref는 도메인에서 키가 없다", () => {
    const input = minimalEpisode({
      pre_cuts: [cut(1, { image_url: "" })],
      dialogue: [dialogueLine(1, { audio_url: "" }), dialogueLine(2)],
      steps: [
        step("S1", 1, [
          item("DICTATION", "S1-01", {
            ref: "",
            stimulus: { audio: t3("받아쓰기"), audio_url: "", image_url: "" },
          }),
        ]),
        rpStep(2),
      ],
    });
    const { episode } = passed(decodeEpisode(input));
    const found = unitItem(episode);
    const line = episode.dialogue[0];
    const firstCut = episode.prologue[0];
    expect(line).toBeDefined();
    expect(firstCut).toBeDefined();
    expect(line !== undefined && "audioUrl" in line).toBe(false);
    expect(firstCut !== undefined && "imageUrl" in firstCut).toBe(false);
    expect("ref" in found).toBe(false);
    const stimulusKeys = Object.keys(Reflect.get(found, "stimulus") as object);
    expect(stimulusKeys).not.toContain("audioUrl");
    expect(stimulusKeys).not.toContain("imageUrl");
  });

  test("U12. 값이 있는 image_url · ref는 그대로 보존되고 camelCase가 된다", () => {
    const input = minimalEpisode({
      pre_cuts: [cut(1, { image_url: "images/x/pre-1.jpg", image_brief: "장면" })],
      steps: [step("S1", 1, [roleLine("S1-01", { ref: "voca:1" })]), rpStep(2)],
    });
    const { episode, warnings } = passed(decodeEpisode(input));
    expect(episode.prologue[0]).toHaveProperty("imageUrl", "images/x/pre-1.jpg");
    expect(episode.prologue[0]).toHaveProperty("imageBrief", "장면");
    expect(unitItem(episode)).toHaveProperty("ref", "voca:1");
    expect(warnings).toEqual([]);
  });

  test("U13. words · patterns에 없는 ref는 성공하되 unresolved-ref 경고 하나", () => {
    const { warnings } = passed(decodeEpisode(withItem(roleLine("S1-01", { ref: "voca:none" }))));
    expect(codeAndPath(warnings)).toEqual([
      { code: "unresolved-ref", path: "steps[0].items[0].ref" },
    ]);
    expect(warnings[0]?.message).toContain("voca:none");
  });

  test("U14. 같은 미해결 ref를 문항 둘이 가리키면 경고도 둘", () => {
    const input = minimalEpisode({
      steps: [
        step("S1", 1, [
          roleLine("S1-01", { ref: "voca:none" }),
          roleLine("S1-02", { ref: "voca:none" }),
        ]),
        rpStep(2),
      ],
    });
    const { warnings } = passed(decodeEpisode(input));
    expect(warnings).toHaveLength(2);
    expect(warnings.every((w) => w.code === "unresolved-ref")).toBe(true);
  });

  test.each([
    ["RP 스텝이 없다", [step("S1", 1, [roleLine("S1-01")])]],
    [
      "RP 스텝이 둘이다",
      [
        step("S1", 1, [roleLine("S1-01")]),
        step("RP", 2, [item("ROLEPLAY_TURN", "RP-01")]),
        step("RP", 3, [item("ROLEPLAY_TURN", "RP-02")]),
      ],
    ],
  ])("U15. 최종 테스트가 정확히 하나가 아니면 final-test-missing (%s)", (_name, steps) => {
    const errors = failed(decodeEpisode(minimalEpisode({ steps })));
    expect(errors.map((e) => e.code)).toContain("final-test-missing");
  });

  test("U16. RP의 order가 마지막이 아니면 final-test-position", () => {
    const input = minimalEpisode({
      steps: [step("S1", 2, [roleLine("S1-01")]), rpStep(1)],
    });
    const errors = failed(decodeEpisode(input));
    expect(errors.map((e) => e.code)).toContain("final-test-position");
  });

  test("U17. 역순 입력도 유닛 · 컷 · 대화가 오름차순으로 나온다", () => {
    const input = minimalEpisode({
      steps: [step("S3", 2, [roleLine("S3-01")]), step("S1", 1, [roleLine("S1-01")]), rpStep(3)],
      pre_cuts: [cut(2), cut(1)],
      post_cuts: [cut(3, { kind: "post" }), cut(1, { kind: "post" }), cut(2, { kind: "post" })],
      dialogue: [dialogueLine(2), dialogueLine(1)],
    });
    const { episode } = passed(decodeEpisode(input));
    expect(episode.units.map((u) => u.id)).toEqual(["S1", "S3"]);
    expect(episode.units.map((u) => u.order)).toEqual([1, 2]);
    expect(episode.prologue.map((c) => c.index)).toEqual([1, 2]);
    expect(episode.epilogue.map((c) => c.index)).toEqual([1, 2, 3]);
    expect(episode.dialogue.map((d) => d.seq)).toEqual([1, 2]);
  });

  test("U18. 문항 id가 중복되면 duplicate-item-id, path는 두 번째 문항의 id", () => {
    const input = minimalEpisode({
      steps: [step("S1", 1, [roleLine("S1-01"), roleLine("S1-01")]), rpStep(2)],
    });
    const errors = failed(decodeEpisode(input));
    expect(codeAndPath(errors)).toContainEqual({
      code: "duplicate-item-id",
      path: "steps[0].items[1].id",
    });
  });

  describe("ROLEPLAY_TURN은 엄격한 모양으로 읽는다", () => {
    const withRp = (rp: Wire): Wire =>
      minimalEpisode({ steps: [step("S1", 1, [roleLine("S1-01")]), step("RP", 2, [rp])] });
    const rpWire = (): Wire => minimalRoleplayTurnWire("RP-01");
    const roleplayOf = (rp: Wire): Wire => rp["roleplay"] as Wire;

    test("RP1. 유효한 최소 RP가 도메인 모양으로 디코드된다", () => {
      const { episode } = passed(decodeEpisode(withRp(rpWire())));
      const turn = episode.finalTest.items[0];

      expect(turn).toMatchObject({
        id: "RP-01",
        type: "ROLEPLAY_TURN",
        tiles: [
          { ko: "내", roman: "nae" },
          { ko: "대사", roman: "daesa" },
        ],
        answers: [{ ko: "내 대사", roman: "nae daesa", en: "My line" }],
        feedback: { correct: { ko: "맞아요" } },
        roleplay: { lineId: "D1", tilesGloss: [{ tile: "내" }, { tile: "대사", en: "line" }] },
      });
      expect(turn).not.toHaveProperty("raw");
      expect(collectKeys(turn).filter((key) => key.includes("_"))).toEqual([]);
    });

    test.each([
      ["tiles가 빈 배열", { ...rpWire(), tiles: [] }],
      ["answers가 빈 배열", { ...rpWire(), answers: [] }],
      ["answers 없음", without(rpWire(), "answers")],
      ["context 없음", without(rpWire(), "context")],
      [
        "roleplay.line_id 없음",
        { ...rpWire(), roleplay: without(roleplayOf(rpWire()), "line_id") },
      ],
    ] as const)("RP2. %s이면 invalid-shape로 실패한다", (_name, rp) => {
      const errors = failed(decodeEpisode(withRp(rp)));

      expect(errors.map(({ code }) => code)).toContain("invalid-shape");
    });

    test("RP3. roleplay의 다른 키와 문항의 모르는 키는 버려지고 디코드는 성공한다", () => {
      const rp: Wire = {
        ...rpWire(),
        bogus: 1,
        roleplay: {
          ...roleplayOf(rpWire()),
          counterpart_line: "상대",
          player_line: "나",
          tiles: ["내", "대사"],
          accepted_answers: [{ text: "내 대사" }],
          modes: ["speech", "tiles"],
        },
      };
      const { episode } = passed(decodeEpisode(withRp(rp)));
      const turn = episode.finalTest.items[0];

      expect(turn).not.toHaveProperty("bogus");
      expect(turn).toHaveProperty("roleplay");
      expect(Object.keys((turn as unknown as { roleplay: object }).roleplay).sort()).toEqual([
        "lineId",
        "tilesGloss",
      ]);
    });
  });

  test("U20. 모르는 키는 에피소드 · 문항 어디서도 실패 없이 버려진다", () => {
    const input = { ...withItem(roleLine("S1-01", { bogus: 1 })), extra: 1 };
    const { episode } = passed(decodeEpisode(input));
    expect("extra" in episode).toBe(false);
    expect("bogus" in unitItem(episode)).toBe(false);
  });

  test.each(KNOWN_ITEM_TYPES.map((type) => [type] as const))(
    "U21. %s 최소 유효 문항이 디코드되고 키가 camelCase다",
    (type) => {
      const { episode } = passed(decodeEpisode(withItem(item(type, "S1-01"))));
      const found = unitItem(episode);
      expect(found.type).toBe(type);
      const keys = collectKeys(found);
      expect(keys.filter((key) => key.includes("_"))).toEqual([]);
      const camelCases: Partial<Record<ItemType, string[]>> = {
        VOCAB_CARD: ["cardKind"],
        IMG_MATCH: ["stimulus.imageBrief", "options.1.whyWrong"],
        ROLE_LINE: ["feedback.wrongOption", "options.1.whyWrong"],
      };
      for (const path of camelCases[type] ?? []) {
        expect(found).toHaveProperty(path);
      }
    },
  );

  test.each([
    [
      "E: options 없음",
      without({ ...item("LISTEN_SELECT", "S1-01"), event: "E", context: t3("문맥") }, "options"),
      false,
    ],
    ["R: options 있음", item("LISTEN_SELECT", "S1-01"), true],
  ])("U22. LISTEN_SELECT %s", (_name, listen, hasOptions) => {
    const found = unitItem(passed(decodeEpisode(withItem(listen))).episode);
    expect(found.type).toBe("LISTEN_SELECT");
    expect("options" in found).toBe(hasOptions);
  });

  test("U23. Word의 example_ko + example_roman은 example 객체, 하나뿐이면 없다", () => {
    const base = { id: "voca:1", ko: "물", roman: "mul", gloss_en: "water", role: "target" };
    const both = passed(
      decodeEpisode(
        minimalEpisode({
          words: [{ ...base, example_ko: "물 주세요", example_roman: "mul juseyo" }],
        }),
      ),
    ).episode;
    expect(both.words[0]?.example).toEqual({ ko: "물 주세요", roman: "mul juseyo" });
    const onlyKo = passed(
      decodeEpisode(minimalEpisode({ words: [{ ...base, example_ko: "물 주세요" }] })),
    ).episode;
    const word = onlyKo.words[0];
    expect(word).toBeDefined();
    expect(word !== undefined && "example" in word).toBe(false);
  });

  // 가드: 스캐폴드(항상 실패 값)도 결정적이고 입력을 바꾸지 않으므로 green일 수 있습니다.
  test("U24. 같은 입력은 같은 결과이고 입력은 바뀌지 않는다", () => {
    const input = withItem(
      item("TURN_ORDER", "S1-01", { tiles: [t3("B"), t3("D"), t3("A"), t3("C")] }),
    );
    const snapshot = structuredClone(input);
    const first = decodeEpisode(input);
    const second = decodeEpisode(input);
    expect(first).toEqual(second);
    expect(input).toEqual(snapshot);
  });

  // 가드: 스캐폴드가 이미 import와 첫 줄을 갖습니다.
  test("U25′. zod를 import하는 src 파일은 콘텐츠 스키마 셋 · 매니페스트 스키마이고 런타임 모듈은 background-only로 시작한다", () => {
    const srcRoot = resolve(process.cwd(), "src");
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          return walk(full);
        }
        return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
      });
    const toPosix = (file: string) => relative(process.cwd(), file).split(sep).join("/");
    const importers = walk(srcRoot)
      .filter((file) => /from\s+["']zod/.test(readFileSync(file, "utf8")))
      .map(toPosix)
      .sort();
    expect(importers).toEqual([
      "src/lib/episode-content.schema-items.ts",
      "src/lib/episode-content.schema-parts.ts",
      "src/lib/episode-content.schema.ts",
      "src/lib/episode-manifest.schema.ts",
    ]);
    const runtimeModules = [
      "episode-content.schema.ts",
      "episode-content.schema-parts.ts",
      "episode-content.schema-items.ts",
      "episode-content.items-added.ts",
      "episode-content.ts",
      "episode-manifest.schema.ts",
      "episode-manifest.ts",
      "sha256.ts",
      "episode-catalog.ts",
      "episode-bundled.ts",
      "episode-remote.ts",
      "episode-cache.ts",
      "episode-refresh.ts",
      "placeholder-fill.ts",
    ];
    for (const name of runtimeModules) {
      const first = readFileSync(resolve(srcRoot, "lib", name), "utf8").split("\n")[0];
      expect(first).toBe('import "background-only";');
    }
  });

  // 가드: 상수라 스캐폴드에서도 green입니다.
  test("U26. KNOWN_ITEM_TYPES는 24종이고 계약의 순서 그대로다", () => {
    expect(KNOWN_ITEM_TYPES).toHaveLength(24);
    expect([...KNOWN_ITEM_TYPES]).toEqual([
      "VOCAB_CARD",
      "CLOZE",
      "IMG_MATCH",
      "WORD_ORDER",
      "LISTEN_SELECT",
      "TURN_ORDER",
      "ROLE_LINE",
      "TRANSLATE_TO_KO",
      "TRANSLATE_TO_EN",
      "DICTATION",
      "SENT_BUILD",
      "PAIR_MATCH",
      "ROLEPLAY_TURN",
      "CLOZE_CHOICE",
      "REPLY_SELECT",
      "MIN_PAIR_AB",
      "PARTICLE_FILL",
      "PARTICLE_SWAP",
      "CULTURE_CHECK",
      "CULTURE_CARD",
      "LISTEN_BUILD",
      "SYLLABLE_BUILD",
      "SHADOW",
      "SPEAK_WORD",
    ]);
  });

  test("U27. 중첩 배열 경로의 구조 오류는 steps[1].items[2].options[3].correct 꼴로 나온다", () => {
    const badOptions = options(4).map((o, i) => (i === 3 ? { ...o, correct: "yes" } : o));
    const input = minimalEpisode({
      steps: [
        step("S1", 1, [roleLine("S1-01")]),
        step("S3", 2, [
          roleLine("S3-01"),
          roleLine("S3-02"),
          item("IMG_MATCH", "S3-03", { options: badOptions }),
        ]),
        rpStep(3),
      ],
    });
    const errors = failed(decodeEpisode(input));
    expect(codeAndPath(errors)).toContainEqual({
      code: "invalid-shape",
      path: "steps[1].items[2].options[3].correct",
    });
  });
});

describe("decodeEpisode - 컷 음성 id", () => {
  const speechCut = (extra: Wire): Wire =>
    cut(1, {
      cut_kind: "speech",
      speaker: "점원",
      line: t3("어서 오세요."),
      aside: t3("문이 열린다"),
      ...extra,
    });
  const monologueCut = (extra: Wire): Wire =>
    cut(1, { cut_kind: "monologue", speaker: "나", line: t3("흠."), ...extra });
  const narrationCut = (extra: Wire): Wire => cut(1, extra);

  test.each([
    ["speech", speechCut],
    ["monologue", monologueCut],
    ["narration", narrationCut],
  ])("DA1. %s 컷의 audio_url이 도메인 audioUrl이 된다", (_name, make) => {
    const input = minimalEpisode({ pre_cuts: [make({ audio_url: "u01-water/pre-3" })] });
    const { episode } = passed(decodeEpisode(input));
    expect(episode.prologue[0]).toHaveProperty("audioUrl", "u01-water/pre-3");
  });

  test.each([
    ["빈 문자열", { audio_url: "" }],
    ["키 없음", {}],
  ])("DA2. 컷 audio_url이 %s이면 audioUrl 키가 없고 디코드는 성공한다", (_name, extra) => {
    const { episode } = passed(decodeEpisode(minimalEpisode({ pre_cuts: [cut(1, extra)] })));
    const first = episode.prologue[0];
    expect(first).toBeDefined();
    expect(first !== undefined && "audioUrl" in first).toBe(false);
  });

  test("DA4. 컷 audio_url이 문자열이 아니면 기존 코드로 실패한다", () => {
    const errors = failed(decodeEpisode(minimalEpisode({ pre_cuts: [cut(1, { audio_url: 3 })] })));
    expect(errors.length).toBeGreaterThan(0);
    for (const issue of errors) {
      expect(["schema-mismatch", "invalid-shape"]).toContain(issue.code);
    }
  });
});

describe("내장 에피소드 음성 id 배치", () => {
  type Audible = { readonly audioUrl?: string };
  const decoded = (id: "u01-water" | "u02-checkin" | "u03-mina"): Episode =>
    passed(decodeEpisode(bundledCatalogInput.episodes[id])).episode;
  const placed = (list: readonly Audible[]): Record<number, string> =>
    Object.fromEntries(
      list.flatMap((entry, at) => (entry.audioUrl === undefined ? [] : [[at, entry.audioUrl]])),
    );

  test("DA3. u01: 컷 · 대화 줄의 음성 id가 표대로 놓이고 나머지는 키가 없다", () => {
    const episode = decoded("u01-water");
    expect(placed(episode.prologue)).toEqual({ 2: "u01-water/pre-3", 5: "u01-water/d-01" });
    expect(placed(episode.epilogue)).toEqual({});
    expect(placed(episode.dialogue)).toEqual({
      0: "u01-water/d-01",
      1: "u01-water/d-02",
      2: "u01-water/d-03",
      3: "u01-water/d-04",
      4: "u01-water/d-05",
    });
    expect(episode.dialogue.map((line) => line.seq)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  test("DA3. u02: 컷 · 대화 줄의 음성 id가 표대로 놓이고 나머지는 키가 없다", () => {
    const episode = decoded("u02-checkin");
    expect(placed(episode.prologue)).toEqual({
      0: "u02-checkin/pre-1",
      2: "u02-checkin/pre-3",
      4: "u02-checkin/d-01",
    });
    expect(placed(episode.epilogue)).toEqual({ 0: "u02-checkin/post-1" });
    expect(placed(episode.dialogue)).toEqual({ 0: "u02-checkin/d-01" });
  });

  test("DA3. u03: 컷 · 대화 줄의 음성 id가 표대로 놓이고 나머지는 키가 없다", () => {
    const episode = decoded("u03-mina");
    expect(placed(episode.prologue)).toEqual({ 1: "u03-mina/pre-2", 3: "u03-mina/d-01" });
    expect(placed(episode.epilogue)).toEqual({ 2: "u03-mina/post-3" });
    expect(placed(episode.dialogue)).toEqual({ 0: "u03-mina/d-01" });
  });
});

describe("decodeEpisode - 새 형식 (DF)", () => {
  const m2 = (ko: string) => ({ ko, roman: `r-${ko}` });
  const m3 = (ko: string) => ({ ko, roman: `r-${ko}`, en: `e-${ko}` });
  const modelPrompt = { ko: "질문", en: "question" };
  const correct = { correct: { ko: "맞아요" } };
  const modelOptions = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: `o${i + 1}`,
      ko: `보기${i + 1}`,
      roman: `bogi${i + 1}`,
      correct: i === 0,
      ...(i === 0 ? {} : { whyWrong: "이 자리에 맞는 말이 아니다" }),
    }));
  const decodedItem = (wire: Wire) => unitItem(passed(decodeEpisode(withItem(wire))).episode);

  test("DF1. 새 내장본 셋은 ok이고 경고는 unresolved-ref뿐이며 u01 · u02는 경고가 없다", () => {
    for (const id of ["u01-water", "u02-checkin", "u03-mina"] as const) {
      const { warnings } = passed(decodeEpisode(bundledCatalogInput.episodes[id]));
      expect(warnings.filter(({ code }) => code !== "unresolved-ref")).toEqual([]);
    }
    for (const id of ["u01-water", "u02-checkin"] as const) {
      expect(passed(decodeEpisode(bundledCatalogInput.episodes[id])).warnings).toEqual([]);
    }
  });

  test("DF2. 옛 내장본 픽스처는 새 선택 키를 하나도 더하지 않고 디코드된다", () => {
    const added = ["level", "skill", "skillLevel", "speaker"];
    for (const id of ["u01-water", "u02-checkin", "u03-mina"] as const) {
      const { episode } = passed(decodeEpisode(legacyCatalogInput.episodes[id]));
      expect("completion" in episode).toBe(false);
      const items = [...episode.units.flatMap((unit) => unit.items), ...episode.finalTest.items];
      for (const found of items) {
        expect(collectKeys(found).filter((key) => added.includes(key))).toEqual([]);
        const stimulus = "stimulus" in found ? found.stimulus : undefined;
        expect(stimulus !== undefined && "en" in stimulus).toBe(false);
      }
    }
  });

  test("DF2. 옛 내장본 u01의 대표 문항 결과가 지금 디코더와 같다", () => {
    const { episode } = passed(decodeEpisode(legacyCatalogInput.episodes["u01-water"]));
    const all = [...episode.units.flatMap((unit) => unit.items), ...episode.finalTest.items];
    const byId = (id: string) => all.find((found) => found.id === id);

    expect(byId("S1-01")).toStrictEqual({
      id: "S1-01",
      event: "E",
      ref: "voca:e70ba1ce",
      type: "VOCAB_CARD",
      context: { ko: "물", roman: "mul" },
      example: { ko: "물 주세요.", roman: "mul juseyo." },
      cardKind: "단어",
    });
    expect(byId("S3-05")).toStrictEqual({
      id: "S3-05",
      event: "R",
      ref: "expr:a04464f0",
      type: "TURN_ORDER",
      prompt: { ko: "대화 순서대로 놓으세요.", en: "Put the conversation in order." },
      context: { ko: "대화 순서대로 놓으세요.", roman: "daehwa sunseodaero noheuseyo." },
      tiles: [
        { ko: "아니요, 괜찮아요.", roman: "aniyo, gwaenchanayo.", en: "No, I'm fine." },
        { ko: "삼천 원입니다.", roman: "samcheon wonimnida.", en: "That's three thousand won." },
        { ko: "카드로 할게요.", roman: "kadeuro halgeyo.", en: "I'll pay by card." },
        {
          ko: "영수증 드릴까요?",
          roman: "yeongsujeung deurilkkayo?",
          en: "Would you like a receipt?",
        },
      ],
      answer: [0, 1, 2, 3],
    });
    expect(byId("S4-10")).toStrictEqual({
      id: "S4-10",
      event: "R",
      ref: "expr:a04464f0",
      type: "TRANSLATE_TO_KO",
      prompt: { ko: "한국어로 쓰세요.", en: "Say this in Korean." },
      answers: [
        { ko: "아니요, 괜찮아요.", roman: "aniyo, gwaenchanayo.", en: "No, I'm fine." },
        { ko: "아니요, 괜찮아요", roman: "aniyo, gwaenchanayo" },
      ],
    });
    expect(byId("RP-01")).toStrictEqual({
      id: "RP-01",
      event: "R",
      type: "ROLEPLAY_TURN",
      prompt: { ko: "뭐라고 말할까요?", en: "What do you say?" },
      context: { ko: "봉투 드릴까요?", roman: "bongtu deurilkkayo?", en: "Would you like a bag?" },
      stimulus: {
        text: { ko: "아니요, 괜찮아요.", roman: "aniyo, gwaenchanayo.", en: "No, I'm fine." },
      },
      tiles: [
        { ko: "아니요,", roman: "aniyo," },
        { ko: "괜찮아요.", roman: "gwaenchanayo." },
      ],
      answers: [{ ko: "아니요, 괜찮아요.", roman: "aniyo, gwaenchanayo.", en: "No, I'm fine." }],
      feedback: {
        correct: { ko: "상대가 「봉투 드릴까요?」라고 하면 「아니요, 괜찮아요.」라고 답해요." },
      },
      roleplay: {
        lineId: "D2",
        tilesGloss: [{ tile: "아니요," }, { tile: "괜찮아요.", en: "It's okay." }],
      },
    });
  });

  const AUDIO_OF = (ko: string) => ({ audio: m3(ko) });
  const expectedByType: [ItemType, Wire, Wire][] = [
    [
      "CLOZE_CHOICE",
      {},
      {
        event: "R",
        prompt: modelPrompt,
        context: m3("___ 문맥"),
        options: modelOptions(4),
        answers: [m3("정답")],
        feedback: correct,
      },
    ],
    [
      "REPLY_SELECT",
      {},
      {
        event: "R",
        prompt: modelPrompt,
        stimulus: AUDIO_OF("상대 말"),
        options: modelOptions(3),
        feedback: correct,
      },
    ],
    [
      "MIN_PAIR_AB",
      {},
      {
        event: "D",
        prompt: modelPrompt,
        stimulus: AUDIO_OF("빵"),
        options: modelOptions(2),
        feedback: correct,
      },
    ],
    [
      "PARTICLE_FILL",
      {},
      {
        event: "R",
        prompt: modelPrompt,
        stimulus: { text: m3("봉투___") },
        options: modelOptions(2),
        feedback: correct,
      },
    ],
    [
      "PARTICLE_SWAP",
      {},
      {
        event: "R",
        prompt: modelPrompt,
        stimulus: { text: m3("봉투이") },
        options: modelOptions(3),
        feedback: correct,
      },
    ],
    [
      "CULTURE_CHECK",
      {},
      {
        event: "R",
        prompt: modelPrompt,
        context: m3("문화 문맥"),
        options: modelOptions(3),
        feedback: correct,
      },
    ],
    [
      "CULTURE_CARD",
      {},
      {
        event: "E",
        context: m3("문화 카드"),
        stimulus: { text: m3("문화 본문") },
        feedback: correct,
      },
    ],
    [
      "LISTEN_BUILD",
      {},
      {
        event: "R",
        prompt: modelPrompt,
        stimulus: AUDIO_OF("듣기"),
        tiles: [m2("가"), m2("나"), m2("다")],
        answers: [m3("가 나 다")],
      },
    ],
    [
      "SYLLABLE_BUILD",
      {},
      {
        event: "R",
        prompt: modelPrompt,
        stimulus: { en: "card" },
        tiles: [m2("카"), m2("드")],
        answers: [m3("카드")],
      },
    ],
    [
      "SHADOW",
      {},
      {
        event: "E",
        prompt: modelPrompt,
        stimulus: { text: m3("따라 말하기") },
        answers: [m3("따라 말하기")],
      },
    ],
    [
      "SPEAK_WORD",
      { stimulus: { image_brief: "brief", image_url: "images/items/bag.jpg", audio_url: "" } },
      {
        event: "R",
        prompt: modelPrompt,
        stimulus: { imageBrief: "brief", imageUrl: "images/items/bag.jpg" },
        answers: [m3("단어")],
      },
    ],
  ];

  test.each(expectedByType)(
    "DF3. %s 와이어가 유형별 갈래 모양의 모델이 된다",
    (type, extra, body) => {
      expect(decodedItem(item(type, "S1-01", extra))).toStrictEqual({ id: "S1-01", type, ...body });
    },
  );

  test("DF3. 새 유형의 ref는 있으면 싣고 빈 값이면 키가 없다", () => {
    expect(decodedItem(item("CLOZE_CHOICE", "S1-01", { ref: "voca:1" }))).toHaveProperty(
      "ref",
      "voca:1",
    );
    expect("ref" in decodedItem(item("CLOZE_CHOICE", "S1-01", { ref: "" }))).toBe(false);
  });

  test("DF4. level · skill · skill_level이 모델 키 level · skill · skillLevel로 간다", () => {
    const found = decodedItem(roleLine("S1-01", { level: 2, skill: "읽기", skill_level: 1 }));
    expect(found).toMatchObject({ level: 2, skill: "읽기", skillLevel: 1 });
    const added = decodedItem(
      item("PARTICLE_FILL", "S1-01", { level: 3, skill: "쓰기", skill_level: 2 }),
    );
    expect(added).toMatchObject({ level: 3, skill: "쓰기", skillLevel: 2 });
  });

  test("DF4. 셋 다 없으면 키 셋 다 없고, 빈 skill도 키가 없다", () => {
    const none = decodedItem(roleLine("S1-01"));
    expect(["level", "skill", "skillLevel"].filter((key) => key in none)).toEqual([]);
    const blank = decodedItem(roleLine("S1-01", { skill: "" }));
    expect("skill" in blank).toBe(false);
  });

  test("DF4. level이 정수가 아니면 invalid-shape", () => {
    const errors = failed(decodeEpisode(withItem(roleLine("S1-01", { level: 1.5 }))));
    expect(codeAndPath(errors)).toContainEqual({
      code: "invalid-shape",
      path: "steps[0].items[0].level",
    });
  });

  test("DF5. event D는 받고 모르는 event는 invalid-shape(경로 event)", () => {
    expect(decodedItem(roleLine("S1-01", { event: "D" }))).toHaveProperty("event", "D");
    const errors = failed(decodeEpisode(withItem(roleLine("S1-01", { event: "X" }))));
    expect(codeAndPath(errors)).toContainEqual({
      code: "invalid-shape",
      path: "steps[0].items[0].event",
    });
  });

  test("DF6. completion.requires는 중복을 앞의 것 유지로 걸러 와이어 순서로 싣는다", () => {
    const input = minimalEpisode({ completion: { requires: ["S1", "RP", "S1"] } });
    expect(passed(decodeEpisode(input)).episode.completion).toEqual({ requires: ["S1", "RP"] });
    const reversed = minimalEpisode({ completion: { requires: ["RP", "S1"] } });
    expect(passed(decodeEpisode(reversed)).episode.completion).toEqual({ requires: ["RP", "S1"] });
  });

  test("DF6. completion이 없으면 모델에 completion 키가 없다", () => {
    expect("completion" in passed(decodeEpisode(minimalEpisode())).episode).toBe(false);
  });

  test("DF7. requires가 비면 completion.requires 하나로 실패한다", () => {
    const errors = failed(decodeEpisode(minimalEpisode({ completion: { requires: [] } })));
    expect(codeAndPath(errors)).toEqual([
      { code: "completion-malformed", path: "completion.requires" },
    ]);
  });

  test("DF7. 없는 단계 id(intro 포함)는 자리마다 하나씩 실패한다", () => {
    const input = minimalEpisode({ completion: { requires: ["S1", "S9", "intro"] } });
    expect(codeAndPath(failed(decodeEpisode(input)))).toEqual([
      { code: "completion-malformed", path: "completion.requires[1]" },
      { code: "completion-malformed", path: "completion.requires[2]" },
    ]);
  });

  test("DF7. requires가 배열이 아니면 모양 오류다", () => {
    const errors = failed(decodeEpisode(minimalEpisode({ completion: { requires: "RP" } })));
    expect(errors.map(({ code }) => code)).toContain("invalid-shape");
    expect(errors.map(({ code }) => code)).not.toContain("completion-malformed");
  });

  test("DF8. VOCAB_CARD에 example이 없어도 디코드되고 모델에 example 키가 없다", () => {
    const found = decodedItem(without(item("VOCAB_CARD", "S1-01"), "example"));
    expect(found.type).toBe("VOCAB_CARD");
    expect("example" in found).toBe(false);
  });

  test.each(["TRANSLATE_TO_KO", "WORD_ORDER"] as const)("DF9. %s의 stimulus.en", (type) => {
    expect(
      decodedItem(item(type, "S1-01", { stimulus: { en: "warm", audio_url: "" } })),
    ).toHaveProperty("stimulus", { en: "warm" });
    expect(decodedItem(item(type, "S1-01", { stimulus: { en: "" } }))).toHaveProperty(
      "stimulus",
      {},
    );
    expect("stimulus" in decodedItem(item(type, "S1-01"))).toBe(false);
  });

  const turnTiles = (speakers: (string | undefined)[]): Wire[] =>
    ["A", "B", "C", "D"].map((ko, i) => ({
      ...t3(ko),
      ...(speakers[i] === undefined ? {} : { speaker: speakers[i] }),
    }));

  test("DF10. TURN_ORDER 타일의 speaker가 보존되고 없으면 키가 없다", () => {
    const speakers = ["player", "counterpart", "player", "counterpart"];
    const withSpeakers = decodedItem(item("TURN_ORDER", "S1-01", { tiles: turnTiles(speakers) }));
    expect((withSpeakers as { tiles: { speaker?: string }[] }).tiles.map((t) => t.speaker)).toEqual(
      speakers,
    );
    const without3 = decodedItem(item("TURN_ORDER", "S1-01", { tiles: turnTiles([]) }));
    expect(collectKeys(without3)).not.toContain("speaker");
  });

  test("DF10. 모르는 speaker 값은 invalid-shape", () => {
    const tiles = turnTiles(["narrator", undefined, undefined, undefined]);
    const errors = failed(decodeEpisode(withItem(item("TURN_ORDER", "S1-01", { tiles }))));
    expect(errors.map(({ code }) => code)).toContain("invalid-shape");
  });

  test("DF12. 모르는 키(scene · lead · reask · use)는 실패 없이 버려진다", () => {
    const rp = minimalRoleplayTurnWire("RP-01");
    const rpWithExtra = {
      ...rp,
      roleplay: { ...(rp["roleplay"] as Wire), lead: ["안녕"], reask: "다시" },
    };
    const input = minimalEpisode({
      steps: [
        { ...step("S1", 1, [roleLine("S1-01")]), scene: { background_image_url: "x" } },
        { ...step("RP", 2, [rpWithExtra]), scene: { retry: 2 } },
      ],
      words: [
        {
          id: "voca:1",
          ko: "물",
          roman: "mul",
          gloss_en: "water",
          role: "target",
          use: "counterpart",
        },
      ],
      patterns: [{ id: "patt:1", ko: "{명사}", roman: "n", gloss_en: "noun", use: "counterpart" }],
    });
    const { episode } = passed(decodeEpisode(input));
    const keys = collectKeys(episode);
    for (const dropped of ["scene", "lead", "reask", "use"]) expect(keys).not.toContain(dropped);
  });

  test.each([
    "CLOZE_CHOICE",
    "REPLY_SELECT",
    "MIN_PAIR_AB",
    "PARTICLE_FILL",
    "PARTICLE_SWAP",
    "CULTURE_CHECK",
  ] as const)("DF13. %s는 정답이 0개나 2개면 option-correct-count", (type) => {
    for (const make of [
      (o: Wire, i: number) => ({ ...o, correct: i < 0 }),
      (o: Wire, i: number) => ({ ...o, correct: i < 2 }),
    ]) {
      const opts = options(3).map(make);
      const errors = failed(decodeEpisode(withItem(item(type, "S1-01", { options: opts }))));
      expect(codeAndPath(errors)).toContainEqual({
        code: "option-correct-count",
        path: "steps[0].items[0].options",
      });
    }
  });
});
