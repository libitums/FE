import { describe, expect, test } from "vitest";

import { catalogSpellingOf, syllableBuildItemOf } from "./catalog-build-map";
import type { CatalogMappedItem } from "./catalog-lesson-types";
import { shuffledOrder } from "./catalog-shuffle";
import { portOf, syllableBuild, t } from "./catalog-screens.test-support";

// `unit` 계층: 철자 탐색(catalogSpellingOf)과 음절 조립(SYLLABLE_BUILD) 매핑의 입출력만 봅니다.

const port = portOf();
const questionOf = (mapped: CatalogMappedItem): Record<string, unknown> | undefined =>
  Reflect.get(mapped, "question") as Record<string, unknown> | undefined;
const skippedWith = (reason: string) => expect.objectContaining({ kind: "skipped", reason });
const tilesOf = (...syllables: string[]) => syllables.map((syllable) => t(syllable));

describe("철자 탐색 (SP)", () => {
  test("SP1. 정답 순서 타일이면 앞에서부터, 섞인 타일이면 낱말 순서의 인덱스 열이다", () => {
    expect(catalogSpellingOf(["카", "드", "찮", "현"], "카드")).toEqual([0, 1]);
    expect(catalogSpellingOf(["현", "드", "카", "찮"], "카드")).toEqual([2, 1]);
  });

  test("SP2. 같은 음절 두 장은 작은 인덱스를 먼저 쓴다", () => {
    expect(catalogSpellingOf(["일", "주", "일", "이", "여"], "일주일")).toEqual([0, 1, 2]);
  });

  test("SP3. 여러 글자 타일은 접두로 맞추고 막히면 되짚는다", () => {
    expect(catalogSpellingOf(["가나", "가", "나다"], "가나다")).toEqual([1, 2]);
  });

  test("SP4. 만들 수 없으면 null이고 타일은 한 번씩만 쓴다", () => {
    expect(catalogSpellingOf(["카", "찮"], "카드")).toBeNull();
    expect(catalogSpellingOf(["카"], "카카")).toBeNull();
    expect(catalogSpellingOf(["카", "드"], "")).toBeNull();
  });

  test("SP4. 타일을 남겨도 낱말이 되면 그 열이다(오답 음절은 쓰지 않는다)", () => {
    expect(catalogSpellingOf(["찮", "카", "현", "드"], "카드")).toEqual([1, 3]);
  });
});

describe("음절 조립 매핑 (SBM)", () => {
  test("SBM1. u01 S3-12 꼴은 뜻 · 칸 수 · 정답 · 지시문을 싣고 타일은 원래 넷의 순열이다", () => {
    const mapped = syllableBuildItemOf(syllableBuild(), port);

    expect(mapped.kind).toBe("syllable-build");
    expect(mapped).toMatchObject({ itemId: "S3-12" });
    const question = questionOf(mapped);
    expect(question).toMatchObject({
      meaning: "card",
      slotCount: 2,
      answers: ["카드"],
      instruction: "Tap the syllables to spell the word.",
    });
    expect([...((question?.["tiles"] as string[] | undefined) ?? [])].sort()).toEqual(
      ["카", "드", "찮", "현"].sort(),
    );
  });

  test("SBM2. 타일 순서는 씨앗 규칙(에피소드/문항)의 섞기이고 섞인 타일로도 철자가 선다", () => {
    const question = questionOf(syllableBuildItemOf(syllableBuild(), port));
    const original = ["카", "드", "찮", "현"];
    const order = shuffledOrder("u01-water/S3-12", 4);
    const tiles = (question?.["tiles"] ?? []) as string[];
    const answers = (question?.["answers"] ?? [""]) as string[];

    expect(tiles).toEqual(order.map((index) => original[index]));
    const spelling = catalogSpellingOf(tiles, answers[0] ?? "");
    expect(spelling).not.toBeNull();
    expect(spelling).toHaveLength(question?.["slotCount"] as number);
  });

  test("SBM3. 뜻은 stimulus.en이 먼저고 정답의 en과 달라도 그쪽이다", () => {
    const item = syllableBuild({
      stimulus: { en: "card" },
      answers: [t("카드", "kadeu", "credit card")],
    });

    expect(questionOf(syllableBuildItemOf(item, port))?.["meaning"]).toBe("card");
  });

  test("SBM3. stimulus.en이 없거나 공백이면 answers[0].en이다", () => {
    for (const stimulus of [{}, { en: "   " }]) {
      const item = syllableBuild({ stimulus, answers: [t("카드", "kadeu", "credit card")] });

      expect(questionOf(syllableBuildItemOf(item, port))?.["meaning"]).toBe("credit card");
    }
  });

  test("SBM3. 한국어가 빈 앞 정답은 걷히고 뜻도 남은 첫 정답의 en이다", () => {
    const item = syllableBuild({
      stimulus: {},
      answers: [t("  ", "", "blank answer"), t("카드", "kadeu", "credit card")],
    });

    expect(questionOf(syllableBuildItemOf(item, port))).toEqual(
      expect.objectContaining({ meaning: "credit card", answers: ["카드"] }),
    );
  });

  test("SBM3. 둘 다 없으면 ref의 낱말 뜻이고 그것도 없으면 no-gloss다", () => {
    const withRef = syllableBuild({ stimulus: {}, ref: "voca:card" });
    const glossing = portOf({ glossOf: (ref) => (ref === "voca:card" ? "card (gloss)" : null) });

    expect(questionOf(syllableBuildItemOf(withRef, glossing))?.["meaning"]).toBe("card (gloss)");
    expect(syllableBuildItemOf(syllableBuild({ stimulus: {} }), port)).toEqual(
      skippedWith("no-gloss"),
    );
  });

  test("SBM3. answers[].en이 없어도 stimulus.en으로 선다(u01 S3-10 꼴)", () => {
    const item = syllableBuild({
      id: "S3-10",
      stimulus: { en: "It's okay" },
      tiles: tilesOf("괜", "찮", "아", "요", "세", "원"),
      answers: [t("괜찮아요", "gwaenchanayo")],
    });

    const question = questionOf(syllableBuildItemOf(item, port));

    expect(question).toMatchObject({ meaning: "It's okay", slotCount: 4, answers: ["괜찮아요"] });
  });

  test("SBM4. 정답의 공백은 걷어 붙인 낱말로 받는다", () => {
    const item = syllableBuild({
      stimulus: { en: "room number" },
      tiles: tilesOf("방", "번", "호"),
      answers: [t("방 번호")],
    });

    const question = questionOf(syllableBuildItemOf(item, port));

    expect(question).toMatchObject({ answers: ["방번호"], slotCount: 3 });
  });

  test("SBM5. 여러 정답은 모두 싣고 칸 수는 첫 정답의 타일 수다", () => {
    const item = syllableBuild({ answers: [t("카드"), t("카아드")] });

    expect(questionOf(syllableBuildItemOf(item, port))).toMatchObject({
      answers: ["카드", "카아드"],
      slotCount: 2,
    });
  });

  test("SBM6. 타일이 없거나 빈 타일이 있으면 malformed다", () => {
    expect(syllableBuildItemOf(syllableBuild({ tiles: [] }), port)).toEqual(
      skippedWith("malformed"),
    );
    expect(syllableBuildItemOf(syllableBuild({ tiles: tilesOf("카", " ", "드") }), port)).toEqual(
      skippedWith("malformed"),
    );
  });

  test("SBM6. 정답이 없거나 공백뿐이면 malformed다", () => {
    expect(syllableBuildItemOf(syllableBuild({ answers: [] }), port)).toEqual(
      skippedWith("malformed"),
    );
    expect(syllableBuildItemOf(syllableBuild({ answers: [t("  ")] }), port)).toEqual(
      skippedWith("malformed"),
    );
  });

  test("SBM6. 철자가 서지 않으면 뜻이 있어도 malformed다", () => {
    expect(syllableBuildItemOf(syllableBuild({ tiles: tilesOf("카", "찮") }), port)).toEqual(
      skippedWith("malformed"),
    );
  });

  test("SBM6. 판정 순서 — 타일이 비면 뜻이 없어도 malformed가 먼저다", () => {
    expect(syllableBuildItemOf(syllableBuild({ tiles: [], stimulus: {} }), port)).toEqual(
      skippedWith("malformed"),
    );
  });

  test("SBM7. 같은 음절 두 장(u02 S3-17 꼴)은 칸 3 · 타일 다섯 모두를 싣는다", () => {
    const item = syllableBuild({
      id: "S3-17",
      stimulus: { en: "a week" },
      tiles: tilesOf("일", "주", "일", "이", "여"),
      answers: [t("일주일")],
    });

    const question = questionOf(syllableBuildItemOf(item, port));

    expect(question).toMatchObject({ slotCount: 3, answers: ["일주일"] });
    expect([...((question?.["tiles"] as string[] | undefined) ?? [])].sort()).toEqual(
      ["일", "주", "일", "이", "여"].sort(),
    );
  });

  test("SBM8. 같은 문항을 두 번 매핑하면 같고 입력은 바뀌지 않는다", () => {
    const item = syllableBuild();
    const snapshot = structuredClone(item);

    expect(syllableBuildItemOf(item, port)).toEqual(syllableBuildItemOf(item, port));
    expect(item).toEqual(snapshot);
  });
});
