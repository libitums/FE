import { expect, test } from "vitest";

import type { FeedbackRequest } from "./chat-send.contract.ts";
import { fakeCompanionLlm } from "./companion-llm-fake.ts";
import { feedbackContent, feedbackFrom, feedbackSystem } from "./companion-llm-prompts.ts";

const request = (overrides: Partial<FeedbackRequest> = {}): FeedbackRequest => ({
  text: "안녕하세요",
  l1: "en",
  previous: null,
  speechLevel: "polite",
  character: { name: "윤경", role: "guesthouse owner", banmalFeedback: "better" },
  signal: new AbortController().signal,
  ...overrides,
});
const fake = fakeCompanionLlm();
const feedback = (text: string, overrides: Partial<FeedbackRequest> = {}) =>
  fake.feedback(request({ text, ...overrides }));

// FB1 — 프롬프트가 규칙을 싣는다. 모델 품질은 companion-eval로 보고, 여기서는 규칙 글이 빠지지 않았는지만 고정한다.
test("FB1. 피드백 프롬프트 — 섞인 언어 · 말투 · 맞춤법 · 자연스러움 · 피로 규칙", () => {
  const polite = feedbackSystem(request());
  for (const rule of [
    "If any part of the message is not Korean (the whole message, or some words",
    "Never explain why it should be in Korean",
    '"l1ToKo.text" is only the Korean sentence',
    '"안녕하세요! 뭐 해?"',
    "spelling and typos",
    "ignore ordinary chat spacing slips",
    "ㅋㅋ, ㅎㅎ, ㅇㅇ, ~ endings, emoji",
    '"나는 너를 좋아해요"',
    "Give one suggestion",
    'when unsure return status "none"',
    "No comments about the learner, the character or the conversation.",
    'use kind "better" with the same sentence in polite style',
  ]) {
    expect(polite, rule).toContain(rule);
  }
  const casual = feedbackSystem(request({ speechLevel: "casual" }));
  expect(casual).toContain("존댓말 is always acceptable — never give feedback on it.");
  expect(casual).toContain("If the character is a teacher or an elder, treat 반말");
  expect(feedbackSystem(request({ speechLevel: null }))).toContain("speech level is unknown");
  expect(feedbackSystem(request({ l1: null }))).toContain('BCP 47 tag "en"');
  expect(feedbackContent(request({ previous: "뭐 해요?", text: "밥 먹어요" }))).toBe(
    "Character: 윤경 (guesthouse owner)\nRelationship speech level: polite\nThe character just said: 뭐 해요?\nLearner's message: 밥 먹어요",
  );
  expect(feedbackContent(request({ character: null, speechLevel: null }))).toBe(
    "Learner's message: 안녕하세요",
  );
});

test("FB2. 받은 결과 다듬기 — l1_to_ko에는 번역만, 본문 없는 kind는 none", () => {
  const item = { original: "a", corrected: "b", reason: "r" };
  const better = { text: "t", meaning: "m", explanation: "e" };
  expect(
    feedbackFrom({
      status: "ok",
      kind: "l1_to_ko",
      items: [item],
      better,
      l1ToKo: { text: "커피 좋아해요", meaning: "I like coffee" },
    }),
  ).toEqual({
    status: "ok",
    kind: "l1_to_ko",
    l1ToKo: { text: "커피 좋아해요", meaning: "I like coffee" },
  });
  const empty = { items: null, better: null, l1ToKo: null };
  expect(feedbackFrom({ status: "ok", kind: "l1_to_ko", ...empty })).toEqual({ status: "none" });
  expect(feedbackFrom({ status: "ok", kind: "better", ...empty })).toEqual({ status: "none" });
  expect(feedbackFrom({ status: "ok", kind: "correction", ...empty, items: [] })).toEqual({
    status: "none",
  });
  expect(feedbackFrom({ status: "none", kind: "correction", ...empty, items: [item] })).toEqual({
    status: "none",
  });
  expect(
    feedbackFrom({ status: "ok", kind: "correction", ...empty, items: [item], better }),
  ).toEqual({ status: "ok", kind: "correction", items: [item], better });
});

test("FB3. 가짜 계층 — 섞인 언어는 l1_to_ko(이유 설명 없음)", async () => {
  expect(await feedback("저는 coffee 좋아해요")).toEqual({
    status: "ok",
    kind: "l1_to_ko",
    l1ToKo: { text: "저는 좋아해요", meaning: "저는 coffee 좋아해요" },
  });
  expect((await feedback("I like coffee"))?.kind).toBe("l1_to_ko");
  // 흐름 낱말([better] 같은 태그)은 다른 언어로 치지 않는다.
  expect((await feedback("반가워요 [better]"))?.kind).toBe("better");
});

test("FB4. 가짜 계층 — 말투: 섞이면 교정, 존댓말 관계의 반말은 better, 반말 관계의 존댓말은 없음", async () => {
  expect(await feedback("안녕하세요! 뭐 해?")).toMatchObject({
    kind: "correction",
    items: [{ original: "뭐 해?", corrected: "뭐 해요?" }],
  });
  expect(await feedback("뭐 해?")).toMatchObject({ kind: "better", better: { text: "뭐 해요?" } });
  expect(await feedback("뭐 해?", { speechLevel: "casual" })).toEqual({ status: "none" });
  expect(await feedback("뭐 해요?", { speechLevel: "casual" })).toEqual({ status: "none" });
});

test("FB5. 가짜 계층 — 맞춤법은 교정, 채팅 관습은 없음, 어색한 직역은 better 하나", async () => {
  expect(await feedback("안녕하새요")).toMatchObject({
    kind: "correction",
    items: [{ original: "하새요", corrected: "하세요" }],
  });
  expect(await feedback("좋아요 ㅋㅋ")).toEqual({ status: "none" });
  expect(await feedback("나는 너를 좋아해요")).toMatchObject({
    kind: "better",
    better: { text: "너 좋아해요." },
  });
  expect(await feedback("저는 학생 이에요")).toMatchObject({ kind: "correction" });
});

// FB6 — 사용자 결정(2026-11-09): 덕수쌤(선생님)에게 존댓말 관계에서 반말은 교정. 페르소나 칸 `banmalFeedback`이 정한다.
test("FB6. 페르소나 banmalFeedback=correction이면 존댓말 관계의 반말은 교정 — 다른 캐릭터는 better", async () => {
  const duksu = { name: "덕수쌤", role: "teacher", banmalFeedback: "correction" } as const;
  const strict = feedbackSystem(request({ character: duksu }));
  expect(strict).toContain('use kind "correction" with one item per 반말 ending');
  expect(strict).not.toContain('use kind "better" with the same sentence in polite style');
  expect(feedbackSystem(request())).toContain(
    'use kind "better" with the same sentence in polite style',
  );
  expect(await feedback("뭐 해?", { character: duksu })).toMatchObject({
    kind: "correction",
    items: [{ original: "뭐 해?", corrected: "뭐 해요?" }],
  });
  expect(await feedback("뭐 해?")).toMatchObject({ kind: "better" });
});
