// 내 스토리 반응의 역할 평가 세트(ADR-0191 D15 · D16) — 첫째의 공감 + 질문, 둘째가 먼저 단 말과 겹치지 않음, 덕수쌤 단어 담당,
// 무거운 분위기, 조합 스토리(색 · 사진 × 글 · 단어). 실제 LLM을 부르지 않는 데이터다.

import {
  noPeople,
  quiz,
  reactionSet,
  type Reaction,
  wordRole,
} from "./companion-eval-sets-reactions-support.ts";

const composed = (
  kind: "text" | "photo",
  texts: string[],
  words: { ko: string; meaning: string }[],
  angle: Reaction["angle"],
  extra: Partial<Reaction> = {},
): Reaction => ({
  kind,
  ko: texts[0] ?? "",
  meaning: "",
  exampleKo: null,
  angle,
  texts,
  words,
  ...extra,
});

/** 역할(ADR-0191 D16) · 조합 스토리(D15) — 첫째의 공감 + 질문, 둘째가 먼저 단 말과 겹치지 않음, 덕수쌤 단어 담당, 무거운 분위기. */
export const roleSet = reactionSet(
  "story-reaction-roles",
  "내 스토리 반응 · 역할 — 첫째 · 둘째(겹치지 않게) · 덕수쌤 단어 담당 · 무거운 분위기 · 조합 스토리",
  [
    [
      "RR1",
      "mina",
      composed("photo", ["여기 진짜 맛있어!"], [], "react", {
        scene: "A bowl of tteokbokki and fried snacks on a small table in a busy market.",
      }),
      "natural: 공감 · 감탄으로 시작하고, 궁금하면 질문 하나까지 붙여도 된다(「맛있어 보여요! 여긴 어디예요?」 같은). 질문이 둘이면 실패. " +
        noPeople,
      { speechLevel: "casual", intimacy: 30 },
    ],
    [
      "RR2",
      "doyun",
      composed("photo", ["여기 진짜 맛있어!"], [], "follow", {
        scene: "A bowl of tteokbokki and fried snacks on a small table in a busy market.",
        friendReply: { name: "미나", text: "우와 맛있겠다! 여기 어디야?" },
      }),
      "natural: 미나가 이미 어디냐고 물었다 — 같은 질문(어디예요?)을 하면 실패. 공감 · 응원 · 제안(같이 가자 등 어울림) 중 하나. " +
        noPeople,
    ],
    [
      "RR3",
      "geonwoo",
      composed("text", ["오늘 시험 끝!"], [], "follow", {
        friendReply: { name: "서연", text: "와 수고했어요! 진짜 고생 많았어요." },
      }),
      "natural: 서연이 이미 수고했다고 공감했다 — 같은 말만 되풀이하면 실패. 가벼운 질문 하나나 어울리는 제안(축하로 뭐 먹기 등)이면 통과.",
      { speechLevel: "casual", intimacy: 40 },
    ],
    [
      "RR4",
      "duksu",
      composed("photo", ["바다 왔어요"], [{ ko: "여름", meaning: "summer" }], "quiz", {
        scene: "A sunny beach with blue water and a beach umbrella.",
      }),
      `먼저 사진에 짧게 반응하고 사진과 엮어 퀴즈를 낸다. ${quiz} ` + noPeople,
    ],
    [
      "RR5",
      "duksu",
      composed(
        "text",
        ["오늘 너무 힘들었어요…"],
        [{ ko: "피곤하다", meaning: "to be tired" }],
        "quiz",
      ),
      "natural: 분위기가 무겁다 — 퀴즈를 내면 실패. 응원 · 위로가 먼저이고 단어는 자연스러울 때만. persona: 선생님답게 따뜻하게, 강의하지 않는다.",
    ],
    [
      "RR6",
      "jaemin",
      composed("text", ["비 오는 날 혼자 집에 있어요"], [], "follow"),
      "natural: 쓸쓸한 분위기 — 들뜬 제안(같이 놀러 가자)을 밀면 실패. 공감 · 응원이나 가벼운 질문 하나.",
    ],
    [
      "RR7",
      "duksu",
      composed("text", [], [{ ko: "산책", meaning: "a walk" }], "word"),
      `색 바탕에 단어만 — 단어 카드처럼 그 단어가 주인공이다. ${wordRole}`,
    ],
    [
      "RR8",
      "haejun",
      composed("text", ["비 오는 날"], [{ ko: "우산", meaning: "umbrella" }], "react"),
      "natural: 쓴 글(비 오는 날)에 먼저 반응하고, 어울리면 우산을 엮는다. 단어만 말하고 글을 무시하면 실패.",
      { speechLevel: "casual", intimacy: 50 },
    ],
  ],
);
