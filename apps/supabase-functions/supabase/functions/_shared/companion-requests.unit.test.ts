import { expect, test } from "vitest";

import type { AgeBand, PersonaCard } from "./chat-send.contract.ts";
import type { SpeechLevel } from "./companion-contract/index.ts";
import { bodySchema } from "./companion-eval-schema.ts";
import { companionEvalSets } from "./companion-eval-sets.ts";
import { companionSystemPrompt, stateLine, warmthBand, warmthBands } from "./companion-prompt.ts";
import { moderationInstruction } from "./companion-safety.ts";

// 자주 오는 요청 · 친밀도 구간(ADR-0180).
const geonwoo: PersonaCard = { name: "강건우", kind: "friend", maxSpeechLevel: "slang" };
const duksu: PersonaCard = { name: "덕수쌤", romanceOff: true, maxSpeechLevel: "polite" };
const mina: PersonaCard = { name: "미나" };

const prompt = (
  persona: PersonaCard,
  ageBand: AgeBand,
  speechLevel: SpeechLevel,
  intimacy?: number,
) =>
  companionSystemPrompt({
    persona,
    speechLevel,
    ageBand,
    l1: "en",
    expressions: [],
    summary: null,
    feedbackMode: "separate",
    memories: [],
    directive: null,
    ...(intimacy === undefined ? {} : { intimacy }),
  });
const warmthOf = (...args: Parameters<typeof prompt>) =>
  prompt(...args)
    .dynamic.split("\n")
    .find((line) => line.startsWith("- Warmth"));

test("RQ1. 친밀도 구간 — 0 · 15 · 35 · 60에서 바뀌고, 숫자가 없으면 없다", () => {
  expect(warmthBands.map((band) => band.from)).toEqual([0, 15, 35, 60]);
  expect(warmthBand(undefined)).toBeNull();
  expect(warmthBand(0)).toBe(warmthBands[0].rule);
  expect(warmthBand(14)).toBe(warmthBands[0].rule);
  expect(warmthBand(15)).toBe(warmthBands[1].rule);
  expect(warmthBand(34)).toBe(warmthBands[1].rule);
  expect(warmthBand(35)).toBe(warmthBands[2].rule);
  expect(warmthBand(59)).toBe(warmthBands[2].rule);
  expect(warmthBand(60)).toBe(warmthBands[3].rule);
  expect(warmthBand(200)).toBe(warmthBands[3].rule);
  expect(warmthBands[0].rule).toContain("Never be cold");
});

test("RQ2. Warmth 줄 — 로맨스가 열린 선(hug 이상)의 로맨스 대상 인물만, 앞부분(캐시)은 친밀도와 상관없이 같다", () => {
  expect(warmthOf(geonwoo, "adult", "polite", 3)).toContain(warmthBands[0].rule);
  expect(warmthOf(geonwoo, "adult", "casual", 40)).toContain(warmthBands[2].rule);
  expect(warmthOf(mina, "adult", "polite", 20)).toContain(warmthBands[1].rule);
  // 성인이 아니면(선 none) · 로맨스 대상이 아니면 · 숫자가 없으면 줄이 없다.
  expect(warmthOf(geonwoo, "unknown", "casual", 40)).toBeUndefined();
  expect(warmthOf(geonwoo, "minor", "casual", 40)).toBeUndefined();
  expect(warmthOf(duksu, "adult", "polite", 40)).toBeUndefined();
  expect(warmthOf(geonwoo, "adult", "casual")).toBeUndefined();
  expect(prompt(geonwoo, "adult", "casual", 3).stable).toBe(
    prompt(geonwoo, "adult", "casual", 70).stable,
  );
  // 선 none은 연애 질문에 담백하게 답한다(거절하지 않는다).
  const none = prompt(geonwoo, "unknown", "polite", 40)
    .dynamic.split("\n")
    .find((line) => line.startsWith("- Romance:"))!;
  expect(none).toContain("asks about your love life");
  expect(none).toContain("without flirting");
});

test("RQ3. 자주 오는 요청 — AI 질문 · 다른 메신저 · 사진은 앞부분에 모든 인물이 같은 글로", () => {
  for (const persona of [geonwoo, duksu, mina]) {
    const { stable } = prompt(persona, "adult", "polite");
    expect(stable).toContain("# Common requests");
    expect(stable).toContain("that you are an AI — never deny it");
    expect(stable).toContain("want to be friends");
    expect(stable).toContain("do not bring up being an AI");
    expect(stable).toContain("Never give or make up a number");
    expect(stable).toContain("photo button above their keyboard");
    expect(stable).toContain("Later times, skip the button");
    expect(stable).toContain("Never offer or promise revealing or sexual photos");
  }
  expect(stateLine).toContain("-1 or -2 when they are rude");
});

test("RQ4. 검사 지시 — 자기소개 · 캐릭터에게 묻는 말은 통과, 실제 연락처를 내놓기만 차단, 연애 질문은 선 none에서도 통과", () => {
  for (const ageBand of ["adult", "minor", "unknown"] as const) {
    const input = moderationInstruction("input", ageBand);
    expect(input).toContain("block only when the learner shares an actual phone number");
    expect(input).toContain('"my name is Sindy Devina"');
    expect(input).toContain("whether they use WhatsApp or Instagram");
    expect(input).toContain("for their photo, selfie or a voice message");
    expect(input).not.toContain("requests or sharing of personal contact details");
  }
  expect(moderationInstruction("input", "unknown", "none")).toContain(
    "is a personal question, not romance",
  );
  expect(moderationInstruction("input", "adult", "hug")).not.toContain(
    "is a personal question, not romance",
  );
  const output = moderationInstruction("output_sync", "unknown", "none");
  expect(output).toContain("must never give a phone number");
  expect(output).toContain("mentioning a photo button in this app, is fine");
});

test("RQ5. 평가 세트 — 자주 오는 요청 세트가 스키마를 지나고, 답장 케이스가 친밀도를 싣는다", () => {
  const ids = companionEvalSets.map((set) => set.id);
  expect(ids).toContain("common-requests-moderation");
  expect(ids).toContain("common-requests-geonwoo");
  expect(ids).toContain("common-requests-duksu");
  const moderation = companionEvalSets.find((set) => set.id === "common-requests-moderation")!;
  expect(moderation.cases).toHaveLength(20);
  expect(bodySchema.safeParse({ kind: "moderation", cases: moderation.cases }).success).toBe(true);
  const geonwooSet = companionEvalSets.find((set) => set.id === "common-requests-geonwoo")!;
  expect(bodySchema.safeParse({ kind: "reply", cases: geonwooSet.cases }).success).toBe(true);
  expect(geonwooSet.cases.map((item) => item.intimacy).filter((value) => value !== undefined)).toEqual([
    3, 25, 45, 45,
  ]);
});
