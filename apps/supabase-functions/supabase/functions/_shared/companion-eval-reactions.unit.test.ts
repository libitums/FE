import { expect, test } from "vitest";

import type { CompanionLlm } from "./chat-send.contract.ts";
import { capSpeechLevel, evalReply } from "./companion-eval-reply.ts";
import { bodySchema, caseSchema } from "./companion-eval-schema.ts";
import { storyReactionSets } from "./companion-eval-sets-reactions.ts";
import { companionEvalSets } from "./companion-eval-sets.ts";
import { fakeCompanionLlm } from "./companion-llm-fake.ts";

// 내 스토리 반응의 평가(ADR-0191 D5): 반응 케이스는 운영과 같은 반응 지시 · 앱 안내 글로 답을 만들고 같은 채점 노드가 본다.
const characters = new Set([
  "duksu",
  "yoonkyung",
  "mina",
  "doyun",
  "jaemin",
  "seoyeon",
  "haejun",
  "daeun",
  "geonwoo",
]);

test("ER1. 세트 모양 — 등록됨 · 답장 종류 · 한 번에 돌릴 수 있는 크기 · 케이스가 요청 모양에 맞고 id가 겹치지 않는다", () => {
  expect(storyReactionSets.map((set) => set.id)).toEqual([
    "story-reaction-words",
    "story-reaction-photos",
  ]);
  for (const set of storyReactionSets) {
    expect(companionEvalSets).toContain(set);
    expect(set.kind).toBe("reply");
    expect(bodySchema.safeParse({ kind: "reply", cases: set.cases }).success).toBe(true);
    expect(new Set(set.cases.map((item) => item.id)).size).toBe(set.cases.length);
    for (const item of set.cases) {
      expect(caseSchema.safeParse(item).success).toBe(true);
      expect(characters.has(item.characterId ?? "")).toBe(true);
      expect(item.storyReaction).toBeDefined();
      expect(item.spoilerNote).toContain("처음 다는 반응");
    }
  }
  const [words, photos] = storyReactionSets;
  // 각도 넷을 모두 본다. 사진 세트는 장면 설명이 없는 경우 · 신분증 · 사람이 나온 사진을 담는다.
  expect(new Set(words!.cases.map((item) => item.storyReaction!.angle))).toEqual(
    new Set(["word", "question", "quiz", "together"]),
  );
  expect(photos!.cases.every((item) => item.storyReaction!.kind === "photo")).toBe(true);
  expect(photos!.cases.some((item) => item.storyReaction!.scene === null)).toBe(true);
  expect(photos!.cases.some((item) => item.storyReaction!.scene?.includes("ID card"))).toBe(true);
  expect(words!.cases.some((item) => item.ageBand === "minor")).toBe(true);
});

test("ER2. 반응 케이스 — 답은 반응 지시 · 앱 안내 글로 만들고, 채점자도 그 안내 글과 메모를 받는다", async () => {
  const replies: { system: string; userText: string }[] = [];
  const judged: { userText: string; spoilerNote: string | null }[] = [];
  const base = fakeCompanionLlm();
  const llm: CompanionLlm = {
    ...base,
    async *reply(request) {
      replies.push({ system: request.system, userText: request.userText });
      yield "@speech 야근 끝나면 라면 먹어요!\n";
    },
    async judgeReply(request) {
      judged.push({ userText: request.userText, spoilerNote: request.spoilerNote });
      return base.judgeReply!(request);
    },
  };
  const item = storyReactionSets[0]!.cases.find((entry) => entry.id === "RW2")!;
  const output = await evalReply({
    llm,
    judge: llm,
    item,
    personas: new Map(),
    signal: AbortSignal.timeout(2000),
    judgeErrorCode: () => "judge_failed",
  });
  expect(output.segments).toEqual([{ kind: "speech", text: "야근 끝나면 라면 먹어요!" }]);
  expect(replies[0]!.system).toContain('the Korean word "야근"');
  expect(replies[0]!.system).toContain('Do not write the word "야근" yourself');
  expect(replies[0]!.userText).toContain("앱 안내");
  expect(replies[0]!.userText).not.toContain("(스토리 반응)");
  expect(judged[0]!.userText).toBe(replies[0]!.userText);
  expect(judged[0]!.spoilerNote).toContain("퀴즈");
  expect(output.judge).not.toBeNull();

  // 사진 케이스는 장면 설명이 지시에 실린다. 보통 답장 케이스는 그대로 학습자의 말을 쓴다.
  const photo = storyReactionSets[1]!.cases.find((entry) => entry.id === "RP6")!;
  await evalReply({
    llm,
    judge: llm,
    item: photo,
    personas: new Map(),
    signal: AbortSignal.timeout(2000),
    judgeErrorCode: () => "judge_failed",
  });
  expect(replies[1]!.system).toContain(
    "What the photo shows: A photo of an ID card held in a hand.",
  );
  // 채점자도 인물이 받은 장면 설명을 본다 — 답을 만드는 쪽의 안내 글은 그대로다.
  expect(judged[1]!.userText).toContain(
    "(인물이 받은 사진 설명: A photo of an ID card held in a hand.)",
  );
  expect(replies[1]!.userText).not.toContain("사진 설명");
  await evalReply({
    llm,
    judge: llm,
    item: { text: "안녕하세요!" },
    personas: new Map(),
    signal: AbortSignal.timeout(2000),
    judgeErrorCode: () => "judge_failed",
  });
  expect(replies[2]!.userText).toBe("안녕하세요!");
  expect(replies[2]!.system).not.toContain("as their story today");
});

test("ER3. 퀴즈는 덕수쌤만 · 말투는 인물 상한까지(존댓말 고정 인물은 casual 케이스도 polite)", () => {
  const cases = storyReactionSets.flatMap((set) => set.cases);
  const quizzers = new Set(
    cases.filter((item) => item.storyReaction?.angle === "quiz").map((item) => item.characterId),
  );
  expect([...quizzers]).toEqual(["duksu"]);
  expect(capSpeechLevel("casual", "polite")).toBe("polite");
  expect(capSpeechLevel("slang", "casual")).toBe("casual");
  expect(capSpeechLevel("casual", "slang")).toBe("casual");
  expect(capSpeechLevel("slang", undefined)).toBe("slang");
});
