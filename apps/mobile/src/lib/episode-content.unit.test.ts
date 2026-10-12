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
  test("U25′. zod를 import하는 src 파일은 두 스키마 모듈이고 런타임 모듈은 background-only로 시작한다", () => {
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
      "src/lib/episode-content.schema.ts",
      "src/lib/episode-manifest.schema.ts",
    ]);
    const runtimeModules = [
      "episode-content.schema.ts",
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
  test("U26. KNOWN_ITEM_TYPES는 13종이고 계약의 순서 그대로다", () => {
    expect(KNOWN_ITEM_TYPES).toHaveLength(13);
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
