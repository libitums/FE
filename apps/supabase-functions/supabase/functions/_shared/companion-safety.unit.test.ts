import { expect, test } from "vitest";

import type { ModerationRequest } from "./chat-send.contract.ts";
import { fakeCompanionLlm } from "./companion-llm-fake.ts";
import { companionSystemPrompt } from "./companion-prompt.ts";
import { moderationCategories, moderationInstruction } from "./companion-safety.ts";

const fake = fakeCompanionLlm();
const check = (text: string, layer: ModerationRequest["layer"] = "input") =>
  fake.moderate({
    layer,
    text,
    context: null,
    ageBand: "adult",
    signal: new AbortController().signal,
  });

// SF1 — 비속어 정책: 유저는 겨냥한 모욕 · 혐오 · 비하만 막고 혼잣말 욕은 통과, 캐릭터는 가벼운 욕도 막는다(모든 연령).
test("SF1. 검사 지시 — profanity 분류, 입력 · 출력 규칙, 가린 철자, *행동*", () => {
  expect(moderationCategories).toContain("profanity");
  for (const ageBand of ["adult", "minor", "unknown"] as const) {
    const input = moderationInstruction("input", ageBand);
    expect(input).toContain(
      'insults or harassment aimed at the character, slurs, or degrading abuse → "block" with category "profanity"',
    );
    expect(input).toContain('Casual swearing not aimed at anyone (e.g. "아 씨 시험 망했어"');
    expect(input).toContain("ㅅㅂ, 시1발, ㅂㅅ, f*ck");
    expect(input).toContain("Korean, English and Tagalog profanity");
    expect(input).toContain("Text between asterisks (*…*)");
    const output = moderationInstruction("output_sync", ageBand);
    expect(output).toContain(
      'Any profanity in the reply, even mild or casual → "block" with category "profanity"',
    );
  }
});

test("SF2. 가짜 검사 — 모욕 · 겨냥한 욕은 차단, 혼잣말 욕은 통과, 캐릭터 답의 욕은 차단", async () => {
  for (const text of [
    "너 병신이야",
    "ㅂ ㅅ 같아",
    "you idiot",
    "bobo ka",
    "너 ㅅㅂ 뭐야",
    "fuck you",
  ]) {
    expect(await check(text), text).toEqual({ category: "profanity", action: "block" });
  }
  for (const text of [
    "아 씨 시험 망했어",
    "ㅅㅂ 늦었다",
    "시1발 비 온다",
    "마리아 씨 안녕하세요",
  ]) {
    expect(await check(text), text).toEqual({ category: "safe", action: "allow" });
  }
  expect(await check("아 씨, 진짜요?", "output_sync")).toEqual({
    category: "profanity",
    action: "block",
  });
  // 별표 안도 검사한다.
  expect(await check("*사랑해* 안녕")).toMatchObject({ action: "block" });
});

test("SF3. 답 프롬프트 — 비속어 금지(가장 편한 말투도), *행동 · 속마음* 규칙", () => {
  const prompt = companionSystemPrompt({
    persona: { name: "미나" },
    speechLevel: "slang",
    ageBand: "adult",
    l1: "en",
    expressions: [],
    summary: null,
    feedbackMode: "separate",
    memories: [],
    directive: null,
  });
  const all = `${prompt.stable}\n${prompt.dynamic}`;
  expect(all).toContain("Never use profanity, swear words, slurs or insults");
  expect(all).toContain("friendly informal speech, never swearing");
  expect(all).toContain("between asterisks");
  expect(all).toContain("never repeat it back word for word as if you overheard it");
});
