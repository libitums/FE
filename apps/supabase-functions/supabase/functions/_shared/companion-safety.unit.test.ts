import { expect, test } from "vitest";

import type { ModerationRequest } from "./chat-send.contract.ts";
import { fakeCompanionLlm } from "./companion-llm-fake.ts";
import { feedbackSystem } from "./companion-llm-prompts.ts";
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

// SF1 — 비속어 정책: 유저는 캐릭터를 겨냥한 심한 욕 · 혐오 · 성희롱 · 비하 · 위협만 막고 가벼운 놀림 · 혼잣말 욕은 통과,
// 캐릭터는 가벼운 욕도 막는다(모든 연령).
test("SF1. 검사 지시 — profanity 분류, 입력 · 출력 규칙, 가린 철자, *행동*", () => {
  expect(moderationCategories).toContain("profanity");
  for (const ageBand of ["adult", "minor", "unknown"] as const) {
    const input = moderationInstruction("input", ageBand);
    expect(input).toContain(
      "block only severe abuse aimed at the character — strong swear words or vulgar insults directed at them (e.g.",
    );
    expect(input).toContain("slurs, degrading or sexual harassment, or threats");
    expect(input).toContain('→ "block" with category "profanity"');
    expect(input).toContain(
      'Mild insults and playful teasing are fine (e.g. "바보", "멍청이", "you idiot", "dummy"',
    );
    expect(input).toContain('Casual swearing not aimed at anyone (e.g. "아 씨 시험 망했어"');
    expect(input).toContain("ㅅㅂ, 시1발, ㅂㅅ, f*ck");
    expect(input).toContain("Profanity, in any language");
    expect(input).toContain("Judge every language the same way");
    for (const example of [
      // 막는 심한 욕(언어마다)
      "너 병신이야",
      "씨발놈아",
      "개새끼야",
      "fuck you",
      "putang ina mo",
      "đụ má mày",
      "anjing lo",
      "死ね",
      "hijo de puta",
      "ไอ้สัตว์",
      // 통과하는 가벼운 놀림
      "bobo ka",
      "đồ ngốc",
      "dasar bodoh",
      "バカ",
      "tonto",
      "ไอ้บ้า",
      // 통과하는 혼잣말 욕
      "đm trễ rồi",
      "くそ、遅刻だ",
      "mierda, llego tarde",
    ])
      expect(input, example).toContain(example);
    expect(input).toContain('in any language (e.g. "죽고 싶어", "I want to die"');
    for (const example of [
      "tôi muốn chết",
      "aku ingin bunuh diri",
      "死にたい",
      "quiero morir",
      "อยากตาย",
      "သေချင်တယ်",
    ])
      expect(input, example).toContain(example);
    expect(input).not.toContain("Korean, English and Tagalog");
    expect(input).toContain("Text between asterisks (*…*)");
    const output = moderationInstruction("output_sync", ageBand);
    expect(output).toContain(
      'Any profanity in the reply, even mild or casual → "block" with category "profanity"',
    );
  }
});

test("SF2. 가짜 검사 — 심한 욕 · 겨냥한 욕은 차단, 가벼운 놀림 · 혼잣말 욕은 통과, 캐릭터 답의 욕 · 놀림은 차단", async () => {
  for (const text of [
    "너 병신이야",
    "ㅂ ㅅ 같아",
    "개새끼야",
    "씨발놈아",
    "너 ㅅㅂ 뭐야",
    "fuck you",
    "putang ina mo",
    "đụ má mày",
  ]) {
    expect(await check(text), text).toEqual({ category: "profanity", action: "block" });
  }
  for (const text of [
    "바보",
    "멍청이",
    "너 바보야",
    "you idiot",
    "dummy",
    "bobo ka",
    "tonto",
    "아 씨 시험 망했어",
    "ㅅㅂ 늦었다",
    "시1발 비 온다",
    "마리아 씨 안녕하세요",
  ]) {
    expect(await check(text), text).toEqual({ category: "safe", action: "allow" });
  }
  for (const text of ["아 씨, 진짜요?", "바보예요?"]) {
    expect(await check(text, "output_sync"), text).toEqual({
      category: "profanity",
      action: "block",
    });
  }
  // 별표 안도 검사한다.
  expect(await check("*사랑해* 안녕")).toMatchObject({ action: "block" });
});

test("SF5. 가짜 피드백 — 가벼운 놀림은 비속어로 고치지 않는다, 혼잣말 욕은 순화", async () => {
  const feedback = (text: string) =>
    fake.feedback({
      text,
      l1: "en",
      previous: null,
      history: [],
      speechLevel: "casual",
      character: null,
      signal: new AbortController().signal,
    });
  for (const text of ["바보야", "멍청이", "너 바보야"])
    expect(await feedback(text), text).toMatchObject({ status: "none" });
  expect(await feedback("아 씨 시험 망했어")).toMatchObject({ status: "ok", kind: "better" });
});

test("SF6. 피드백 지시 — 가벼운 놀림은 비속어가 아니다", () => {
  const system = feedbackSystem({
    text: "",
    l1: "en",
    previous: null,
    history: [],
    speechLevel: "casual",
    character: null,
    signal: new AbortController().signal,
  });
  expect(system).toContain("Mild teasing words such as 바보, 멍청이 or 바보야 are not 비속어");
  expect(system).toContain("is 비속어 (vulgar)");
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

test("SF4. 가짜 검사 — 여러 언어의 위기 · 심한 욕은 잡고 가벼운 놀림 · 혼잣말 욕은 통과", async () => {
  for (const text of [
    "tôi muốn chết",
    "aku ingin bunuh diri",
    "死にたい",
    "quiero morir",
    "อยากตาย",
    "သေချင်တယ်",
    "gusto ko nang mamatay",
  ]) {
    expect(await check(text), text).toEqual({ category: "self_harm", action: "crisis" });
  }
  for (const text of ["死ね", "hijo de puta", "ไอ้สัตว์", "đụ má mày", "putang ina mo"]) {
    expect(await check(text), text).toEqual({ category: "profanity", action: "block" });
  }
  for (const text of ["đồ ngốc", "dasar bodoh", "バカ", "tonto", "bobo"]) {
    expect(await check(text), text).toEqual({ category: "safe", action: "allow" });
  }
  for (const text of [
    "đ.m trễ rồi",
    "anjir telat",
    "くそ、遅刻だ",
    "mierda, llego tarde",
    "เหี้ย สายแล้ว",
  ]) {
    expect(await check(text), text).toEqual({ category: "safe", action: "allow" });
    expect(await check(text, "output_sync"), text).toEqual({
      category: "profanity",
      action: "block",
    });
  }
});
