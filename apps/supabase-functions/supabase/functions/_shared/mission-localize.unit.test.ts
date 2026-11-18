import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

import type { ChatSendEnv, CompanionLlm } from "./chat-send.contract.ts";
import { fakeMissionLlm } from "./companion-llm-mission.ts";
import { parseMission } from "./mission-definition.ts";
import { localizeMission, type MissionTranslation } from "./mission-localize.ts";

// 진입 대사 · 목표 글의 학습자 언어 — 출처 순서(파일 → 캐시 → 번역 노드), 캐시 적중이면 호출 없음, 실패면 영어, en · ko · 번역 끔.

const cafe = parseMission(
  JSON.parse(
    readFileSync(fileURLToPath(new URL("./missions/u06-cafe.json", import.meta.url)), "utf8"),
  ),
);
const env: ChatSendEnv = {
  supabaseUrl: "https://ref.supabase.co",
  supabaseAnonKey: "a",
  supabaseServiceRoleKey: "s",
  llm: { kind: "fake" },
  translation: "every",
};

function counting(fail = false): { llm: CompanionLlm; calls: string[][] } {
  const calls: string[][] = [];
  const base = fakeMissionLlm();
  return {
    calls,
    llm: {
      ...base,
      translate: async (request) => {
        calls.push(request.segments.map((segment) => segment.text));
        if (fail) throw new Error("down");
        return base.translate(request);
      },
    },
  };
}
const run = (
  llm: CompanionLlm,
  l1: string | null,
  cached: MissionTranslation | null = null,
  mission = cafe,
  e = env,
) =>
  localizeMission({
    llm,
    env: e,
    mission,
    l1,
    cached,
    timeoutMs: 1000,
    signal: new AbortController().signal,
  });

test("LZ1. 영어 · 모름은 파일의 영어 글, 한국어 · 번역 끔은 번역 없음 — 호출 없음", async () => {
  const { llm, calls } = counting();
  expect(await run(llm, "en")).toMatchObject({
    openingTranslation: cafe.opening.en,
    source: "english",
  });
  expect(await run(llm, null)).toMatchObject({
    openingTranslation: cafe.opening.en,
    language: null,
  });
  expect(await run(llm, "ko")).toMatchObject({ openingTranslation: null, source: "none" });
  expect(await run(llm, "vi", null, cafe, { ...env, translation: "off" })).toMatchObject({
    openingTranslation: null,
    source: "none",
  });
  expect(calls).toEqual([]);
});

test("LZ2. 캐시가 없으면 번역 노드로 한 번에(진입 대사 + 목표 넷) 만들고 캐시할 것을 돌려준다", async () => {
  const { llm, calls } = counting();
  const result = await run(llm, "vi");
  expect(calls).toHaveLength(1);
  expect(calls[0]).toHaveLength(1 + cafe.goals.length);
  expect(result.source).toBe("generated");
  expect(result.openingTranslation).toBe(`[vi] ${cafe.opening.ko}`);
  expect(result.labels["order"]).toMatchObject({
    en: "Order a drink",
    vi: expect.stringMatching(/^\[vi\] /),
  });
  expect(result.created?.opening).toBe(result.openingTranslation);
  expect(Object.keys(result.created?.goals ?? {})).toEqual(cafe.goals.map((goal) => goal.id));
});

test("LZ3. 캐시 적중이면 호출 없이 캐시의 글", async () => {
  const { llm, calls } = counting();
  const cached = {
    opening: "Chào bạn",
    goals: Object.fromEntries(cafe.goals.map((g) => [g.id, `vi-${g.id}`])),
  };
  const result = await run(llm, "vi", cached);
  expect(calls).toEqual([]);
  expect(result).toMatchObject({ source: "cache", openingTranslation: "Chào bạn", created: null });
  expect(result.labels["pay"]).toMatchObject({ vi: "vi-pay" });
});

test("LZ4. 파일의 그 언어 칸이 먼저 — 빠진 것만 번역하고 캐시에는 파일 칸을 남기지 않는다", async () => {
  const withJa = parseMission({
    ...cafe,
    opening: { ...cafe.opening, ja: "いらっしゃいませ" },
    goals: cafe.goals.map((goal, index) =>
      index === 0 ? { ...goal, label: { ...goal.label, ja: "注文する" } } : goal,
    ),
  });
  const { llm, calls } = counting();
  const result = await run(llm, "ja", null, withJa);
  expect(calls).toEqual([cafe.goals.slice(1).map((goal) => goal.label.ko ?? goal.label.en)]);
  expect(result.openingTranslation).toBe("いらっしゃいませ");
  expect(result.labels["order"]).toMatchObject({ ja: "注文する" });
  expect(result.created).toMatchObject({ opening: null });
  expect(Object.keys(result.created?.goals ?? {})).not.toContain("order");
  const allFile = parseMission({
    ...withJa,
    goals: withJa.goals.map((goal) => ({ ...goal, label: { ...goal.label, ja: `ja-${goal.id}` } })),
  });
  expect((await run(counting().llm, "ja", null, allFile)).source).toBe("file");
});

test("LZ5. 번역이 실패하면 영어 글 · 캐시하지 않음(다음 시작 때 다시)", async () => {
  const { llm, calls } = counting(true);
  const result = await run(llm, "vi");
  expect(calls.length).toBeGreaterThanOrEqual(1);
  expect(result).toMatchObject({
    source: "fallback",
    openingTranslation: cafe.opening.en,
    created: null,
  });
  expect(result.labels["order"]).toEqual(cafe.goals[0]?.label);
});
