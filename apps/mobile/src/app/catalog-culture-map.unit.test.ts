import { describe, expect, test, vi } from "vitest";

import { cultureCardItemOf } from "./catalog-card-map";
import { cultureCheckItemOf } from "./catalog-culture-map";
import type { CatalogFill, CatalogMappedItem } from "./catalog-lesson-types";
import {
  cultureCard,
  cultureCheck,
  opt,
  portOf,
  scriptFill,
  t,
} from "./catalog-screens.test-support";

// `unit` 계층: 문화 카드(CULTURE_CARD) · 문화 확인(CULTURE_CHECK)의 매핑 결과만 봅니다(순수 함수의 입출력).

const port = portOf();
const questionOf = (mapped: CatalogMappedItem): Record<string, unknown> | undefined =>
  Reflect.get(mapped, "question") as Record<string, unknown> | undefined;
const skippedWith = (reason: string) => expect.objectContaining({ kind: "skipped", reason });

describe("문화 카드 매핑 (CCM)", () => {
  test("CCM1. u01 CULT-01 꼴은 제목 둘 · 제목 로마자 · 영어 본문 · 한국어 본문 · 그림 주소를 싣는다", () => {
    const mapped = cultureCardItemOf(cultureCard(), port);

    expect(mapped.kind).toBe("culture-card");
    expect(mapped).toMatchObject({ itemId: "CULT-01" });
    expect(questionOf(mapped)).toEqual({
      title: "편의점 봉투",
      titleTranslation: "Bags at the convenience store",
      titleRomanization: "pyeonuijeom bongtu",
      body: "At Korean convenience stores, you buy bags separately.",
      koreanBody: "한국 편의점에서는 봉투를 따로 사요.",
      imageUrl: "https://cdn/images/a.jpg",
    });
  });

  test("CCM2. 영어 제목 · 제목 로마자가 없으면 null이고 한국어 본문이 공백뿐이면 koreanBody도 null이다", () => {
    const item = cultureCard({
      context: { ko: "편의점 봉투" },
      stimulus: { text: t("   ", "x", "Bags cost extra.") },
    });

    expect(questionOf(cultureCardItemOf(item, port))).toEqual({
      title: "편의점 봉투",
      titleTranslation: null,
      titleRomanization: null,
      body: "Bags cost extra.",
      koreanBody: null,
      imageUrl: null,
    });
  });

  test("CCM2. 영어 제목 · 제목 로마자가 공백뿐이어도 null이다", () => {
    const item = cultureCard({ context: t("편의점 봉투", "  ", "  ") });

    expect(questionOf(cultureCardItemOf(item, port))).toMatchObject({
      titleTranslation: null,
      titleRomanization: null,
    });
  });

  test("CCM3. 제목(context.ko)이 비면 본문이 있어도 malformed다", () => {
    expect(cultureCardItemOf(cultureCard({ context: t("   ", "r", "Title") }), port)).toEqual(
      skippedWith("malformed"),
    );
    expect(cultureCardItemOf(cultureCard({ context: t("", "r", "Title") }), port)).toEqual(
      skippedWith("malformed"),
    );
  });

  test("CCM3. stimulus.text가 없으면 malformed다", () => {
    expect(cultureCardItemOf(cultureCard({ stimulus: {} }), port)).toEqual(
      skippedWith("malformed"),
    );
  });

  test("CCM3. 제목이 비고 본문도 없으면 제목 쪽이 먼저라 malformed다", () => {
    expect(cultureCardItemOf(cultureCard({ context: t(""), stimulus: {} }), port)).toEqual(
      skippedWith("malformed"),
    );
  });

  test("CCM3. 영어 본문이 없거나 공백이면 no-gloss다", () => {
    expect(
      cultureCardItemOf(cultureCard({ stimulus: { text: t("한국어만", "hangugeoman") } }), port),
    ).toEqual(skippedWith("no-gloss"));
    expect(
      cultureCardItemOf(cultureCard({ stimulus: { text: t("한국어만", "r", "  ") } }), port),
    ).toEqual(skippedWith("no-gloss"));
  });

  test("CCM4. 자리표시자가 학습자 이름으로 바뀌고 앞뒤 공백이 걷힌다", () => {
    const spy = vi.fn<CatalogFill>(scriptFill);
    const item = cultureCard({
      context: t(" {이름}의 봉투 ", " {이름} bongtu ", " {이름}'s bag "),
      stimulus: { text: t("{이름}이 샀어요.", "{이름} sasseoyo.", " {이름} bought it. ") },
    });

    const question = questionOf(cultureCardItemOf(item, portOf({ fill: spy })));

    expect(question).toMatchObject({
      title: "민아의 봉투",
      titleTranslation: "Mina's bag",
      titleRomanization: "mina bongtu",
      body: "Mina bought it.",
      koreanBody: "민아이 샀어요.",
    });
    expect(spy).toHaveBeenCalledWith(" {이름}의 봉투 ", "ko");
    expect(spy).toHaveBeenCalledWith(" {이름}'s bag ", "en");
    expect(spy).toHaveBeenCalledWith(" {이름} bongtu ", "roman");
    expect(spy).toHaveBeenCalledWith(" {이름} bought it. ", "en");
    expect(spy).toHaveBeenCalledWith("{이름}이 샀어요.", "ko");
  });

  test("CCM5. 요령 · 본문 로마자 · 음원은 결과에 어떤 키로도 실리지 않는다(그림 주소만 실린다)", () => {
    const question = questionOf(cultureCardItemOf(cultureCard(), port)) ?? {};

    expect(Object.keys(question).sort()).toEqual(
      ["body", "imageUrl", "koreanBody", "title", "titleRomanization", "titleTranslation"].sort(),
    );
    const dumped = JSON.stringify(question);
    expect(dumped).not.toContain("hanguk pyeonuijeomeseoneun");
    expect(dumped).not.toContain("a.mp3");
    expect(dumped).not.toContain("맞아요");
  });

  test("CCM7. 그림 주소는 콘텐츠 그림 포트(imageUrlOf)로만 풀고, 경로가 없거나 풀리지 않으면 null이며 카드는 건너뛰지 않는다", () => {
    const resolver = vi.fn((path: string) => `https://cdn/${path}`);
    const withPath = cultureCard({
      stimulus: {
        text: t("한국어", "r", "English body."),
        imageUrl: "content/images/u01-water/cult-1.jpg",
      },
    });

    expect(
      questionOf(cultureCardItemOf(withPath, { ...port, imageUrlOf: resolver })),
    ).toMatchObject({ imageUrl: "https://cdn/content/images/u01-water/cult-1.jpg" });
    expect(resolver).toHaveBeenCalledWith("content/images/u01-water/cult-1.jpg");

    // 디코더가 빈 문자열을 키 없음으로 바꾸므로 「없음」은 키가 없는 꼴입니다.
    const noPath = cultureCard({ stimulus: { text: t("한국어", "r", "English body.") } });
    const unresolvedPort = { ...port, imageUrlOf: () => null };
    expect(cultureCardItemOf(noPath, port).kind).toBe("culture-card");
    expect(questionOf(cultureCardItemOf(noPath, port))).toMatchObject({ imageUrl: null });
    expect(cultureCardItemOf(withPath, unresolvedPort).kind).toBe("culture-card");
    expect(questionOf(cultureCardItemOf(withPath, unresolvedPort))).toMatchObject({
      imageUrl: null,
    });
  });

  test("CCM6. 같은 문항을 두 번 매핑하면 같고 입력은 바뀌지 않는다", () => {
    const item = cultureCard();
    const snapshot = structuredClone(item);

    expect(cultureCardItemOf(item, port)).toEqual(cultureCardItemOf(item, port));
    expect(item).toEqual(snapshot);
  });
});

describe("문화 확인 매핑 (CKM)", () => {
  test("CKM1. u01 CULT-04 꼴은 질문 · 보기(콘텐츠 순서) · 정답 자리 · 보기 번역을 싣는다", () => {
    const mapped = cultureCheckItemOf(cultureCheck(), port);

    expect(mapped.kind).toBe("word-choice");
    expect(mapped).toMatchObject({ itemId: "CULT-04" });
    expect(questionOf(mapped)).toEqual({
      prompt: "한국 편의점에서 봉투는 어떨까요?",
      romanization: "hanguk pyeonuijeomeseo bongtuneun eotteolkkayo?",
      translation: "What about bags at Korean convenience stores?",
      choices: ["봉투는 공짜예요.", "봉투는 보통 따로 돈을 내요.", "봉투가 없어요."],
      answerIndex: 1,
      instruction: "Pick the right one.",
      choiceTranslations: ["Bags are free.", "Bags usually cost extra.", "There are no bags."],
      culture: { scene: null, explanation: { en: "Right", ko: "맞아요" } },
    });
  });

  test("CKM2. 보기 하나의 en이 없거나 공백이면 choiceTranslations 키가 없고 나머지는 같다", () => {
    const full = questionOf(cultureCheckItemOf(cultureCheck(), port)) ?? {};
    const { choiceTranslations: _dropped, ...rest } = full;
    expect("choiceTranslations" in full).toBe(true);
    for (const en of [undefined, "   "]) {
      const item = cultureCheck({
        options: [
          opt("o1", "봉투는 공짜예요.", false, "Bags are free."),
          opt("o2", "봉투는 보통 따로 돈을 내요.", true, en),
          opt("o3", "봉투가 없어요.", false, "There are no bags."),
        ],
      });

      const question = questionOf(cultureCheckItemOf(item, port)) ?? {};

      expect("choiceTranslations" in question).toBe(false);
      expect(question).toEqual(rest);
    }
  });

  test("CKM3. 보기가 하나이거나 빈 보기가 있거나 질문(context.ko)이 비면 malformed다", () => {
    expect(
      cultureCheckItemOf(cultureCheck({ options: [opt("o1", "하나", true, "one")] }), port),
    ).toEqual(skippedWith("malformed"));
    expect(
      cultureCheckItemOf(
        cultureCheck({ options: [opt("o1", "가", true, "a"), opt("o2", "  ", false, "b")] }),
        port,
      ),
    ).toEqual(skippedWith("malformed"));
    expect(cultureCheckItemOf(cultureCheck({ context: t("  ", "r", "Question") }), port)).toEqual(
      skippedWith("malformed"),
    );
  });

  test("CKM3. 정답 보기가 없으면 malformed다", () => {
    const options = cultureCheck().options.map((option) => ({ ...option, correct: false }));

    expect(cultureCheckItemOf(cultureCheck({ options }), port)).toEqual(skippedWith("malformed"));
  });

  test("CKM4. 보기를 섞지 않는다 — 정답이 셋째 보기면 answerIndex는 2다", () => {
    const item = cultureCheck({
      options: [
        opt("o1", "가", false, "a"),
        opt("o2", "나", false, "b"),
        opt("o3", "다", true, "c"),
      ],
    });

    const question = questionOf(cultureCheckItemOf(item, port));

    expect(question).toMatchObject({ choices: ["가", "나", "다"], answerIndex: 2 });
    expect(question?.["choiceTranslations"]).toEqual(["a", "b", "c"]);
  });

  test("CKM4. 같은 문항을 두 번 매핑하면 같고 입력은 바뀌지 않는다", () => {
    const item = cultureCheck();
    const snapshot = structuredClone(item);

    expect(cultureCheckItemOf(item, port)).toEqual(cultureCheckItemOf(item, port));
    expect(item).toEqual(snapshot);
  });
});
