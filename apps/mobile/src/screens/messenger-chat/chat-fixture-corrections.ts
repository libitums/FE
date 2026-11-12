// 가짜 교정 표(ADR-0129 카드 모양)입니다. 한국어 문장은 학습 내용입니다(ui-copy 정책 허용 대상).

import type { ChatFixtureCorrection } from "./chat-source.contract";

export const chatFixtureCorrections: Readonly<
  Record<"questionFix" | "coffeeFix" | "politeFix" | "englishFix", ChatFixtureCorrection>
> = {
  // 범위는 corrected 안 코드 포인트입니다. 첫째는 씨앗 내 글에 붙고, 둘째는 보낸 글에 답이 올 때 생깁니다.
  questionFix: {
    original: "저 체크아웃 몇 시예요?",
    corrected: "저는 체크아웃이 몇 시예요?",
    changes: [
      { start: 1, end: 2 },
      { start: 7, end: 8 },
    ],
    kind: "correction",
    items: [
      { original: "저", corrected: "저는", reason: "Add 는 to mark the topic." },
      { original: "체크아웃", corrected: "체크아웃이", reason: "Add 이 to mark the subject." },
    ],
    better: null,
    meaning: "What time is my check-out?",
  },
  coffeeFix: {
    original: "저 커피 좋아해요.",
    corrected: "저는 커피를 좋아해요.",
    changes: [
      { start: 1, end: 2 },
      { start: 5, end: 6 },
    ],
    kind: "correction",
    items: [
      { original: "저", corrected: "저는", reason: "Add 는 to mark the topic." },
      { original: "커피", corrected: "커피를", reason: "Add 를 to mark the object." },
    ],
    better: {
      text: "저 커피 진짜 좋아해요.",
      meaning: "I really like coffee.",
      explanation: "With a friend, 진짜 sounds warm and natural.",
    },
    meaning: "I like coffee.",
  },
  // 교정 카드의 다른 두 종류(ADR-0129) — 맞지만 더 자연스러운 말 · 모국어로 쓴 글.
  politeFix: {
    original: "커피를 좋아합니다.",
    corrected: "커피를 좋아합니다.",
    changes: [],
    kind: "better",
    items: [],
    better: {
      text: "저 커피 좋아해요.",
      meaning: "I like coffee.",
      explanation:
        "Your sentence is correct. With a friend, 좋아해요 sounds more natural than 좋아합니다.",
    },
    meaning: "I like coffee.",
  },
  englishFix: {
    original: "I went to a cafe",
    corrected: "카페에 갔어요.",
    changes: [],
    kind: "l1_to_ko",
    items: [],
    better: null,
    meaning: "I went to a café.",
  },
};
