// 테스트 지원 — 디코더가 받아들이는 가장 작은 delivery-2 와이어 조각들입니다.
// 제품 코드는 import하지 않습니다(타입 목록만 씁니다).

import type { KNOWN_ITEM_TYPES } from "./episode-content.schema";

export type Wire = Record<string, unknown>;
export type ItemType = (typeof KNOWN_ITEM_TYPES)[number];

const t2 = (ko: string): Wire => ({ ko, roman: `r-${ko}` });
const t3 = (ko: string): Wire => ({ ko, roman: `r-${ko}`, en: `e-${ko}` });
const prompt = (): Wire => ({ ko: "질문", en: "question" });
const fb = (): Wire => ({ correct: { ko: "맞아요" } });

/** 첫째가 정답인 보기 `count`개. `correctCount`로 정답 수를 바꿀 수 있습니다. */
export function options(count: number, correctCount = 1): Wire[] {
  return Array.from({ length: count }, (_, i) => {
    const option: Wire = {
      id: `o${i + 1}`,
      ko: `보기${i + 1}`,
      roman: `bogi${i + 1}`,
      correct: i < correctCount,
    };
    return i < correctCount ? option : { ...option, why_wrong: "이 자리에 맞는 말이 아니다" };
  });
}

export function roleplayTurnWire(id: string, lineId = "D1"): Wire {
  return {
    id,
    type: "ROLEPLAY_TURN",
    mode: "either",
    event: "R",
    prompt: { ko: "뭐라고 말할까요?", en: "What do you say?" },
    context: { ko: "상대 대사", roman: "sangdae daesa", en: "Other line" },
    stimulus: {
      text: { ko: "내 대사", roman: "nae daesa", en: "My line" },
      audio_url: "",
      image_url: "",
    },
    tiles: [
      { ko: "내", roman: "nae" },
      { ko: "대사", roman: "daesa" },
    ],
    answers: [{ ko: "내 대사", roman: "nae daesa", en: "My line" }],
    feedback: fb(),
    roleplay: { line_id: lineId, tiles_gloss: [{ tile: "내" }, { tile: "대사", en: "line" }] },
  };
}

/** 유형마다 최소 유효 문항. `extra`는 마지막에 덮어씁니다. */
export function item(type: ItemType, id: string, extra: Wire = {}): Wire {
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
    IMG_MATCH: { prompt: prompt(), stimulus: { image_brief: "brief" }, options: options(4) },
    WORD_ORDER: {
      mode: "tiles",
      prompt: prompt(),
      tiles: [t2("가"), t2("나"), t2("다")],
      answers: [t3("가 나 다")],
    },
    LISTEN_SELECT: { prompt: prompt(), stimulus: { audio: t3("듣기") }, options: options(4) },
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
    TRANSLATE_TO_KO: { mode: "typing", prompt: prompt(), answers: [t3("정답")] },
    TRANSLATE_TO_EN: { prompt: prompt(), stimulus: { text: t2("문장") }, options: options(4) },
    DICTATION: {
      mode: "typing",
      prompt: prompt(),
      stimulus: { audio: t3("받아쓰기") },
      answers: [t3("정답")],
    },
    SENT_BUILD: { mode: "typing", prompt: prompt(), context: t2("패턴"), answers: [t3("정답")] },
    PAIR_MATCH: {
      mode: "match",
      prompt: prompt(),
      tiles: [t2("A"), t2("B"), t2("C"), t2("D")],
      tiles_gloss_en: "a / b / c / d",
      answers: [t2("A=a | B=b | C=c | D=d")],
    },
    ROLEPLAY_TURN: roleplayTurnWire(id),
    CLOZE_CHOICE: {
      prompt: prompt(),
      context: t3("___ 문맥"),
      options: options(4),
      answers: [t3("정답")],
      feedback: fb(),
    },
    REPLY_SELECT: {
      prompt: prompt(),
      stimulus: { audio: t3("상대 말") },
      options: options(3),
      feedback: fb(),
    },
    MIN_PAIR_AB: {
      event: "D",
      prompt: prompt(),
      stimulus: { audio: t3("빵") },
      options: options(2),
      feedback: fb(),
    },
    PARTICLE_FILL: {
      prompt: prompt(),
      stimulus: { text: t3("봉투___") },
      options: options(2),
      feedback: fb(),
    },
    PARTICLE_SWAP: {
      prompt: prompt(),
      stimulus: { text: t3("봉투이") },
      options: options(3),
      feedback: fb(),
    },
    CULTURE_CHECK: {
      prompt: prompt(),
      context: t3("문화 문맥"),
      options: options(3),
      feedback: fb(),
    },
    CULTURE_CARD: {
      mode: "card",
      event: "E",
      context: t3("문화 카드"),
      stimulus: { text: t3("문화 본문") },
      feedback: fb(),
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

export const step = (id: string, order: number, items: Wire[]): Wire => ({ id, order, items });

export function cut(index: number, extra: Wire = {}): Wire {
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

export function dialogueLine(seq: number, extra: Wire = {}): Wire {
  return {
    seq,
    role: seq % 2 === 1 ? "counterpart" : "player",
    text: t3(`대사${seq}`),
    audio_url: "",
    ...extra,
  };
}

/** 스텝 S1(문항 `items`) + RP(order 2) · 컷 1+1 · 대화 2 · 단어 1 · 패턴 1. */
export function minimalEpisode(
  overrides: Wire = {},
  items: Wire[] = [item("ROLE_LINE", "S1-01")],
): Wire {
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
    steps: [step("S1", 1, items), step("RP", 2, [roleplayTurnWire("RP-01")])],
    words: [{ id: "voca:1", ko: "물", roman: "mul", gloss_en: "water", role: "target" }],
    patterns: [{ id: "patt:1", ko: "{명사} 주세요", roman: "juseyo", gloss_en: "please give me" }],
    ...overrides,
  };
}
