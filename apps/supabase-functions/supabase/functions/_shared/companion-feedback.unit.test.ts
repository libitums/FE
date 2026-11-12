import { expect, test } from "vitest";

import type { FeedbackRequest } from "./chat-send.contract.ts";
import { fakeCompanionLlm } from "./companion-llm-fake.ts";
import {
  feedbackContent,
  feedbackFrom,
  feedbackHistoryLimit,
  feedbackSystem,
  recentFeedbackHistory,
} from "./companion-llm-prompts.ts";

const request = (overrides: Partial<FeedbackRequest> = {}): FeedbackRequest => ({
  text: "안녕하세요",
  l1: "en",
  previous: null,
  history: [],
  speechLevel: "polite",
  character: { name: "윤경", role: "guesthouse owner", banmalFeedback: "better" },
  signal: new AbortController().signal,
  ...overrides,
});
const fake = fakeCompanionLlm();
const feedback = (text: string, overrides: Partial<FeedbackRequest> = {}) =>
  fake.feedback(request({ text, ...overrides }));

// FB1 — 프롬프트가 규칙을 싣는다. 모델 품질은 companion-eval로 보고, 여기서는 규칙 글이 빠지지 않았는지만 고정한다.
test("FB1. 피드백 프롬프트 — 카드 칸 · 섞인 언어 · 말투 · 맞춤법 · 비속어 · 자연스러움 · *행동* · 피로 규칙", () => {
  const polite = feedbackSystem(request());
  for (const rule of [
    '"corrected": the learner\'s whole message as one correct, natural Korean text with ALL fixes applied',
    '"items": one entry per problem',
    '"better": an extra, different natural way to say it — only when clearly useful',
    '"meaning" its meaning, "explanation" one plain sentence',
    "list every distinct problem as its own item — do not merge them and do not drop any",
    "with ALL fixes applied",
    '"meaning": the meaning of "corrected". Required for kind "l1_to_ko"',
    "If any part of the message is not Korean (the whole message, or some words",
    "Never explain why it should be in Korean",
    '"안녕하세요! 뭐 해?"',
    "spelling and typos",
    "ignore ordinary chat spacing slips",
    "4. Profanity.",
    "비속어 (vulgar)",
    "ㅅㅂ, 시1발, ㅂㅅ, f*ck",
    "ㅋㅋ, ㅎㅎ, ㅇㅇ, ~ endings, emoji",
    '"나는 너를 좋아해요"',
    "Text between asterisks",
    "never judge its speech level",
    'when unsure return status "none"',
    "No comments about the learner, the character or the conversation.",
    'use kind "better" (not a correction): "corrected" is the same message in polite style',
  ]) {
    expect(polite, rule).toContain(rule);
  }
  expect(polite).not.toContain("l1ToKo");
  const casual = feedbackSystem(request({ speechLevel: "casual" }));
  expect(casual).toContain("존댓말 is always acceptable — never give feedback on it.");
  expect(casual).toContain("If the character is a teacher or an elder, treat 반말");
  expect(feedbackSystem(request({ speechLevel: null }))).toContain("speech level is unknown");
  expect(feedbackSystem(request({ l1: null }))).toContain('BCP 47 tag "en"');
  expect(feedbackContent(request({ previous: "뭐 해요?", text: "밥 먹어요" }))).toBe(
    "Character: 윤경 (guesthouse owner)\nRelationship speech level: polite\nThe character just said: 뭐 해요?\nLatest learner message (give feedback on this only): 밥 먹어요",
  );
  expect(feedbackContent(request({ character: null, speechLevel: null }))).toBe(
    "Latest learner message (give feedback on this only): 안녕하세요",
  );
});

// FB2 — 카드는 칸이 늘 모두 있다. 고친 문장이 빠진 교정은 조각을 적용해 살리고, 본문 없는 카드는 none.
test("FB2. 받은 결과 다듬기 — 고정 카드", () => {
  const item = { original: "마리아 이에요", corrected: "마리아예요", reason: "r" };
  const draft = { corrected: null, items: [], better: null, meaning: null };
  const original = "저는 마리아 이에요";
  expect(
    feedbackFrom(
      {
        status: "ok",
        kind: "l1_to_ko",
        corrected: "커피 좋아해요",
        items: [item],
        better: { text: "커피가 좋아요", meaning: "m", explanation: "e" },
        meaning: "I like coffee",
      },
      "I like coffee",
    ),
  ).toEqual({
    status: "ok",
    kind: "l1_to_ko",
    original: "I like coffee",
    corrected: "커피 좋아해요",
    items: [],
    better: null,
    meaning: "I like coffee",
  });
  const none = {
    status: "none",
    kind: null,
    original,
    corrected: null,
    items: [],
    better: null,
    meaning: null,
  };
  expect(feedbackFrom({ status: "ok", kind: "l1_to_ko", ...draft }, original)).toEqual(none);
  expect(feedbackFrom({ status: "ok", kind: "better", ...draft }, original)).toEqual(none);
  expect(feedbackFrom({ status: "ok", kind: "correction", ...draft }, original)).toEqual(none);
  expect(
    feedbackFrom({ status: "none", kind: "correction", ...draft, items: [item] }, original),
  ).toEqual(none);
  // 고친 문장이 빠지면 조각을 적용한다 · 덧붙임이 고친 문장과 같으면 뺀다.
  expect(
    feedbackFrom(
      {
        status: "ok",
        kind: "correction",
        ...draft,
        items: [item],
        better: { text: "저는 마리아예요", meaning: "m", explanation: "e" },
      },
      original,
    ),
  ).toEqual({
    status: "ok",
    kind: "correction",
    original,
    corrected: "저는 마리아예요",
    items: [item],
    better: null,
    meaning: null,
  });
});

test("FB3. 가짜 계층 — 섞인 언어는 l1_to_ko(이유 설명 없음, 조각 없음, 뜻 있음)", async () => {
  expect(await feedback("저는 coffee 좋아해요")).toEqual({
    status: "ok",
    kind: "l1_to_ko",
    original: "저는 coffee 좋아해요",
    corrected: "저는 좋아해요",
    items: [],
    better: null,
    meaning: "저는 coffee 좋아해요",
  });
  expect((await feedback("I like coffee"))?.kind).toBe("l1_to_ko");
  // 흐름 낱말([better] 같은 태그)은 다른 언어로 치지 않는다.
  expect(await feedback("반가워요 [better]")).toMatchObject({
    kind: "better",
    corrected: "만나서 반가워요!",
    better: { text: "반가워요!", meaning: "Nice to meet you!" },
  });
});

test("FB4. 가짜 계층 — 말투: 섞이면 교정, 존댓말 관계의 반말은 better, 반말 관계의 존댓말은 없음", async () => {
  expect(await feedback("안녕하세요! 뭐 해?")).toMatchObject({
    kind: "correction",
    original: "안녕하세요! 뭐 해?",
    corrected: "안녕하세요! 뭐 해요?",
    items: [{ original: "뭐 해?", corrected: "뭐 해요?" }],
  });
  expect(await feedback("뭐 해?")).toMatchObject({ kind: "better", corrected: "뭐 해요?" });
  expect(await feedback("뭐 해?", { speechLevel: "casual" })).toMatchObject({ status: "none" });
  expect(await feedback("뭐 해요?", { speechLevel: "casual" })).toMatchObject({ status: "none" });
});

test("FB5. 가짜 계층 — 맞춤법은 교정, 채팅 관습은 없음, 어색한 직역은 better 하나", async () => {
  expect(await feedback("안녕하새요")).toMatchObject({
    kind: "correction",
    corrected: "안녕하세요",
    items: [{ original: "하새요", corrected: "하세요" }],
  });
  expect(await feedback("좋아요 ㅋㅋ")).toMatchObject({ status: "none", kind: null });
  expect(await feedback("나는 너를 좋아해요")).toMatchObject({
    kind: "better",
    corrected: "너 좋아해요.",
  });
  expect(await feedback("저는 학생 이에요")).toMatchObject({
    kind: "correction",
    corrected: "저는 학생이에요",
  });
});

// FB6 — 사용자 결정(2026-11-09): 덕수쌤(선생님)에게 존댓말 관계에서 반말은 교정. 페르소나 칸 `banmalFeedback`이 정한다.
test("FB6. 페르소나 banmalFeedback=correction이면 존댓말 관계의 반말은 교정 — 다른 캐릭터는 better", async () => {
  const duksu = { name: "덕수쌤", role: "teacher", banmalFeedback: "correction" } as const;
  const strict = feedbackSystem(request({ character: duksu }));
  expect(strict).toContain('If the learner speaks in 반말, use kind "correction"');
  expect(strict).not.toContain('use kind "better" (not a correction)');
  expect(feedbackSystem(request())).toContain('use kind "better" (not a correction)');
  expect(await feedback("뭐 해?", { character: duksu })).toMatchObject({
    kind: "correction",
    items: [{ original: "뭐 해?", corrected: "뭐 해요?" }],
  });
  expect(await feedback("뭐 해?")).toMatchObject({ kind: "better" });
});

test("FB8. 가짜 계층 — 혼잣말 욕은 순화한 better(비속어라고 밝힌다)", async () => {
  expect(await feedback("아 씨 시험 망했어")).toEqual({
    status: "ok",
    kind: "better",
    original: "아 씨 시험 망했어",
    corrected: "아이고 시험 망했어",
    items: [
      {
        original: "아 씨",
        corrected: "아이고",
        reason: "'아 씨' is 비속어 (a swear word); '아이고' says it without swearing.",
      },
    ],
    better: null,
    meaning: null,
  });
  for (const text of ["ㅅㅂ 늦었다", "시 1 발 늦었다", "존나 피곤해요"]) {
    const card = await feedback(text, { speechLevel: "casual" });
    expect(card, text).toMatchObject({ kind: "better" });
    expect(card.items[0]?.reason, text).toContain("비속어");
  }
});

test("FB9. *행동 · 속마음*은 말투 판정에서 빼고 맞춤법은 본다", async () => {
  // 별표 안 반말은 존댓말 관계여도 피드백 없음.
  expect(await feedback("*뭐 해? 궁금하다* 안녕하세요")).toMatchObject({ status: "none" });
  // 별표 밖 반말은 그대로 better.
  expect(await feedback("*웃으며* 뭐 해?")).toMatchObject({
    kind: "better",
    corrected: "*웃으며* 뭐 해요?",
  });
  // 별표 안 맞춤법은 고친다.
  expect(await feedback("*안녕하새요 해야지* 네")).toMatchObject({
    kind: "correction",
    corrected: "*안녕하세요 해야지* 네",
  });
});

// FB7 — 최근 대화는 맥락일 뿐: 마지막 6개 · 글자만 · 빈 줄 없음, 이번 메시지만 피드백한다는 틀.
test("FB7. 피드백 맥락 — 최근 대화 6개, 맥락일 뿐이라고 밝힌다", () => {
  const history = recentFeedbackHistory([
    { role: "user", text: "하나" },
    { role: "assistant", segments: [{ kind: "speech", text: "둘", translation: "two" }] },
    { role: "user", text: "셋" },
    { role: "assistant", segments: [] },
    { role: "user", text: "넷" },
    {
      role: "assistant",
      segments: [
        { kind: "action", text: "웃는다" },
        { kind: "speech", text: "다섯" },
      ],
    },
    { role: "user", text: "  " },
    { role: "user", text: "여섯" },
    { role: "assistant", segments: [{ kind: "speech", text: "일곱" }] },
  ]);
  expect(history).toEqual([
    { role: "assistant", text: "둘" },
    { role: "user", text: "셋" },
    { role: "user", text: "넷" },
    { role: "assistant", text: "웃는다\n다섯" },
    { role: "user", text: "여섯" },
    { role: "assistant", text: "일곱" },
  ]);
  expect(feedbackHistoryLimit).toBe(6);
  const content = feedbackContent(
    request({
      history: history.slice(-2),
      previous: "일곱",
      text: "좋아요",
      character: null,
      speechLevel: null,
    }),
  );
  expect(content).toBe(
    "Recent conversation (context only — do not give feedback on it):\nLearner: 여섯\nCharacter: 일곱\n\nLatest learner message (give feedback on this only): 좋아요",
  );
  expect(feedbackSystem(request())).toContain(
    "The recent conversation, if given, is context only: give feedback on the latest learner message only",
  );
});

// FB10 — 한 메시지에 고칠 점이 여럿이면 하나씩 따로, 올바른 문장에는 전부 적용(사용자 결정 2026-11-09, Moly 형식).
test("FB10. 고칠 점 여럿 — 항목마다 따로, 올바른 문장은 모두 고친 것", async () => {
  expect(await feedback("안녕하새요. 저는 마리아 이에요. 학생 이에요")).toEqual({
    status: "ok",
    kind: "correction",
    original: "안녕하새요. 저는 마리아 이에요. 학생 이에요",
    corrected: "안녕하세요. 저는 마리아이에요. 학생이에요",
    items: [
      {
        original: "마리아 이에요",
        corrected: "마리아이에요",
        reason: "Attach 이에요/예요 to the noun without a space.",
      },
      {
        original: "학생 이에요",
        corrected: "학생이에요",
        reason: "Attach 이에요/예요 to the noun without a space.",
      },
      { original: "하새요", corrected: "하세요", reason: "The ending is spelled 세요." },
    ],
    better: null,
    meaning: null,
  });
});

test("FB11. 학습자 언어 — 라틴이 아닌 글자가 섞여도 l1_to_ko, 설명 언어는 l1 그대로", async () => {
  for (const text of [
    "저는 コーヒー 좋아해요",
    "저는 กาแฟ 좋아해요",
    "저는 ကော်ဖီ 좋아해요",
    "저는 cà phê 좋아해요",
  ]) {
    expect(await feedback(text), text).toMatchObject({
      kind: "l1_to_ko",
      corrected: "저는 좋아해요",
    });
  }
  for (const l1 of ["vi", "id", "ja", "es", "my", "th", "tl"]) {
    expect(feedbackSystem(request({ l1 }))).toContain(`BCP 47 tag "${l1}"`);
  }
});
