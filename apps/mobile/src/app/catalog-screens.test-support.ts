// 테스트 지원 — 문화 카드 · 문화 확인 · 음절 조립 · 듣기 조립 문항 빌더와 매핑 포트입니다. 제품 코드는 import하지 않습니다.
import type { LearningItem, Option, Stimulus, Text } from "../lib/episode-content.model";
import type { CatalogFill, CatalogGlossOf, CatalogLessonItemPort } from "./catalog-lesson-types";

export const scriptFill: CatalogFill = (text, script) => {
  const name = { ko: "민아", roman: "mina", en: "Mina" }[script];
  return text.replaceAll("{이름}", name);
};

export function portOf(overrides: { glossOf?: CatalogGlossOf; fill?: CatalogFill } = {}) {
  const port: CatalogLessonItemPort = {
    fill: overrides.fill ?? scriptFill,
    episodeId: "u01-water",
    glossOf: overrides.glossOf ?? (() => null),
    imageUrlOf: (path) => `https://cdn/${path}`,
  };
  return port;
}

export const t = (ko: string, roman?: string, en?: string): Text => ({
  ko,
  ...(roman === undefined ? {} : { roman }),
  ...(en === undefined ? {} : { en }),
});

export const opt = (id: string, ko: string, correct: boolean, en?: string): Option => ({
  id,
  ko,
  roman: `r-${ko}`,
  ...(en === undefined ? {} : { en }),
  correct,
});

type CardType = Extract<LearningItem, { type: "CULTURE_CARD" }>;
type CheckType = Extract<LearningItem, { type: "CULTURE_CHECK" }>;
type SyllableType = Extract<LearningItem, { type: "SYLLABLE_BUILD" }>;

const feedback = { correct: { ko: "맞아요", en: "Right" } };

/** u01 CULT-01(편의점 봉투) 꼴 문화 카드입니다. */
export function cultureCard(overrides: Partial<CardType> = {}): CardType {
  return {
    id: "CULT-01",
    event: "R",
    type: "CULTURE_CARD",
    context: t("편의점 봉투", "pyeonuijeom bongtu", "Bags at the convenience store"),
    stimulus: {
      text: t(
        "한국 편의점에서는 봉투를 따로 사요.",
        "hanguk pyeonuijeomeseoneun bongtureul ttaro sayo.",
        "At Korean convenience stores, you buy bags separately.",
      ),
      audioUrl: "https://cdn/a.mp3",
      imageUrl: "images/a.jpg",
    },
    feedback,
    ...overrides,
  };
}

/** u01 CULT-04 꼴 문화 확인입니다 — 정답은 둘째 보기입니다. */
export function cultureCheck(overrides: Partial<CheckType> = {}): CheckType {
  return {
    id: "CULT-04",
    event: "R",
    type: "CULTURE_CHECK",
    prompt: { ko: "맞는 것을 고르세요.", en: "Pick the right one." },
    context: t(
      "한국 편의점에서 봉투는 어떨까요?",
      "hanguk pyeonuijeomeseo bongtuneun eotteolkkayo?",
      "What about bags at Korean convenience stores?",
    ),
    options: [
      opt("o1", "봉투는 공짜예요.", false, "Bags are free."),
      opt("o2", "봉투는 보통 따로 돈을 내요.", true, "Bags usually cost extra."),
      opt("o3", "봉투가 없어요.", false, "There are no bags."),
    ],
    feedback,
    ...overrides,
  };
}

/** 정답 순서의 타일 뒤에 오답 음절이 붙는 음절 조립 문항입니다(u01 S3-12 `카드` 꼴). */
export function syllableBuild(
  overrides: Partial<SyllableType> & { stimulus?: Stimulus } = {},
): SyllableType {
  return {
    id: "S3-12",
    event: "R",
    type: "SYLLABLE_BUILD",
    prompt: { ko: "음절을 눌러 쓰세요.", en: "Tap the syllables to spell the word." },
    stimulus: { en: "card", audioUrl: "", imageUrl: "" },
    tiles: [t("카"), t("드"), t("찮"), t("현")],
    answers: [t("카드", "kadeu")],
    ...overrides,
  };
}

export function listenBuild(id = "S4-01"): LearningItem {
  return {
    id,
    event: "R",
    type: "LISTEN_BUILD",
    prompt: { ko: "들으세요.", en: "Listen." },
    stimulus: { audio: t("듣기", "deutgi", "Listening") },
    tiles: [t("가"), t("나")],
    answers: [t("가나")],
  };
}

export function clozeChoice(id: string): LearningItem {
  return {
    id,
    event: "R",
    type: "CLOZE_CHOICE",
    prompt: { ko: "빈칸을 채우세요.", en: "Fill in the blank." },
    context: t("___ 할게요.", "___ halgeyo.", "I'll pay by card."),
    options: [opt("o1", "봉투로", false), opt("o2", "카드로", true), opt("o3", "주스로", false)],
    answers: [t("카드로", "kadeuro")],
    feedback,
  };
}
