import { describe, expect, test } from "vitest";

import type { LearningItem } from "../lib/episode-content.model";
import {
  clozeChoiceItemOf,
  clozeItemOf,
  listeningItemOf,
  particleItemOf,
  pictureChoiceItemOf,
  replySelectItemOf,
  roleLineItemOf,
  translateToEnItemOf,
} from "./catalog-choice-map";
import type { CatalogMappedItem } from "./catalog-lesson-types";
import { portOf, t } from "./catalog-screens.test-support";
import { shuffledOrder } from "./catalog-shuffle";

// `unit` 계층: 보기 로마자(choiceRomanizations)가 문항 매핑을 지나 표시 순서로 정렬돼 실리는지만 봅니다(순수 함수의 입출력).

// ---------------------------------------------------------------- 보기 로마자 (CR)

type Type = LearningItem["type"];
type ItemOf<T extends Type> = Extract<LearningItem, { type: T }>;

const lessonPort = portOf();
const questionOf = (mapped: CatalogMappedItem): Record<string, unknown> => {
  if (mapped.kind !== "word-choice" && mapped.kind !== "listening") {
    throw new Error(`unexpected kind ${mapped.kind}`);
  }
  return { ...mapped.question };
};
const hasChoiceRomanizations = (mapped: CatalogMappedItem): boolean =>
  Object.prototype.hasOwnProperty.call(questionOf(mapped), "choiceRomanizations");

/** ko · roman 쌍으로 보기를 짓습니다. 정답은 첫 보기입니다. */
const optionsOf = (pairs: readonly (readonly [string, string | undefined])[]) =>
  pairs.map(([ko, roman], index) => ({
    id: `o${index + 1}`,
    ko,
    ...(roman === undefined ? {} : { roman }),
    en: `en-${index + 1}`,
    correct: index === 0,
  }));

const pairs = [
  ["안녕하세요.", " annyeonghaseyo. "],
  ["네, 반가워요.", "ne, bangawoyo."],
  ["저는 민아예요.", "jeoneun minayeyo."],
] as const;

function itemOf<T extends Type>(type: T, fields: Record<string, unknown>): ItemOf<T> {
  return {
    id: "X-01",
    event: "R",
    type,
    ref: "voca:x",
    prompt: { ko: "고르세요.", en: "Pick one." },
    feedback: { correct: { ko: "맞아요", en: "Right" } },
    ...fields,
  } as unknown as ItemOf<T>;
}

const line = t("안녕하세요. 이름이 뭐예요?", "annyeonghaseyo. ireumi mwoyeyo?", "Hello.");
const expectedRomans = ["annyeonghaseyo.", "ne, bangawoyo.", "jeoneun minayeyo."];

describe("보기 로마자 매핑 — word-choice 유형 (CR)", () => {
  test("CR6. REPLY_SELECT: choiceRomanizations[i]는 options[i].roman(trim)이고 보기는 셋이다", () => {
    const item = itemOf("REPLY_SELECT", {
      stimulus: { audio: line },
      options: optionsOf(pairs),
    });

    const question = questionOf(replySelectItemOf(item, lessonPort));

    expect(question["choices"]).toHaveLength(3);
    expect(question["choiceRomanizations"]).toEqual(expectedRomans);
  });

  test.each([
    [
      "ROLE_LINE",
      (): CatalogMappedItem =>
        roleLineItemOf(
          itemOf("ROLE_LINE", { context: line, options: optionsOf(pairs) }),
          lessonPort,
        ),
    ],
    [
      "CLOZE_CHOICE",
      (): CatalogMappedItem =>
        clozeChoiceItemOf(
          itemOf("CLOZE_CHOICE", { context: line, options: optionsOf(pairs) }),
          lessonPort,
        ),
    ],
    [
      "PARTICLE_FILL",
      (): CatalogMappedItem =>
        particleItemOf(
          itemOf("PARTICLE_FILL", { stimulus: { text: line }, options: optionsOf(pairs) }),
          lessonPort,
        ),
    ],
    [
      "PARTICLE_SWAP",
      (): CatalogMappedItem =>
        particleItemOf(
          itemOf("PARTICLE_SWAP", { stimulus: { text: line }, options: optionsOf(pairs) }),
          lessonPort,
        ),
    ],
  ])("CR7. %s: 같은 규칙으로 choiceRomanizations가 보기 순서를 따른다", (_type, map) => {
    expect(questionOf(map())["choiceRomanizations"]).toEqual(expectedRomans);
  });

  test("CR7. IMG_MATCH: 보기마다 로마자가 서고 picture.answerRomanization은 정답 보기 로마자 그대로다", () => {
    const item = itemOf("IMG_MATCH", {
      stimulus: { imageUrl: "images/a.webp" },
      options: optionsOf(pairs),
    });

    const question = questionOf(pictureChoiceItemOf(item, lessonPort));

    expect(question["choiceRomanizations"]).toEqual(expectedRomans);
    expect(question["picture"]).toEqual({
      url: "https://cdn/images/a.webp",
      answerRomanization: "annyeonghaseyo.",
    });
  });

  test("CR8. CLOZE: 섞은 뒤에도 choiceRomanizations[i]는 choices[i]와 ko가 같은 타일의 roman이다", () => {
    const tiles = [t("가", "ga"), t("나", " na "), t("다", "da"), t("라", "ra")];
    const item = itemOf("CLOZE", {
      context: t("___ 해요.", "___ haeyo.", "Do."),
      tiles,
      answers: [t("다", "da")],
    });
    // 섞는 순서는 문항마다 정해진 규칙입니다 — 기대 순서도 같은 규칙으로 구합니다.
    const order = shuffledOrder(`${lessonPort.episodeId}/${item.id}`, tiles.length);

    const question = questionOf(clozeItemOf(item, lessonPort));

    expect(question["choices"]).toEqual(order.map((index) => tiles[index]?.ko));
    expect(question["choiceRomanizations"]).toEqual(
      order.map((index) => tiles[index]?.roman?.trim()),
    );
  });

  test("CR8. CLOZE: roman이 빈 타일 하나는 그 자리만 null이다", () => {
    const tiles = [t("가", "ga"), t("나", ""), t("다", "da"), t("라", "ra")];
    const item = itemOf("CLOZE", {
      context: t("___ 해요.", "___ haeyo.", "Do."),
      tiles,
      answers: [t("다", "da")],
    });

    const question = questionOf(clozeItemOf(item, lessonPort));
    const choices = question["choices"] as readonly string[];
    const romans = question["choiceRomanizations"] as readonly (string | null)[];

    expect(romans).toHaveLength(4);
    expect(romans[choices.indexOf("나")]).toBeNull();
    expect(romans.filter((value) => value === null)).toHaveLength(1);
    expect(romans[choices.indexOf("가")]).toBe("ga");
  });

  test("CR9. TRANSLATE_TO_EN: 영어 보기에는 choiceRomanizations 키가 없다", () => {
    const item = itemOf("TRANSLATE_TO_EN", {
      stimulus: { text: t("물", "mul") },
      options: optionsOf([
        ["water", "mul"],
        ["fire", "bul"],
      ]),
    });

    const mapped = translateToEnItemOf(item, lessonPort);

    expect(mapped.kind).toBe("word-choice");
    expect(hasChoiceRomanizations(mapped)).toBe(false);
  });

  test("CR10. 모든 보기 roman이 비면(없음 · 빈 문자열 · 공백) 키가 없다", () => {
    const item = itemOf("ROLE_LINE", {
      context: line,
      options: optionsOf([
        ["안녕하세요.", undefined],
        ["네, 반가워요.", ""],
        ["저는 민아예요.", "   "],
      ]),
    });

    const mapped = roleLineItemOf(item, lessonPort);

    expect(mapped.kind).toBe("word-choice");
    expect(hasChoiceRomanizations(mapped)).toBe(false);
  });

  test("CR10. 보기 하나만 비면 그 자리만 null이고 나머지는 선다", () => {
    const item = itemOf("ROLE_LINE", {
      context: line,
      options: optionsOf([
        ["안녕하세요.", "annyeonghaseyo."],
        ["네, 반가워요.", ""],
        ["저는 민아예요.", "jeoneun minayeyo."],
      ]),
    });

    expect(questionOf(roleLineItemOf(item, lessonPort))["choiceRomanizations"]).toEqual([
      "annyeonghaseyo.",
      null,
      "jeoneun minayeyo.",
    ]);
  });
});

describe("보기 로마자 매핑 — 듣기 (CR)", () => {
  const listenFields = (count: 2 | 4) => ({
    stimulus: { audio: line, audioUrl: "u00/a" },
    options: optionsOf(
      [
        ["가요.", "gayo."],
        ["와요.", "wayo."],
        ["봐요.", "bwayo."],
        ["해요.", "haeyo."],
      ].slice(0, count) as unknown as readonly (readonly [string, string])[],
    ),
  });

  test.each([
    ["LISTEN_SELECT", 4],
    ["MIN_PAIR_AB", 2],
  ] as const)(
    "CR11. %s(%d지): choiceRomanizations가 정렬되고 답 전 대본 갈래 키는 없다",
    (type, count) => {
      const item = itemOf(type, listenFields(count));

      const mapped = listeningItemOf(item, {
        ...lessonPort,
        audioUrlOf: () => null,
      });
      const question = questionOf(mapped);

      expect(mapped.kind).toBe("listening");
      expect(question["choiceRomanizations"]).toEqual(
        ["gayo.", "wayo.", "bwayo.", "haeyo."].slice(0, count),
      );
      expect(question).not.toHaveProperty("beforeAnswer");
      expect(question).not.toHaveProperty("romanizationHint");
      expect(question["romanization"]).toBe("annyeonghaseyo. ireumi mwoyeyo?");
    },
  );
});
